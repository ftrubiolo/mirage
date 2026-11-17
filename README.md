# Mirage 3D Workbench

<div align="center">

**A modern, lightweight desktop workbench for 3D model staging, PBR material authoring, and texture optimization.**

[![Electron](https://img.shields.io/badge/Electron-34-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-0.184-black?logo=threedotjs&logoColor=white)](https://threejs.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Zod](https://img.shields.io/badge/Zod-4-3E67B1?logo=zod&logoColor=white)](https://zod.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-5-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-MIT-amber.svg)](LICENSE)

</div>

---

## Overview

**Mirage** is a standalone desktop application tailored for 3D artists, technical artists, and web developers working with glTF 2.0 and real-time WebGL/WebGPU pipelines. It simplifies testing, fine-tuning, inspecting, and packaging PBR textures and 3D models before deploying them to web applications, e-commerce viewers, or interactive experiences.

---

## Features

### 🎮 Real-Time 3D Viewport
- **High-Fidelity Rendering**: Physically-based rendering powered by Three.js and React Three Fiber with studio HDR environment lighting and soft contact shadows.
- **HDR Environments**: Defaults to the bundled `city.hdr` served through the `local-asset://` protocol, with additional environment presets and custom HDR loading, plus adjustable key/fill/ambient lights, sun azimuth and elevation, contact shadows, and an engineering ground grid.
- **Dynamic 3D Dimensions & Gizmos**: Real-time architectural bounding-box dimension guides that track the camera with instant unit conversion (`m`, `cm`, `mm`, `in`), paired with interactive transform gizmos (translate, rotate, scale).
- **Viewport Status Bar & Modular Toolbars**: Bottom status bar displaying real-time vertex/triangle counts and projection/wireframe toggles, paired with modular, reorderable toolbar items (`ToolbarItems/`).
- **PBR Debug Channel Inspector**: Inspect isolated material passes with one click:
  - **Lit**: Final realistic PBR render.
  - **Albedo**: Unlit diffuse / base color.
  - **Normal**: Surface tangent space normal vectors.
  - **Roughness**: Grayscale roughness channel.
  - **Metalness**: Metallic / dielectric isolation.
  - **Ambient Occlusion (AO)**: Crevice shading and contact shadowing.
  - **Emissive**: Self-illumination maps.
  - **Wireframe**: Polygonal mesh topology.
- **Live Reload**: The active `.glb` is watched on disk; replacing it on disk refreshes the viewport without restarting the app.

### 🎨 Comprehensive PBR Material Studio
- **Multi-Material Mesh Support**: Inspect and fine-tune materials independently across multi-mesh models, with dedicated modular sub-sections (`SurfaceMapsSection`, `PbrMicroGeometrySection`, `AdvancedPbrSection`, `EmissiveSection`, `GeometryStudio`).
- **Model Manifest & Transform Controls**: Inspect geometry hierarchy, bounding dimensions, and per-mesh material slots with real-time model rotation, auto-grounding, and reset capabilities.
- **BaseColor & Colorway Manager**: Live slot for diffuse maps with support for multiple colorway swatches and instant variant switching.
- **Normal Mapping**: Interactive tangent-space normal slot with dynamic depth scaling and DirectX green channel (`Invert Y`) toggle.
- **Micro-Geometry Control (ORM)**:
  - **ORM Mode**: Single combined WebP texture packing `Red = AO`, `Green = Roughness`, `Blue = Metalness`.
  - **Separated Mode**: Individual slots for AO, Roughness, and Metalness maps.
  - Live fine-tuning sliders for roughness factor, metalness factor, and AO intensity.
- **Advanced Physical Material Maps (`MeshPhysicalMaterial`)**:
  - **Emissive**: Texture slot, real-time intensity multiplier (`0x - 10x`), and color picker.
  - **Clearcoat**: Varnish / lacquer topcoat factor and roughness controls.
  - **Sheen**: Velvet, cloth, and microfiber rim reflection with custom sheen tint.
  - **Transmission & IOR**: Optical refraction simulation for glass and acrylic plastics with Index of Refraction adjustments.
  - **Alpha / Opacity**: Cutout transparency masks for perforated surfaces, fabrics, and decals.
  - **Displacement**: Real-time vertex height displacement scaling.
- **Non-Destructive Binary Cache**: Toggle between applying only your active slot overrides or falling back to the textures embedded directly inside the `.glb` binary.

### ⚡ Built-in Texture & Thumbnail Pipeline
- **High-Performance In-Process Thumbnails**: Generates `.webp` texture and variant thumbnails asynchronously in the main process via `@janhapke/sharp-electron` on Node's libuv threadpool (3–5 ms latency), eliminating child process spawn overhead and avoiding Linux GLib symbol clashes.
- **In-Flight Request Deduplication & Concurrency Limiter**: Eliminates duplicate operations when multiple cards render identical textures, throttled to 4 concurrent background tasks.
- **Standardized OS Cache**: Thumbnails persist in standard OS cache paths (`$XDG_CACHE_HOME/mirage/thumbnails` on Linux, `%LOCALAPPDATA%\mirage\cache\thumbnails` on Windows, `~/Library/Caches/mirage/thumbnails` on macOS), registered in `accessPolicy` for immediate `local-asset://` streaming.
- **Multi-threaded Channel Packing**: Seamlessly merge individual AO, Roughness, and Metalness maps into a single production-ready `.webp` ORM texture using native `sharp` (libvips) in a worker process preferring the system Node runtime.
- **Normal & Roughness Utilities**: Flip normal-map green channel, invert roughness, and resize/convert any map to WebP at a target resolution and quality.
- **Canvas Fallback**: In-memory HTML5 Canvas packing fallback ensures reliability across all operating system environments.

### 📚 Technical Library (Catalogue)
- **Model Catalogue**: Every asset is a `LibraryEntry` with slug, model category, lifecycle status, description, dimensions, polygon count, and poster thumbnail — browsable as a card grid or a dense table.
- **Variants & Colorways**: Each entry holds multiple profiles/variants, each with its own map set, material settings, and poster. Variants can be created (blank or cloned from an existing profile), renamed, and deleted; colourways are the base-colour texture variants managed in the **PBR Maps** studio.
- **Technical Sheet**: The detail view pairs a resizable read-only technical sheet — poster, status/category chips, description, dimensions — with the profiles and variants catalogue beside it.
- **Auto-Save Bridge**: Edits in the workbench are debounced and written back to the active entry, with explicit "Save to Library" for new models.
- **Local Storage**: Entries live in the app data directory and can be revealed in the system file explorer.

### 🤖 AI Agent Studio
- **Chat That Drives the App**: The agent calls real application tools — set PBR parameters, toggle texture slots, change environment presets, switch debug channels, audit geometry, and apply material presets (`fabric`, `leather`, `wood`, `metal`, `plastic`, `glass`, `ceramic`) — each as an undoable command.
- **Approval Mode (HITL)**: Choose **Auto-apply** (changes land immediately, reversible with `Ctrl+Z`) or **Ask confirmation** (a diff card must be approved before anything changes). MCP tools go through the same gate.
- **Provider-Agnostic**: Any OpenAI-compatible endpoint works — OpenAI, OpenRouter, Google Gemini, DeepSeek, Groq, Mistral, xAI, Together, NVIDIA NIM, Anthropic via a compatible proxy, or a custom local server (Ollama, LM Studio). Connection testing and live model listing are built in.
- **Encrypted API-Key Vault**: Keys never live in the renderer; they are encrypted by Electron `safeStorage` and stored in the main process vault.
- **Sessions & Streaming**: Multiple named sessions with history, streamed responses with cancel, and per-session token/duration statistics.
- **Scene-Aware Context**: The active model, material state, and slot configuration are serialized into the prompt so the agent reasons about the real scene.

### 🔌 MCP Client Support
- **Bring Your Own Servers**: Declare MCP servers in `mcp_config.json` inside the Electron `userData` directory (stdio with `command`/`args`/`env`, or SSE with `url`/`headers`).
- **Tool Bridging**: Connected servers' tools are exposed to the agent namespaced as `serverId__toolName`, alongside the built-in tools.
- **Declared-Only Connections**: The renderer can only connect a server the user already wrote into `mcp_config.json`; arguments must match the declaration exactly.
- **Credential Hygiene**: STDIO servers receive only an allow-listed login-shell environment (PATH-class variables); anything else must be declared explicitly per server.

### 📦 Export Studio
- **High-Res Poster Capture**: Generate preview images and thumbnails at preset or square resolutions, with optional transparent background, saved as WebP or PNG.
- **Standalone GLB Export**: Bake geometry and textures into a single `.glb` for Three.js, Blender, or any glTF viewer.
- **USDZ Export**: Generate Apple AR Quick Look models for iPhone and iPad.
- **Web Export Package**: A single ZIP built with JSZip containing `geometry.glb` (clean 1:1 geometry), `maps/` (per-variant textures), `model-3d.json` (variant/material manifest), and `ar/` (per-variant baked GLB and USDZ models for mobile AR).

### 📐 Audits & Metrology
- **Performance Audit**: Triangle, vertex, mesh, material, and file-size thresholds with pass/warn/fail verdicts for web delivery.
- **Scale Checker**: Physical metrology of the loaded model (width × height × depth) with export unit scale selection (`m`, `cm`, `mm`, `in`).

### 🧭 Workbench Experience
- **Resizable Sidebar System**: Drag-to-resize, auto-collapse, double-click reset, persisted widths, and `Ctrl+B` to toggle the studio panel.
- **Swappable Themes & Hot-Reload**: Built-in themes (**Mirage Slate** default, **Basalt Crimson**, **Blueprint Cobalt**, **Amber Instrument**) plus custom or symlinked `*.json` themes in `~/.config/mirage/themes/` (supporting external generators like Omarchy or Pywal) with `dark` / `light` / `system` modes, synced 3D viewport palettes, and user-editable keybinds.
- **Inline Feedback**: Long-running jobs disable their trigger, show a spinner, and report the result in a persistent in-panel banner.
- **Unified Context Menu Engine**: Declarative, portal-rendered context menus with boundary collision detection, directional submenus, keyboard Escape handling, and clean outside-click dismissal across the 3D viewport and staging panels.

---

## Tech Stack

- **Runtime**: Electron 34+
- **Frontend**: React 19, TypeScript 5.7
- **3D Engine**: Three.js `0.184`, `@react-three/fiber`, `@react-three/drei`
- **State Management**: Zustand
- **Validation**: Zod 4 (every privileged IPC payload)
- **AI / Tooling**: OpenAI-compatible chat completions, `@modelcontextprotocol/sdk`
- **Image Processing**: Sharp (libvips) in an isolated worker, HTML5 Canvas fallback
- **Styling**: Tailwind CSS v4 via `@tailwindcss/vite`, Lucide Icons
- **Bundler**: electron-vite 5, Vite 6
- **Tests**: Vitest 5 with `happy-dom`

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) **20.19+** (Node **22.12+** recommended — Vitest 5 requires it)
- `npm` or `pnpm`
- On Linux, a running keyring (libsecret / gnome-keyring / kwallet) if you want API keys encrypted rather than merely obfuscated

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ftrubiolo/mirage.git
   cd mirage
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Run the app in development mode with live hot-reload:

```bash
npm run dev
```

### Quality Gates

```bash
# Type-check the whole project (no emit)
npm run typecheck        # tsc --noEmit

# Run the test suite
npm test                 # vitest run
```

Current state, verified on this checkout:

| Gate | Command | Result |
| :--- | :--- | :--- |
| Type check | `npx tsc --noEmit` | Clean (exit 0) |
| Tests | `npx vitest run` | **34 files, 615 tests, all passing** |

The suite covers the PBR controller, multi-material staging, model and variant stores, GLB validation, AR bake pipeline, thumbnail service and pipeline, theme normalization and symlinked theme discovery, path-safety utilities, colour conversion, settings persistence, the Web & AR package exporter, sidebar resize math, platform explorer integration, and the command manager — plus adversarial suites for graphics state and shortcut handling, and a design-system compliance suite that enforces [`DESIGN.md`](DESIGN.md).

### Production Builds

Typecheck and compile the Electron application:

```bash
npm run build
```

To build distributables (output in `dist/`):

```bash
# Package directory build (no installer)
npm run build:unpack

# Linux AppImage + tar.gz
npm run build:linux

# Windows zip + unpacked directory
npm run build:win

# Both Linux and Windows targets
npm run build:all
```

---

## Architecture Overview

```
mirage/
├── ARCHITECTURE.md           # Deep system map: processes, IPC, data flow
├── DESIGN.md                 # Mirage Operations design system (tokens, palette, components)
├── resources/
│   ├── branding/             # Source SVGs (logo-horizon.svg, metrology-triad.svg)
│   ├── draco/                # DRACO decoder/encoder for compressed glTF
│   ├── environments/         # Bundled HDR environment maps (city.hdr)
│   ├── omarchy/              # Omarchy theme template (mirage.json.tpl)
│   ├── pywal/                # Pywal theme template (mirage.json)
│   ├── scripts/              # sharpWorker.cjs — isolated libvips worker
│   ├── icon.png              # 512×512 app icon (rendered from logo-horizon.svg)
│   └── icon.svg              # Vector app icon (M Horizon)
├── src/
│   ├── shared/
│   │   └── themes.ts         # Shared theme schema, palette derivation, and built-in presets
│   ├── main/                 # Electron main process (all privileged work)
│   │   ├── accessPolicy.ts   # Approved filesystem roots, path containment, whitelist persistence
│   │   ├── fileWatcher.ts    # chokidar live-reload of the active .glb
│   │   ├── index.ts          # Window creation, CSP, lifecycle, single instance
│   │   ├── ipcHandlers.ts    # Dialogs, fs, library, vault, MCP, provider HTTP, thumbnails, themes
│   │   ├── ipcSchemas.ts     # Zod schemas for every privileged IPC payload
│   │   ├── platform.ts       # OS config, data & cache paths, Wayland flags, explorer integration
│   │   ├── protocol.ts       # local-asset:// streaming, root-confined
│   │   ├── settingsService.ts # Atomic settings.json persistence
│   │   ├── texturePacker.ts  # Spawns the sharp worker process (system node preference)
│   │   ├── themeService.ts   # ~/.config/mirage/themes/*.json seeding, symlink-aware hot-reload
│   │   ├── thumbnailService.ts # Native in-process sharp thumbnail engine, threadpool & caching
│   │   ├── vault.ts          # safeStorage-encrypted API-key vault
│   │   └── mcp/              # MCP client manager + scoped environment resolver
│   ├── preload/              # contextBridge API surface (window.electronAPI)
│   └── renderer/
│       ├── index.html        # Shell (Instrument Sans / JetBrains Mono)
│       └── src/
│           ├── views/        # Route views: Hub, Workbench, Library, EntryDetail, Settings, AgentStudio
│           ├── layouts/      # Application navigation chrome: TopNav and NavSidebar
│           ├── components/
│           │   ├── UI/       # 29 Design-system primitives: Button, Modal, MirageLogo, StatusBadge…
│           │   ├── Viewport/ # R3F canvas, camera, dimension lines, gizmos, ViewportStatusBar, ToolbarItems/
│           │   ├── Staging/  # Modular PBR studio (Geometry, SurfaceMaps, MicroGeometry, Advanced, Emissive), manifest cards
│           │   ├── Library/  # Catalogue: variants, modals, technical sheet
│           │   ├── Export/   # Export studio: poster, GLB/USDZ, ZIP, texture pipeline
│           │   ├── Agent/    # AI Agent Studio: chat, approvals, sessions, stats
│           │   ├── Audit/    # Performance audit + physical scale metrology
│           │   └── Settings/ # Appearance, viewport defaults, keybinds, storage, AI, system
│           ├── agent/        # LLM tool registry, provider registry, scene serializer
│           ├── hooks/        # useResizableSidebar (pure resize math + hook)
│           ├── store/        # Zustand: app, model, pbrMaterial, variant, viewport, agent
│           ├── styles/       # globals.css — the design token layer
│           ├── tests/        # Vitest suite (34 files, 615 tests)
│           ├── types/        # Config, library, and agent contracts
│           └── utils/        # PBR controller, viewport bridge, glbValidator, arBakePipeline, mapSlotNaming, command manager
├── package.json
└── electron.vite.config.ts
```

For the deep system map — process topology, IPC surface, security boundaries, and data flow — see [`ARCHITECTURE.md`](ARCHITECTURE.md). For the visual design system (tokens, palette, typography, component primitives), see [`DESIGN.md`](DESIGN.md).

---

## Security Model

- **The renderer is untrusted.** It parses hostile 3D/2D binaries and relays text produced by remote services, so every privileged action is validated and authorized in the main process.
- **`local-asset://` is confined to approved roots.** The custom protocol resolves real paths (following symlinks) and serves a file only if it lives inside a root the user granted through a native dialog or a drag-and-drop. Dropped files grant read-only access, never write.
- **Every privileged IPC payload is schema-validated with Zod** (`src/main/ipcSchemas.ts`) before it reaches the filesystem, a child process, or the network.
- **The renderer runs sandboxed** (`sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true`) behind a strict Content Security Policy applied in packaged builds, with in-page navigation and non-allow-listed external URLs blocked.
- **MCP servers can only be connected if the user declared them** in `mcp_config.json` — the renderer cannot introduce a new command line for the main process to spawn.
- **API keys are encrypted with Electron `safeStorage`** and stored 0600 in the main-process vault; if no OS keyring is available they are stored obfuscated, not encrypted, and the app warns.

---

## License

This project is licensed under the [MIT License](LICENSE).
