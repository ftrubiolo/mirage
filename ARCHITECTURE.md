# Mirage — Architecture

> **Scope:** the system as it is actually built. Every claim below was verified against the source at the time of writing; file paths are relative to the repository root.
>
> **Companions:** [`DESIGN.md`](DESIGN.md) for the visual design system, [`README.md`](README.md) for setup and features.

---

## 1. What the application is

Mirage is a standalone desktop workbench for **3D model staging, PBR material authoring, and texture packaging** for glTF 2.0 / real-time WebGL pipelines. It is an Electron application: a Chromium renderer hosts a React 19 + `@react-three/fiber` viewport, and a Node main process owns everything that touches the operating system.

The defining architectural constraint is that **the renderer parses untrusted binary assets** (`.glb`, `.gltf`, `.hdr`, `.webp`) and **relays text produced by remote services** (LLM providers, MCP servers). It is therefore treated as an untrusted caller by the main process, even though both run on the same machine.

---

## 2. Process topology

```
┌───────────────────────────────────────────────────────────────────────────┐
│ MAIN PROCESS  (Node, full privileges)                          ~3.1k LOC  │
│                                                                           │
│  index.ts            window lifecycle · CSP · single-instance lock ·      │
│                      openExternal allowlist · graceful teardown           │
│  accessPolicy.ts     ⭐ filesystem trust boundary (approved roots)         │
│  ipcSchemas.ts       ⭐ zod schemas for every privileged IPC payload       │
│  ipcHandlers.ts      49 ipcMain handlers: containment + validation       │
│  protocol.ts         local-asset:// streaming, root-confined              │
│  settingsService.ts  atomic settings (mutex + tmp/rename + debounce)      │
│  themeService.ts     ~/.config/mirage/themes/*.json + symlink hot-reload  │
│  vault.ts            API keys via safeStorage, atomic, corruption-safe    │
│  thumbnailService.ts ⭐ in-process native sharp thumbnail engine & cache   │
│  texturePacker.ts    sharp/libvips worker (system node preference)        │
│  fileWatcher.ts      chokidar live-reload for the active model            │
│  platform.ts         XDG config/data/cache paths, OS detection, explorer  │
│  mcp/                MCP client manager + scoped environment resolver     │
└───────────────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │ contextBridge (sandboxed, no Node)
                                    │ 51 typed methods · no business logic
                                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ PRELOAD                                                     ~200 LOC      │
│  index.ts   window.electronAPI — 51 typed methods, flat 1:1 forwarders     │
└───────────────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │  window.electronAPI
                                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ RENDERER  (Chromium, sandboxed, CSP in production)            ~27k LOC    │
│                                                                           │
│  views/      6 files · top-level route views (Hub, Workbench, Library, …) │
│  layouts/    2 files · application navigation chrome (TopNav, NavSidebar) │
│  store/      8 files · one Zustand store per domain + orchestration       │
│  utils/     15 files · pbrController, viewportBridge, glbValidator, …     │
│  agent/      3 files · tool registry, provider registry, scene serializer │
│  components/ 70+ files · domain components (Viewport, Staging, Export, …) │
│  components/UI/ 29 primitives · design-system UI (Button, MirageLogo, …)  │
│  tests/     34 files · 615 tests (vitest + happy-dom)                     │
└───────────────────────────────────────────────────────────────────────────┘
```

`src/main` and `src/renderer` remain process-isolated, sharing only pure, dependency-free theme types and palette derivation in `src/shared/themes.ts`. All OS/IPC access crosses the `ElectronAPI` contract in `src/preload/index.ts`.

---

## 3. The trust boundary

This is the most important part of the architecture to understand before changing anything.

### 3.1 The rule

> Anything arriving over IPC is untrusted input. It is validated for *shape* by zod and for *reach* by the access policy. Renderer-side types and guards are conveniences, not controls.

### 3.2 Filesystem access policy — `src/main/accessPolicy.ts`

The main process holds an explicit set of **approved roots**, each with a scope:

| Scope | Meaning | Granted by |
| --- | --- | --- |
| `read` | may be read | open dialog, dropped asset, restored from a previous session, app resources |
| `readwrite` | may be read and written | app data dir, app cache dir, temp dir, **save** dialog |

