import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { useModelStore } from '../store/modelStore';
import { ModelManifestCard } from '../components/Staging/ModelManifestCard';
import { LoadedModelManifest } from '../components/Staging/LoadedModelManifest';
import type { GlbManifest } from '../utils/glbValidator';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('ModelManifestCard Component', () => {
  let container: HTMLDivElement;
  let root: Root;

  const sampleManifest: GlbManifest = {
    generator: 'Khronos glTF Blender I/O v3.6.0',
    version: '2.0',
    extensionsUsed: ['KHR_materials_transmission', 'KHR_materials_ior'],
    extensionsRequired: [],
    materials: [
      {
        name: 'Vidrio_Templado',
        alphaMode: 'BLEND',
        doubleSided: true,
        transmissionFactor: 0.95,
        ior: 1.52,
        extensions: ['KHR_materials_transmission'],
        textures: [
          { slot: 'transmissionTexture', imageName: 'glass_roughness.png' }
        ]
      }
    ],
    textures: [
      {
        index: 0,
        name: 'glass_roughness',
        mimeType: 'image/png',
        byteLength: 1024 * 512, // 0.5 MB
        assignedSlots: ['transmissionTexture']
      }
    ],
    totalTexturesByteLength: 1024 * 512,
    animationsCount: 1,
    animationNames: ['Spin'],
    camerasCount: 2,
    lightsCount: 3
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    useModelStore.getState().resetModel();

    // Mock window.electronAPI
    (window as any).electronAPI = {
      readBinaryFile: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
      saveFileDialog: vi.fn().mockResolvedValue('/saved/path/texture.png'),
      writeBinaryFile: vi.fn().mockResolvedValue(true),
      openDirectoryDialog: vi.fn().mockResolvedValue('/target/textures')
    };
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  it('renders nothing when no model file is loaded', () => {
    act(() => {
      root.render(<ModelManifestCard />);
    });

    expect(container.innerHTML).toBe('');
  });

  it('renders analyzing message when modelFilePath is set but glbManifest is null', () => {
    act(() => {
      useModelStore.setState({
        modelFilePath: '/path/to/my_chair.glb',
        modelFileSize: 1024 * 1024 * 2.5,
        glbManifest: null
      });
      root.render(<ModelManifestCard />);
    });

    expect(container.textContent).toContain('my_chair.glb');
    expect(container.textContent).toContain('2.50 MB');
    expect(container.textContent).toContain('Analyzing file structure...');
  });

  it('renders manifest details including metadata, materials, textures, and counts', () => {
    act(() => {
      useModelStore.setState({
        modelFilePath: '/path/to/my_chair.glb',
        modelFileSize: 1024 * 1024 * 2.5,
        glbManifest: sampleManifest
      });
      root.render(<ModelManifestCard />);
    });

    // Header info
    expect(container.textContent).toContain('my_chair.glb');
    expect(container.textContent).toContain('2.50 MB');

    // glTF metadata
    expect(container.textContent).toContain('glTF Metadata & Extensions');
    expect(container.textContent).toContain('Khronos glTF Blender I/O v3.6.0');
    expect(container.textContent).toContain('KHR_materials_transmission, KHR_materials_ior');

    // Materials
    expect(container.textContent).toContain('Materials');
    expect(container.textContent).toContain('1 material');
    expect(container.textContent).toContain('Vidrio_Templado');
    expect(container.textContent).toContain('BLEND');
    expect(container.textContent).toContain('Double-sided: Yes');
    expect(container.textContent).toContain('Transmission: 0.95x (IOR 1.52)');

    // Textures
    expect(container.textContent).toContain('Embedded Textures');
    expect(container.textContent).toContain('glass_roughness');
    expect(container.textContent).toContain('PNG');
    expect(container.textContent).toContain('0.50 MB');

    // Other elements
    expect(container.textContent).toContain('Animations');
    expect(container.textContent).toContain('Cameras');
    expect(container.textContent).toContain('Lights');
  });

  it('supports LoadedModelManifest re-export seamlessly', () => {
    act(() => {
      useModelStore.setState({
        modelFilePath: '/path/to/reexport_model.glb',
        modelFileSize: 1024 * 1024,
        glbManifest: sampleManifest
      });
      root.render(<LoadedModelManifest />);
    });

    expect(container.textContent).toContain('reexport_model.glb');
    expect(container.textContent).toContain('1.00 MB');
    expect(container.textContent).toContain('Vidrio_Templado');
  });
});
