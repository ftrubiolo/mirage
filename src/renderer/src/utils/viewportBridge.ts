import * as THREE from 'three';
import JSZip from 'jszip';

interface ViewportBridge {
  gl: THREE.WebGLRenderer | null;
  scene: THREE.Scene | null;
  camera: THREE.Camera | null;
  modelGroup: THREE.Object3D | null;
  register: (gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) => void;
  registerModel: (model: THREE.Object3D | null) => void;
  unregister: () => void;
}

export const viewportBridge: ViewportBridge = {
  gl: null,
  scene: null,
  camera: null,
  modelGroup: null,
  register(gl, scene, camera) {
    this.gl = gl;
    this.scene = scene;
    this.camera = camera;
  },
  registerModel(model) {
    this.modelGroup = model;
  },
  unregister() {
    this.gl = null;
    this.scene = null;
    this.camera = null;
    this.modelGroup = null;
  }
};

export interface SnapshotOptions {
  width?: number;
  height?: number;
  transparent?: boolean;
  format?: 'webp' | 'png';
  quality?: number;
}

export async function captureViewportSnapshot(
  options: SnapshotOptions = {}
): Promise<{ blob: Blob; dataUrl: string; width: number; height: number }> {
  const { gl, scene, camera } = viewportBridge;
  if (!gl || !scene || !camera) {
    throw new Error('El visor 3D no está inicializado.');
  }

  const {
    width = 1024,
    height = 1024,
    transparent = true,
    format = 'webp',
    quality = 0.92
  } = options;

  // Save current renderer state
  const prevSize = new THREE.Vector2();
  gl.getSize(prevSize);
  const prevPixelRatio = gl.getPixelRatio();
  const prevBg = scene.background;
  const prevClearAlpha = gl.getClearAlpha();
  const prevClearColor = gl.getClearColor(new THREE.Color());

  try {
    if (transparent) {
      scene.background = null;
      gl.setClearColor(0x000000, 0);
    }

    // Render offscreen at requested high resolution
    const renderTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      generateMipmaps: false
    });

    gl.setRenderTarget(renderTarget);
    gl.clear();
    gl.render(scene, camera);

    const buffer = new Uint8Array(width * height * 4);
    gl.readRenderTargetPixels(renderTarget, 0, 0, width, height, buffer);
    gl.setRenderTarget(null);
    renderTarget.dispose();

    // Create 2D Canvas and flip Y
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo inicializar el contexto Canvas 2D');

    const imgData = ctx.createImageData(width, height);
    for (let y = 0; y < height; y++) {
      const srcY = height - 1 - y;
      for (let x = 0; x < width; x++) {
        const srcIdx = (srcY * width + x) * 4;
        const dstIdx = (y * width + x) * 4;
        imgData.data[dstIdx] = buffer[srcIdx];
        imgData.data[dstIdx + 1] = buffer[srcIdx + 1];
        imgData.data[dstIdx + 2] = buffer[srcIdx + 2];
        imgData.data[dstIdx + 3] = buffer[srcIdx + 3];
      }
    }
    ctx.putImageData(imgData, 0, 0);

    const mime = format === 'png' ? 'image/png' : 'image/webp';
    const dataUrl = canvas.toDataURL(mime, quality);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Error al generar imagen'));
        },
        mime,
        quality
      );
    });

    return { blob, dataUrl, width, height };
  } finally {
    scene.background = prevBg;
    gl.setClearColor(prevClearColor, prevClearAlpha);
    gl.setSize(prevSize.x, prevSize.y, false);
    gl.setPixelRatio(prevPixelRatio);
  }
}

export async function exportModelToGLB(): Promise<ArrayBuffer> {
  const targetObject = viewportBridge.modelGroup || viewportBridge.scene;
  if (!targetObject) {
    throw new Error('No hay ningún modelo 3D cargado para exportar.');
  }

  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
  const exporter = new GLTFExporter();

  return new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      targetObject,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(result);
        } else {
          const str = JSON.stringify(result);
          const buf = new TextEncoder().encode(str).buffer;
          resolve(buf);
        }
      },
      (error) => reject(error),
      {
        binary: true,
        embedImages: true,
        includeCustomExtensions: true
      }
    );
  });
}

export async function createWebPackageZip(params: {
  glbBuffer: ArrayBuffer;
  posterBlob: Blob;
  metadata: Record<string, any>;
}): Promise<Blob> {
  const zip = new JSZip();
  zip.file('model.glb', params.glbBuffer);
  zip.file('poster.webp', params.posterBlob);
  zip.file('metadata.json', JSON.stringify(params.metadata, null, 2));

  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
}