Roots are seeded at startup with the application's own data directory, the OS cache directory (`~/.cache/mirage` on Linux, `%LOCALAPPDATA%\mirage\cache` on Windows), `os.tmpdir()/mirage`, and the bundled `resources/` (read-only). Everything else requires a **user gesture**:

- `dialog:openFile` / `dialog:openDirectory` grant `read` on the chosen location.
- `dialog:saveFile` grants `readwrite` on the chosen file's folder.
- `fs:approveDroppedPath` grants `read` on a dropped file's folder — **only** if the file exists and its extension is in the asset allowlist (`glb`, `gltf`, `bin`, `webp`, `hdr`, `exr`, `ktx2`, …). Drag-and-drop can never yield a write grant.

Because assets are copied into the library on drop/save (see §5.4), reopening a saved entry only ever reads from the app data dir, so confinement does not break previously saved work.

Enforcement points:

| Primitive | Enforced by |
| --- | --- |
| `local-asset://` | `protocol.ts` → `canRead()`, returns **403** otherwise |
| `fs:readBinaryFile`, `fs:getFileInfo`, `watcher:watch`, `thumbnail:get` | `assertReadable()` |
| `fs:writeFile`, `fs:writeBinaryFile`, `texture:*` outputs | `assertWritable()` |
| `library:*` | `assertSafeSlug()` + `safeJoin()` |
| `shell:openPath` | `assertReadable()` |

Three details matter:

- **Symlinks are resolved.** `resolveReal()` calls `fs.realpath`, falling back to resolving the deepest existing ancestor, so a symlink inside an approved root cannot be used to escape it.
- **Containment is not a string prefix test.** `isInside()` uses `path.relative`, so `/data/models-evil` is not treated as a child of `/data/models`.
- **Clean persistence & downgrading.** The policy persists user-approved directories to `<dataDir>/access.json`. Restored grants are always downgraded to `read` (a stale file can never widen write access). Internal roots (`app-data`, `app-cache`, `app-temp`, `app-resources`) and ephemeral AppImage mounts (`/tmp/.mount_*`) are excluded from disk persistence as they are dynamically registered afresh on every launch. Compounding `restored:` prefixes are cleanly stripped via `cleanSourceTag()`, and any subsequent user gesture on a restored path promotes it back to an active gesture tag.

### 3.3 Known limitation

Approval for dropped files is necessarily renderer-triggered, because Electron exposes no main-side drop event. A compromised renderer can therefore *read* an asset-typed directory it names. It cannot gain write access this way. This is why the renderer also runs `sandbox: true` with a CSP in production: the sandbox is what makes renderer compromise hard, and the access policy is what limits the blast radius if it happens.

### 3.4 Payload validation — `src/main/ipcSchemas.ts`

Every privileged payload is parsed by a zod schema before use. Two rules are worth calling out:

- `SettingsPayloadSchema` rejects `__proto__` / `constructor` / `prototype` at any depth. `settingsService.deepMerge` refuses those keys as well, so prototype pollution is blocked in two places.
- `HttpUrlSchema` accepts only `http:` / `https:`, so the provider test/fetch helpers cannot be pointed at `file:` or `data:` handlers.

### 3.5 Renderer hardening

- `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`.
- A `Content-Security-Policy` is applied to responses in packaged builds (`default-src 'self'`, `object-src 'none'`, `frame-src 'none'`, `base-uri 'none'`). Dev mode is exempt because Vite's HMR client requires `eval`.
- `setWindowOpenHandler` and `will-navigate` are both gated; `shell.openExternal` accepts only `http:`, `https:` and `mailto:`.
- The `local-asset` scheme is registered **without** `bypassCSP`.

### 3.6 Secrets — `src/main/vault.ts`

API keys live in `<userData>/mirage_vault.enc` (with automatic one-time migration from legacy `sera_vault.enc`), encrypted with Electron's `safeStorage`, written atomically (`tmp` + `rename`, mode `0600`). Each entry is tagged with the scheme that produced it (`enc:v1:` / `plain:v1:`), so a value written while no OS keyring was available is still readable later, and vice versa. If the vault file is corrupt it is **moved aside** rather than treated as empty — treating it as empty would make the next write silently destroy every other stored secret.

