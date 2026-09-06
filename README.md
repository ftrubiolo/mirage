# Mirage 3D Workbench

<div align="center">

**A modern, lightweight desktop workbench for 3D model staging, PBR material authoring, and texture optimization.**

[![Electron](https://img.shields.io/badge/Electron-34-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r174-black?logo=threedotjs&logoColor=white)](https://threejs.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v3-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-amber.svg)](LICENSE)

</div>

---

## Overview

**Mirage** is a standalone desktop application tailored for 3D artists, technical artists, and web developers working with glTF 2.0 and real-time WebGL/WebGPU pipelines. It simplifies testing, fine-tuning, inspecting, and packaging PBR textures and 3D models before deploying them to web applications, e-commerce viewers, or interactive experiences.

---

## Features

### 🎮 Real-Time 3D Viewport
- **High-Fidelity Rendering**: Physically-based rendering powered by Three.js and React Three Fiber with studio HDR environment lighting and soft contact shadows.
- **Dynamic 3D Dimensions**: Real-time architectural bounding-box dimension guides that track the camera with instant unit conversion (`m`, `cm`, `mm`, `in`).
- **PBR Debug Channel Inspector**: Inspect isolated material passes with one click:
  - **Lit**: Final realistic PBR render.
  - **Albedo**: Unlit diffuse / base color.
  - **Normal**: Surface tangent space normal vectors.
  - **Roughness**: Grayscale roughness channel.
  - **Metalness**: Metallic / dielectric isolation.
  - **Ambient Occlusion (AO)**: Crevice shading and contact shadowing.
  - **Emissive**: Self-illumination maps.
  - **Wireframe**: Polygonal mesh topology.

### 🎨 Comprehensive PBR Material Studio
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

### ⚡ Built-in Sharp Texture Packer
- **Multi-threaded Channel Packing**: Seamlessly merge individual AO, Roughness, and Metalness maps into a single production-ready `.webp` ORM texture using native `sharp` (libvips) in an isolated background thread.
- **Canvas Fallback**: In-memory HTML5 Canvas packing fallback ensures reliability across all operating system environments.

### 📦 Export Studio
- **High-Res Poster Capture**: Generate high-resolution preview images and thumbnails with optional transparent backgrounds.
- **ZIP Bundler**: Package optimized WebP texture sets, glTF models, and generated manifests with a single click.

---

## Tech Stack

- **Runtime**: Electron 34+
- **Frontend**: React 19, TypeScript
- **3D Engine**: Three.js, `@react-three/fiber`, `@react-three/drei`
- **State Management**: Zustand
- **Image Processing**: Sharp (libvips), HTML5 Canvas API
- **Styling**: Tailwind CSS, Lucide Icons
- **Bundler**: electron-vite, Vite 6

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- `npm` or `pnpm`

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

### Production Build

Typecheck and compile the Electron application:

```bash
npm run build
```

To build distributable installers:

```bash
# Package directory build
npm run build:unpack

# Linux AppImage & .deb
npm run build:linux
```

---

## Architecture Overview

```
mirage/
├── resources/
│   ├── environments/         # HDR environment maps (Studio / City)
│   └── scripts/              # Sharp background worker scripts
├── src/
│   ├── main/                 # Electron main process
│   │   ├── fileWatcher.ts    # Live file watching for active GLB models
│   │   ├── ipcHandlers.ts    # Native dialogs, file system, and window controls
│   │   ├── protocol.ts       # Secure custom protocol for asset streaming
│   │   └── texturePacker.ts  # Sharp libvips multi-thread packing logic
│   ├── preload/              # Secure context-bridge API
│   └── renderer/             # React 19 UI & Three.js Canvas
│       ├── components/
│       │   ├── Audit/        # Model geometry and scale checkers
│       │   ├── Export/       # Export studio, poster generator, ZIP bundlers
│       │   ├── Staging/      # PBR Maps studio, ORM modal, file dropzone
│       │   ├── UI/           # Reusable UI components (Switch, Checkbox, Inputs)
│       │   └── Viewport/     # Three.js 3D viewport, toolbar, dimension lines
│       ├── store/            # Reactive Zustand state stores
│       └── utils/            # PBR material controller, GLB validation
```

---

## License

This project is licensed under the [MIT License](LICENSE).
