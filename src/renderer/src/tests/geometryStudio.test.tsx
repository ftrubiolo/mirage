import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { useModelStore } from '../store/modelStore';
import { GeometryStudio } from '../components/Staging/GeometryStudio';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('GeometryStudio Component', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    useModelStore.getState().resetModel();

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

  it('renders drop zone and scale prompt when no model is loaded', () => {
    act(() => {
      root.render(<GeometryStudio />);
    });

    // Model drop zone should be rendered
    expect(container.textContent).toContain('Drop a .glb model here');

    // ScaleChecker empty state should be rendered
    expect(container.textContent).toContain('Load a .glb model to inspect its real-world scale and physical dimensions.');
  });

  it('renders drop zone with replacement message, controls and checker when model is loaded', () => {
    act(() => {
      useModelStore.setState({
        modelFilePath: '/path/to/sample.glb',
        modelFileSize: 1024 * 1024 * 3,
        modelStats: {
          triangleCount: 500,
          vertexCount: 300,
          meshCount: 1,
          materials: ['DefaultMat'],
          dimensions: { width: 1.0, height: 1.5, depth: 0.8 }
        }
      });
      root.render(<GeometryStudio />);
    });

    // Dropzone indicates replacement
    expect(container.textContent).toContain('Replace .glb file');

    // ModelManifestCard shows filename
    expect(container.textContent).toContain('sample.glb');
    expect(container.textContent).toContain('3.00 MB');

    // ModelTransformControls shows orientation header
    expect(container.textContent).toContain('3D Orientation & Transform');

    // ScaleChecker shows dimensions
    expect(container.textContent).toContain('Width (X)');
    expect(container.textContent).toContain('Height (Y)');
    expect(container.textContent).toContain('Depth (Z)');
  });
});