> **Caveat:** when `safeStorage.isEncryptionAvailable()` is false (common on Linux without libsecret/gnome-keyring), the vault logs a warning and stores values **obfuscated, not encrypted**. There is no silent fallback.

### 3.7 MCP trust model

MCP servers are third-party executables. Three controls apply:

1. **Declared-only.** `mcp:connectServer` refuses any config whose `command`/`args` (or `url`) does not exactly match an entry the user wrote in `<userData>/mcp_config.json`. The renderer can ask for a server the user already trusts; it cannot introduce a new command line for the main process to spawn.
2. **Scoped environment.** Stdio servers receive only an allowlisted environment (`PATH`, `HOME`, `LANG`, `TMPDIR`, …). They do **not** inherit `SSH_AUTH_SOCK`, `AWS_*`, `GITHUB_TOKEN` or the rest of the login shell. Anything a server genuinely needs must be declared in its `env` block.
3. **Approval gate.** In `ask-to-confirm` mode, MCP tool calls are queued for approval exactly like built-in tools (see §6.3).

---

## 4. Renderer state architecture

### 4.1 One store per domain

| Store | Owns |
| --- | --- |
| `modelStore` | the loaded GLB: path, URL, byte size, geometry stats, unit scale/type, model rotation, auto-grounding, multi-material manifest |
| `pbrMaterialStore` | material parameters, multi-material states (`materialsState`), active material target, 12 texture map slots, slot enablement, ORM mode, debug channel, advanced PBR factors (clearcoat, transmission, sheen, IOR) |
| `variantStore` | finish variants, per-slot texture variant pools, which variant is active per slot |
| `viewportStore` | camera, lights, environment, grid/dimension toggles, transform gizmo (translate/rotate/scale), toolbar items customization and ordering, status bar toggles |
| `appStore` | current view, theme, library path, active entry, sidebar sizing, modal flags |
| `agentStore` | AI providers, chat sessions, streaming state, pending approvals |

`exportConfigGenerator.ts` is a pure function from the three workbench stores to the web-export descriptor.

### 4.2 Cross-store coordination — `store/workbenchActions.ts`

Where a single user action must move more than one store, that coordination lives in a plain module of exported functions rather than in a store:

```ts
setMaterialProperty(key, value)   // pbrMaterialStore + variantStore (record on the active variant)
setMapSlotForActiveVariant(...)   // pbrMaterialStore + variantStore
loadWorkbenchState(entry)         // hydrates all three
resetWorkbenchStores()            // resets all three
generateExportConfig()            // reads all three
```

**Why this shape:** a material edit must both change the live material *and* be recorded on the active variant so it survives a variant switch and a save. Putting that in either store would create a store→store dependency; putting it in the action layer keeps both stores independent and makes the coupling explicit and greppable.

#### Remaining store→store imports

These are the honest exceptions, all of them direct `import` edges between store modules:

| Edge | What it does | Assessment |
| --- | --- | --- |
| `variantStore` → `pbrMaterialStore` | `selectVariant` / `selectMapVariant` apply the chosen variant's maps and parameters to the live material | **Intentional.** "Switch to this variant" is inherently a variant-store operation whose *effect* is on the material. The alternative — routing every variant switch through an action — would scatter one coherent operation across two modules for no gain. |
| `appStore` → `viewportStore` | `initSettingsFromFile()` pushes the persisted `viewport` block into the viewport store | **Should move.** Hydrating several stores from one settings document is exactly what `workbenchActions` is for. A future `applyPersistedSettings()` action would remove this edge. |
| `agentStore` → `pbrMaterialStore` | Reads one parameter value to build the "before" column of an approval diff | **Acceptable**, read-only and one line, but an action-level helper would be tidier. |
| `exportConfigGenerator` → store modules | Imports only *types* (`ModelState`, `PbrMaterialState`, `VariantState`) | Fine — it is a pure function over store shapes, with no runtime coupling. |

There is **no** circular store dependency, and no store imports `components/`.

> **Historical note.** An earlier revision kept a `workbenchStore` that *mirrored* all three domain stores and synchronised them with subscriptions plus a monkey-patched `setState`. It was removed: it duplicated the entire state tree, re-notified four times per keystroke, and left the "single source of truth" question unanswered. If you find yourself wanting a combined store again, add a selector or an action here instead.

