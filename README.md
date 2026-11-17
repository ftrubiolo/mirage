# Mirage 3D Workbench

<div align="center">

<img src="resources/icon.svg" alt="Mirage Logo" width="56" height="56" />

**Standalone desktop workbench for 3D model staging, PBR material calibration, and glTF/AR packaging.**

[![Electron](https://img.shields.io/badge/Electron-34-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-0.184-black?logo=threedotjs&logoColor=white)](https://threejs.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-amber.svg)](LICENSE)

</div>

---

## Overview

**Mirage** is a desktop tool for technical artists and web developers working with glTF 2.0 and real-time WebGL/AR pipelines. It lets you inspect 3D models, tune multi-material PBR properties, pack textures, manage finish variants, and export production-ready assets.

---

## Features

- **Real-Time 3D Viewport**: Physically-based rendering (`Three.js` + `@react-three/fiber`) with HDRI lighting, ground grid, contact shadows, dynamic bounding-box dimensions (`m` / `cm` / `mm` / `in`), transform gizmos, `.glb` live reload, and isolated debug channels (Albedo, Normal, Roughness, Metalness, AO, Emissive, Wireframe).
- **PBR Material Studio**: Per-mesh material editing with `MeshPhysicalMaterial` support (clearcoat, sheen, transmission, IOR, emissive, alpha, displacement), colorway switching, ORM channel packing, normal Y-flip, and roughness inversion.
- **Asset Library & Export**: Local model catalogue with multi-variant profiles, performance/scale audits, transparent WebP/PNG poster capture, standalone `.glb` / `.usdz` baking, and bundled web/AR `.zip` packages.
- **Swappable Themes & Keybinds**: Ships with **Mirage Slate**, **Basalt Crimson**, **Blueprint Cobalt**, and **Amber Instrument** themes, plus hot-reloaded `*.json` themes and symlinks in `~/.config/mirage/themes/` (for external generators like Omarchy or Pywal), Light/Dark/System modes, and editable shortcuts.
- **AI Agent Studio & MCP *(Experimental)***: Chat-driven material/scene commands with encrypted API-key storage and declared-only MCP server support in `mcp_config.json`.

> [!CAUTION]
> **AI Agent Studio and MCP integration are unfinished.** Expect incomplete workflows, rough edges, and breaking changes across agent tools, approval cards, and MCP server handling.

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) **20.19+** (**22.12+** recommended)
- On Linux, an active keyring (`libsecret` / `gnome-keyring` / `kwallet`) for encrypted API-key storage

### Install & Run
```bash
git clone https://github.com/ftrubiolo/mirage.git
cd mirage
npm install
npm run dev
```

### Checks & Builds
```bash
npm run typecheck    # TypeScript check (tsc --noEmit)
npm test             # Vitest suite (34 files, 615 tests)
npm run build        # Compile main, preload, and renderer
npm run build:linux  # Linux AppImage + tar.gz
npm run build:win    # Windows zip + unpacked directory
```

---

## Documentation & Security

- **[`ARCHITECTURE.md`](ARCHITECTURE.md)** — Process topology, IPC surface, state stores, 3D pipeline, and thumbnail/texture worker internals.
- **[`DESIGN.md`](DESIGN.md)** — Design tokens, swappable theme spec, typography, UI primitives, and compliance rules.

**Security model in brief:** the renderer runs sandboxed (`contextIsolation: true`, `nodeIntegration: false`), every privileged IPC payload is validated with Zod in the main process, and `local-asset://` file access is confined to user-approved roots.

---

## License

MIT — see [LICENSE](LICENSE).
