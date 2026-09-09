# Mirage 3D Workbench — Test Infrastructure (TEST_INFRA.md)

## 1. Overview & Architecture

The Mirage 3D Workbench automated testing harness is powered by **Vitest** paired with **happy-dom**, providing high-performance headless execution of browser-specific and Three.js logic alongside Node.js filesystem persistence routines.

- **Test Runner**: Vitest `v5.0.0`
- **DOM Simulation Environment**: `happy-dom` `v20.14.0`
- **Configuration File**: `/home/rei/Work/mirage-sera/vitest.config.ts`
- **Package Scripts**:
  - `npm test` -> `vitest run` (single execution run)
  - `npm run test:watch` -> `vitest` (interactive file watcher)

### Path Alias Resolution
The Vitest configuration mirrors the project's `electron.vite.config.ts` and `tsconfig.json` mappings:
- `@renderer` -> `<rootDir>/src/renderer/src`

---

## 2. Directory Layout

All automated unit and subsystem tests reside under `src/renderer/src/tests/`:

```
src/renderer/src/tests/
├── glbValidator.test.ts          # Tier 1: Geometry metrology, triangle counting & scale audits
├── pathUtils.test.ts             # Tier 1: Protocol path parsing, normalization & sandbox safety
├── colorUtils.test.ts            # Tier 1: Hex/RGB/HSV conversions & range boundary clamping
├── commandManager.test.ts        # Tier 2: Transaction patterns, undo/redo & shortcut isolation
├── settingsService.test.ts       # Tier 2: Serialized write queue, atomic rename & deep merge
├── useResizableSidebar.test.ts   # Tier 3: Layout physics, clamping, auto-collapse & React hook
└── pbrController.test.ts         # Tier 4: Dynamic uniform gating vs texture recompile triggers
```

---

## 3. Test Tiers & Architectural Scope

### Tier 1: Metrology & Utility Suites
- **`glbValidator.test.ts`**: Validates Three.js scene hierarchy traversals, calculating polygon counts on both indexed (`geom.index`) and non-indexed (`geom.attributes.position`) geometry, vertex counts, multi-mesh bounding boxes, and scale audit heuristics (flagging millimeter, centimeter, and optimal meter ranges).
- **`pathUtils.test.ts`**: Tests cross-platform POSIX and Windows backslash normalization, multi-slash collapse with protocol prefix preservation (`mirage://`, `local-asset://`), file/extension extraction, directory containment (`isPathInside`), and safe sandbox path resolution against directory traversal attacks.
- **`colorUtils.test.ts`**: Tests exact hex validation, shorthand 3-digit expansion, bidirectional conversions between Hex, RGB, and HSV models, and out-of-range value clamping.

### Tier 2: State, Persistence & Transaction Managers
- **`commandManager.test.ts`**: Tests the command pattern implementation, including atomic single-command execution, composite `TransactionCommand` execution and reversal, history depth bounds, listener subscriptions, and input target shortcut suppression (`isInteractiveTextInput`) guarding inputs/textareas/contentEditable.
- **`settingsService.test.ts`**: Verifies the main process settings architecture, testing deep partial merges, serialized write queue concurrency preventing file corruption, and atomic write-to-temp-and-rename mechanics (`settings.json.tmp` -> `settings.json`).

### Tier 3: UI Physics & Layout Hooks
- **`useResizableSidebar.test.ts`**: Validates dragging physics for left and right sidebars, clamping within min/max bounds, dynamic maxWidth callbacks, collapsible threshold triggers (`minWidth - collapseThreshold`), uncollapse recovery, and React 19 hook lifecycle with `localStorage` synchronization.

### Tier 4: Graphics & Viewport Subsystem
- **`pbrController.test.ts`**: Validates the decoupling of dynamic uniform updates from shader recompilation. Ensures `applyPbrUniforms` modifies material values (roughness, metalness, aoMapIntensity, normalScale, clearcoat, etc.) without triggering `needsUpdate = true` or incrementing `mat.version`, while `applyPbrTextures` sets `needsUpdate = true` strictly on structural changes (slot assignments, removals, color space, or debug channels).

### Tier 5: Adversarial & End-to-End Hardening (Planned for M5)
- Automated stress tests, race condition load tests, and white-box branch coverage verification.

---

## 4. Verification Workflow

To run tests and verify zero regressions:

```bash
# 1. Run full test suite
npm test

# 2. Run TypeScript typecheck (must produce 0 errors)
npm run typecheck

# 3. Build production bundles
npm run build
```