### 4.3 Derived state is never stored

`colorways` is a projection of the `baseColor` texture-variant pool:

```ts
export const selectColorways = (state) => deriveColorways(state.mapVariants.baseColor);
export const selectActiveColorwayId = (state) => state.activeVariantIds.baseColor ?? null;
```

It used to be stored and recomputed by hand at seven mutation sites, which meant any new site that forgot to recompute silently desynced the swatch list. Deriving on read makes that class of bug impossible.

**Rule:** if a value can be computed from state, compute it. Do not add a field that must be manually kept in sync.

### 4.4 Persistence

Four distinct mechanisms, deliberately chosen per data class:

| Data | Mechanism | Why |
| --- | --- | --- |
| App settings (theme, viewport, camera) | `settings:update` IPC → `SettingsService` | deep-merged **in main** under a write mutex, atomic `tmp`+`rename`, debounce 350 ms with a 1500 ms max-wait |
| User & linked themes | `~/.config/mirage/themes/*.json` via `themes:list` / `themes:changed` | seeded templates + symlink-aware `chokidar` watcher for live hot-swap |
| Keybinds | `keybinds.json` via IPC | small, user-authored, written whole |
| AI providers & chat sessions | `localStorage` | renderer-local, no secrets (keys live in the vault) |
| Library entries | `<dataDir>/library/<slug>/entry.json` + assets | the durable artifact; user-visible on disk |

**Use `updateSettings(partial)`, never `saveSettings(snapshot)`.** The latter existed only to work around the absence of the former, and it reintroduced a lost update: reading the whole document, spreading a slice onto it, and writing it back means a stale full document can overwrite a newer one written by the other caller in between. The main process merges partials under a mutex, so sending your own slice is both correct and race-free.

---

## 5. The 3D pipeline

### 5.1 Data flow

```
SliderControl (input event)
   └─> workbenchActions.setMaterialProperty(key, value)
         ├─> pbrMaterialStore            (state)
         └─> variantStore                (records value on the active variant)
               └─> React re-render
                     └─> PBRModelViewer effect
                           └─> pbrController.applyPbrUniforms(model, uniforms)
                                 └─> direct mutation of THREE.MeshPhysicalMaterial
                                       └─> consumed by the next gl.render()
```

**Ownership is split deliberately:** React owns the scene-graph *structure*; `pbrController` owns material *state* by mutating three.js objects outside React. That is the right call for a 60 Hz slider, but it means the controller is the only place that knows how a store value becomes a GPU value — keep it that way rather than duplicating material logic in components.

### 5.2 The `needsUpdate` rule

three.js recompiles a shader program when `material.version !== materialProperties.__version` (i.e. `needsUpdate = true`) or when one of a fixed list of structural flags changes. Facility **factors** (`clearcoat`, `sheen`, `transmission`) are *not* on that list — their shader chunks are only compiled in when the factor is above zero at program-build time.

Therefore:

- Assigning `roughness`, `metalness`, `aoMapIntensity`, `normalScale`, `ior` and similar **uniform-only** values must **not** set `needsUpdate`. Doing so recompiles per slider tick.
- Crossing a facility factor **0 ↔ >0** **must** set `needsUpdate`, or the slider has no visible effect at all.

`applyPbrUniforms` implements this with a per-material `structuralChange` flag raised only on those crossings. `tests/pbrController.test.ts` and `tests/graphicsStateAdversarial.test.ts` pin both halves of the rule (including a benchmark that 1000 uniform updates cause zero recompiles).

### 5.3 One WebGL context

There is exactly **one** `<Canvas>` in the application, in `components/Viewport/Canvas3D.tsx`; a test walks the renderer source and fails if a second appears.

The Agent Studio's preview panel does **not** mount a second context. `components/Viewport/EmbeddedViewport.tsx` renders a plain 2D `<canvas>` and fills it by copying the shared renderer's output via `viewportBridge.renderPreview()`. `preserveDrawingBuffer: true` makes that copy reliable.

The main canvas stays mounted while other views are shown (so camera and material state survive navigation) but its render loop is gated: `frameloop={currentView === 'workbench' ? 'always' : 'never'}`.

### 5.4 Asset lifecycle

- **On drop**, textures are copied into the entry folder; **on save**, the model is copied if it is not already there. This is why persisted entries only reference the app data dir.
- **On model swap**, `PBRModelViewer` disposes the previous scene's geometry and materials and then calls `clearTextureCache()`. Textures injected from the PBR library live in a module-level cache and are shared between materials, so disposing a material does **not** free them.
- Texture cache keys include a `?v=<timestamp>` cache-buster, so re-dropping a file creates a new entry rather than reusing a stale one. `invalidateTexture(url)` disposes entries matching the query-stripped URL.
- A lost WebGL context is handled: `webglcontextlost` calls `preventDefault()` (without it the context is never restorable) and shows a recovery panel; `webglcontextrestored` clears it.

### 5.5 Texture & thumbnail processing

Mirage separates texture processing into distinct engines tailored for specific throughput, concurrency, and platform requirements:

1. **High-Performance In-Process Thumbnails (`main/thumbnailService.ts`)**:
   - Generates `.webp` thumbnails asynchronously in the main process using `@janhapke/sharp-electron` executed on Node's background libuv threadpool (~3–5 ms latency, 0 child-process spawn overhead).
   - Standard `@img/sharp-libvips` collides with Electron's dynamically linked host `glib-2.0` on Linux, triggering fatal GObject assertions; `@janhapke/sharp-electron` bundles a patched build that resolves this symbol clash.
   - Enforces a concurrency limiter (max 4 concurrent tasks) to avoid CPU starvation.
   - Employs both main-process and renderer-process (`ThumbnailImage.tsx`) in-flight request deduplication maps to prevent duplicate work across identical textures.
   - Standardizes on OS cache conventions (`getThumbnailsCacheDir()`: `~/.cache/mirage/thumbnails` on Linux, `%LOCALAPPDATA%\mirage\cache\thumbnails` on Windows) and registers the cache in `accessPolicy` for immediate `local-asset://` streaming.

2. **Multi-Threaded Channel Packing (`main/texturePacker.ts`)**:
   - Executes heavy ORM packing (`sharpWorker.cjs`) in a child process.
   - Detects and prefers the host system's clean `node` binary (`getNodeExecutable()`), falling back to `process.execPath` with `ELECTRON_RUN_AS_NODE=1` only when standalone Node is absent.
   - Reports success only if a non-empty output file is produced; unparseable worker responses are verified directly against the filesystem.

3. **In-Renderer Canvas Engine (`utils/canvasOrmPacker.ts`)**:
   - Hardware-accelerated HTML5 Canvas packing inside the renderer with 0 native dependencies, serving as a reliable fallback.

---

## 6. The AI agent subsystem

### 6.1 Shape

`agentStore.sendMessage` owns the whole loop: build the prompt, call the provider, parse the SSE stream, dispatch tool calls, record results, persist the session. `agent/toolRegistry.ts` declares the tools; `agent/sceneSerializer.ts` renders the current scene into the prompt; `agent/providerRegistry.ts` is a pure data table of provider definitions.

### 6.2 Providers

The provider layer is an **OpenAI-compatible shim**, not a per-vendor abstraction: one `POST {baseUrl}/chat/completions` with `stream: true`. Provider-specific quirks are handled inline. Anthropic is listed as a provider but requires an OpenAI-compatible proxy; its entry says so in `helpText`.

### 6.3 The approval gate

`permissionMode` has two values:

| Mode | Behaviour |
| --- | --- |
| `auto-apply` | tool calls execute immediately (built-in calls are grouped into one undoable transaction) |
| `ask-to-confirm` | tool calls are queued as pending actions; nothing executes until approved |

The gate covers **both** built-in and MCP tools. MCP tools are the ones that can touch the outside world, so they are precisely the ones that must not bypass it.

`pendingActions` is intentionally **not** persisted, but the message copies of those actions are. On startup `init()` therefore marks any restored `pending` action as rejected — otherwise the UI would offer an Approve button for an action the store no longer holds, and `applyProposedAction` would silently no-op. Pending actions are also cleared on session switch, because tool-call ids are only unique within a run.

### 6.4 Cancellation and failure

- An `AbortController` per request; `cancelStreaming()` aborts it. The composer shows a stop button while streaming, and `Esc` is a panic stop.
- SSE frames are **buffered across chunk boundaries**. Frames are not aligned to reads, so splitting on `\n` per chunk drops any frame that straddles two reads.
- On failure the partial answer is **preserved** and the error is appended. The most common failure mode is a mid-stream 429 or connection reset, and replacing the accumulated content with an error string discards the only useful output.

### 6.5 Built-in tools

All six are scoped to scene appearance and are undoable via the command manager:

| Tool | Effect |
| --- | --- |
| `set_pbr_parameter` | one material parameter (validated against the real parameter set) |
| `toggle_pbr_slot` | enable/disable a texture slot |
| `set_environment_preset` | HDR environment / lighting |
| `set_debug_channel` | debug render pass |
| `audit_geometry` | polygon/vertex/mesh-count audit |
| `apply_material_preset` | a named material preset, applied as one undoable transaction |

There are **no** filesystem, shell or network tools. The agent surface is deliberately narrow.

---

## 7. Undo/redo

`utils/commandManager.ts` holds a command pattern (`Command`, `TransactionCommand`, three concrete commands) plus the global undo/redo keyboard handler. It is a singleton.

Rules for new mutations:

1. Implement `execute()` and `undo()`; capture the previous value in `execute()`, **not** in the constructor.
2. Multi-step actions go through `beginTransaction()` / `commitTransaction()`. Note that a transaction which records **no commands** commits as a no-op — calling store setters directly inside a transaction silently produces an action that reports success and cannot be undone. Record commands via `commandManager.execute(cmd)` between the two calls.
3. `SetPbrPropertyCommand` validates its property name against `Object.keys(defaultPbrParameters)` and **throws** on anything else. This replaced a string-concatenated setter lookup with a `setState({ [key]: value })` fallback, through which a model-supplied property name could write an arbitrary key into the store.

---

## 8. Error containment

Two levels:

- **Root** — `main.tsx` wraps `<App/>` in an `ErrorBoundary` with `isFatal`, so a throw that escapes everything still renders a recovery panel with *Retry* / *Restart application* rather than a blank window.
- **Per view** — every top-level view (Workbench, Hub, Library, Entry detail, Settings, Agent Studio) and both global modals have their own boundary, so a failure in one view does not take down the rest of the application.

A desktop application has no address bar to recover from, which is why the boundaries are not optional.

---

## 9. Layering rules

```
types/  ←  store/  ←  utils/  ←  components/UI/  ←  components/  ←  views/ & layouts/
                ↑        ↑
              agent/  ───┘
```

| Layer | May import | Must not import |
| --- | --- | --- |
| `types/` | nothing | anything |
| `store/` | `types/` | `components/`, `views/` |
| `utils/` | `types/`, `store/` | `components/`, `views/` |
| `agent/` | `types/`, `store/`, `utils/` | `components/`, `views/` |
| `components/UI/` | `types/` | domain components (`Viewport/`, `Staging/`, …), `views/` |
| `components/` | `types/`, `store/`, `utils/`, `components/UI/` | `views/` |
| `views/` & `layouts/` | everything (`components/`, `components/UI/`, `store/`, `utils/`, `types/`) | — |

Verified deviations, all pre-existing and all worth removing when the file is next touched:

- `utils/pbrController.ts` imports `invalidateThumbnail` from `components/UI/ThumbnailImage.tsx` — a component module used as an event bus.
- `App.tsx` imports `getSharedGltfLoader` from `components/Viewport/PBRModelViewer.tsx` — a module-level singleton living in a component file.

Everything else respects the table above: `grep -rn "from '.*components" src/renderer/src/{utils,agent,store}` returns the single `pbrController` line.

### 9.1 Standard UI Primitive System & Context Menu Engine

All visual presentation across the application is anchored in `src/renderer/src/components/UI/` (exported via `index.ts`), enforcing Mirage Operations Design System tokens (hairlines, 0–2px radii, tabular numbers):

- **19 Reusable Primitives:** `Button`, `IconButton`, `Card`, `PieceCard`, `TextInput`, `SearchInput`, `TextArea`, `FormField`, `SegmentedControl`, `Modal`, `ConfirmModal`, `Spinner`, `Badge`, `StatusBadge`, `AlertBanner`, `EmptyState`, `SectionHeader`, `Table`, and `ContextMenu`.
- **Standard ContextMenu Engine (`components/UI/ContextMenu.tsx`):**
  - Uses `createPortal(..., document.body)` so context menus and submenus escape parent containers and never suffer from `overflow-hidden` or stacking context clipping.
  - Automatically calculates viewport edge distances and flips submenus horizontally (left vs. right) or vertically if close to boundaries.
  - Centralizes global event coordination (`Escape` dismissal, outside `mousedown` detection, `contextmenu` default prevention).
  - Employs compound components (`ContextMenu`, `ContextMenuHeader`, `ContextMenuItem`, `ContextMenuSub`, `ContextMenuCheckbox`, `ContextMenuSeparator`, `ContextMenuCustom`) with contextual auto-dismissal on click.

Prefer named exports and narrow selectors:

```ts
// good — re-renders only when this field changes
const unitScale = useModelStore((s) => s.unitScale);

// avoid — re-renders on every unrelated store write
const { unitScale, modelUrl } = useModelStore();

// never — returns a fresh object every render and will loop under zustand v5
const { a, b } = useModelStore((s) => ({ a: s.a, b: s.b }));
```

---

## 10. Quality gates

```bash
npm run typecheck   # tsc --noEmit — must exit 0
npm test            # vitest run — 34 files, 615 tests
npm run build       # electron-vite build
```

The suite is behavioural, not structural: it drives real modules, real DOM elements and a real `THREE` scene graph. The one exception is `designSystemCompliance.test.ts`, which necessarily inspects source text to enforce the styling rules in `DESIGN.md`; it checks **rules over whatever files exist** and deliberately keeps no list of expected filenames — an earlier version asserted that specific component files existed, which meant deleting dead code broke the suite while a component that was never mounted passed it.

For rules a regex cannot judge (whether a `rounded-full` is a justified circle), that file uses a **ratchet**: the known count may not grow. Lowering it is an improvement; raising it fails.

Note that `vitest` runs with `happy-dom` project-wide, so main-process modules are tested via `vi.mock('electron', …)`. `accessPolicy.ts` and `thumbnailService.ts` now have comprehensive automated test suites (`tests/accessPolicy.test.ts`, `tests/thumbnailService.test.ts`, `tests/thumbnailPipeline.test.tsx`), while `protocol.ts`, `texturePacker.ts`, `fileWatcher.ts` and `vault.ts` are candidates for further end-to-end integration coverage.

---

## 11. Where to make a change

| I want to… | Touch |
| --- | --- |
| add a material parameter | `pbrMaterialStore` defaults → `PbrMapsStudio` UI → `pbrController` uniforms; add to the `needsUpdate` reasoning in §5.2 |
| add a privileged capability | `ipcSchemas.ts` (schema) → `accessPolicy.ts` (reach) → `ipcHandlers.ts` → `preload/index.ts`; document it in §3 |
| add an agent tool | `agent/toolRegistry.ts` only; validate arguments, and route mutations through `commandManager` so they are undoable |
| add persisted state | decide the class from §4.4 first; settings go through `updateSettings(partial)` |
| add a top-level view | `views/` + a `currentView` value in `appStore`; wrap it in an `ErrorBoundary` in `App.tsx` |
| add a reusable UI primitive | `components/UI/` + export from `components/UI/index.ts`; assert in `designSystemCompliance.test.ts` |
| add a context menu | compose declarative items with `<ContextMenu>` from `components/UI` |
| add a colour or surface token | `src/shared/themes.ts` + `styles/globals.css` (`:root` **and** `.dark`); never a `dark:bg-[#…]` override in a component |

---

## 12. Architectural invariants

Summarised, because each one is load-bearing and each was violated at least once:

1. The renderer is untrusted. Validate shape (zod) **and** reach (access policy) in main.
2. The renderer has no Node. `sandbox: true`, `contextIsolation: true`, CSP in production.
3. Exactly one WebGL context.
4. The main canvas's render loop is gated on the active view.
5. Uniform-only material changes never set `needsUpdate`; facility-factor zero-crossings always do.
6. One Zustand store per domain; cross-store coordination lives in `workbenchActions`.
7. Derived state is computed, never stored.
8. Partial settings updates only — never read-modify-write the settings document.
9. A transaction that records no commands is not a transaction.
10. Every top-level view is wrapped in an error boundary.
