import * as THREE from 'three';

interface ViewportBridge {
  gl: THREE.WebGLRenderer | null;
  scene: THREE.Scene | null;
  camera: THREE.Camera | null;
  modelGroup: THREE.Object3D | null;
  mixer: THREE.AnimationMixer | null;
  actions: THREE.AnimationAction[];
  activeAction: THREE.AnimationAction | null;
  activeClipIndex: number;
  onAnimationFinished: (() => void) | null;
  listeners: Set<() => void>;
  register: (gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) => void;
  registerModel: (model: THREE.Object3D | null) => void;
  registerAnimations: (mixer: THREE.AnimationMixer | null, clips: THREE.AnimationClip[]) => void;
  playAnimation: () => void;
  pauseAnimation: () => void;
  seekAnimation: (time: number) => void;
  setAnimationSpeed: (speed: number) => void;
  setAnimationLoop: (loop: boolean) => void;
  setActiveClip: (index: number) => void;
  getAnimationTime: () => number;
  getAnimationDuration: () => number;
  unregister: () => void;
  subscribe: (listener: () => void) => () => void;
  notify: () => void;
  isInitialized: () => boolean;
  renderPreview: (targetCanvas: HTMLCanvasElement) => boolean;
  orbit: (deltaX: number, deltaY: number) => void;
  resetCamera: () => void;
  zoom: (delta: number) => void;
}

export const viewportBridge: ViewportBridge = {
  gl: null,
  scene: null,
  camera: null,
  modelGroup: null,
  mixer: null,
  actions: [],
  activeAction: null,
  activeClipIndex: 0,
  onAnimationFinished: null,
  listeners: new Set(),
  register(gl, scene, camera) {
    this.gl = gl;
    this.scene = scene;
    this.camera = camera;
    this.notify();
  },
  registerModel(model) {
    this.modelGroup = model;
    this.notify();
  },
  registerAnimations(mixer, clips) {
    if (this.mixer && this.mixer !== mixer) {
      this.mixer.stopAllAction();
      try {
        const root = this.mixer.getRoot();
        if (root) this.mixer.uncacheRoot(root);
      } catch (e) {
        // ignore
      }
    }
    this.mixer = mixer;
    this.actions = [];
    this.activeAction = null;
    this.activeClipIndex = 0;

    if (mixer && clips.length > 0) {
      this.actions = clips.map((clip) => mixer.clipAction(clip));
      this.activeAction = this.actions[0];
      this.activeAction.play();

      mixer.addEventListener('finished', () => {
        if (this.onAnimationFinished) {
          this.onAnimationFinished();
        }
      });
    }
    this.notify();
  },
  playAnimation() {
    if (this.activeAction) {
      const duration = this.activeAction.getClip().duration || 0;
      if (this.activeAction.time >= duration - 0.005) {
        this.activeAction.reset();
      }
      this.activeAction.paused = false;
      this.activeAction.play();
    }
  },
  pauseAnimation() {
    if (this.activeAction) {
      this.activeAction.paused = true;
    }
  },
  seekAnimation(time) {
    if (this.activeAction && this.mixer) {
      const duration = this.activeAction.getClip().duration || 1;
      const clamped = Math.max(0, Math.min(time, duration));
      const wasPaused = this.activeAction.paused;
      this.activeAction.paused = false;
      this.mixer.setTime(clamped);
      this.activeAction.paused = wasPaused;
    }
  },
  setAnimationSpeed(speed) {
    if (this.mixer) {
      this.mixer.timeScale = speed;
    }
  },
  setAnimationLoop(loop) {
    if (this.activeAction) {
      this.activeAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 0);
      this.activeAction.clampWhenFinished = !loop;
    }
  },
  setActiveClip(index) {
    if (this.actions[index] && this.actions[index] !== this.activeAction) {
      const prev = this.activeAction;
      const next = this.actions[index];
      if (prev) {
        prev.fadeOut(0.2);
      }
      next.reset().fadeIn(0.2).play();
      this.activeAction = next;
      this.activeClipIndex = index;
    }
  },
  getAnimationTime() {
    return this.activeAction ? this.activeAction.time : 0;
  },
  getAnimationDuration() {
    return this.activeAction ? this.activeAction.getClip().duration : 0;
  },
  unregister() {
    if (this.mixer) {
      this.mixer.stopAllAction();
      try {
        const root = this.mixer.getRoot();
        if (root) this.mixer.uncacheRoot(root);
      } catch (e) {
        // ignore
      }
    }
    this.gl = null;
    this.scene = null;
    this.camera = null;
    this.modelGroup = null;
    this.mixer = null;
    this.actions = [];
    this.activeAction = null;
    this.activeClipIndex = 0;
    this.notify();
  },
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  },
  notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.warn('[viewportBridge] listener error:', err);
      }
    });
  },
  isInitialized() {
    return Boolean(this.gl && this.scene && this.camera);
  },
  renderPreview(targetCanvas: HTMLCanvasElement): boolean {
    if (!this.gl || !this.scene || !this.camera) {
      return false;
    }
    try {
      this.gl.render(this.scene, this.camera);
      const srcCanvas = this.gl.domElement;
      const ctx = targetCanvas.getContext('2d');
      if (!ctx) return false;

      const dpr = window.devicePixelRatio || 1;
      const width = targetCanvas.clientWidth || targetCanvas.width || 260;
      const height = targetCanvas.clientHeight || targetCanvas.height || 260;

      if (targetCanvas.width !== width * dpr || targetCanvas.height !== height * dpr) {
        targetCanvas.width = width * dpr;
        targetCanvas.height = height * dpr;
      }

      ctx.save();
      ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
      ctx.drawImage(srcCanvas, 0, 0, targetCanvas.width, targetCanvas.height);
      ctx.restore();
      return true;
    } catch (err) {
      console.warn('[viewportBridge] renderPreview error:', err);
      return false;
    }
  },
  orbit(deltaX: number, deltaY: number) {
    if (!this.camera) return;
    const target = new THREE.Vector3(0, 0.5, 0);
    if (this.modelGroup) {
      const box = new THREE.Box3().setFromObject(this.modelGroup);
      box.getCenter(target);
    }
    const offset = new THREE.Vector3().subVectors(this.camera.position, target);
    const radius = Math.max(offset.length(), 0.5);
    let theta = Math.atan2(offset.x, offset.z);
    let phi = Math.acos(Math.min(Math.max(offset.y / radius, -1), 1));

    theta += deltaX;
    phi = Math.max(0.05, Math.min(Math.PI / 2 + 0.05, phi + deltaY));

    offset.x = radius * Math.sin(phi) * Math.sin(theta);
    offset.y = radius * Math.cos(phi);
    offset.z = radius * Math.sin(phi) * Math.cos(theta);

    this.camera.position.copy(target).add(offset);
    this.camera.lookAt(target);
    this.camera.updateMatrixWorld();
    this.notify();
  },
  resetCamera() {
    if (!this.camera) return;
    const target = new THREE.Vector3(0, 0.5, 0);
    let fitDist = 2.5;
    if (this.modelGroup) {
      const box = new THREE.Box3().setFromObject(this.modelGroup);
      box.getCenter(target);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z, 0.2);
      fitDist = maxDim * 1.8;
    }
    this.camera.position.set(target.x, target.y + fitDist * 0.4, target.z + fitDist);
    this.camera.lookAt(target);
    this.camera.updateMatrixWorld();
    this.notify();
  },
  zoom(delta: number) {
    if (!this.camera) return;
    const target = new THREE.Vector3(0, 0.5, 0);
    if (this.modelGroup) {
      const box = new THREE.Box3().setFromObject(this.modelGroup);
      box.getCenter(target);
    }
    const offset = new THREE.Vector3().subVectors(this.camera.position, target);
    const currentDist = offset.length();
    const newDist = Math.max(0.5, Math.min(30, currentDist * (1 + delta)));
    offset.setLength(newDist);
    this.camera.position.copy(target).add(offset);
    this.camera.lookAt(target);
    this.camera.updateMatrixWorld();
    this.notify();
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
    throw new Error('3D viewport is not initialized.');
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
    if (!ctx) throw new Error('Failed to initialize 2D Canvas context');

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
          else reject(new Error('Failed to generate image'));
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

/**
 * Bakes an object's world matrix (rotation, scale in meters, floor grounding)
 * directly into each child mesh's geometry vertices and normals.
 * Resets local transforms to identity, ensuring universal 1:1 Y-up compatibility.
 */
export function bakeModelTransforms(targetObject: THREE.Object3D): THREE.Object3D {
  const baked = targetObject.clone(true);
  // Staging viewport position is never baked into exported files; only rotation & unit scale are baked
  baked.position.set(0, 0, 0);
  baked.updateMatrixWorld(true);

  // 1. Bake world matrix into each mesh geometry
  baked.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry = mesh.geometry.clone();
        mesh.geometry.applyMatrix4(mesh.matrixWorld);
        mesh.geometry.computeVertexNormals();
      }
    }
  });

  // 2. Reset local transforms across the hierarchy
  baked.traverse((child) => {
    child.position.set(0, 0, 0);
    child.rotation.set(0, 0, 0);
    child.scale.set(1, 1, 1);
    child.updateMatrix();
  });

  baked.position.set(0, 0, 0);
  baked.rotation.set(0, 0, 0);
  baked.scale.set(1, 1, 1);
  baked.updateMatrixWorld(true);

  return baked;
}

export async function exportModelToGLB(): Promise<ArrayBuffer> {
  const targetObject = viewportBridge.modelGroup || viewportBridge.scene;
  if (!targetObject) {
    throw new Error('No 3D model loaded to export.');
  }

  const bakedObject = bakeModelTransforms(targetObject);

  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
  const exporter = new GLTFExporter();

  return new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      bakedObject,
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

function stripMaterialTextures(mat: THREE.Material): THREE.Material {
  const clean = mat.clone() as any;
  clean.map = null;
  clean.normalMap = null;
  clean.roughnessMap = null;
  clean.metalnessMap = null;
  clean.aoMap = null;
  clean.emissiveMap = null;
  clean.clearcoatMap = null;
  clean.clearcoatRoughnessMap = null;
  clean.sheenColorMap = null;
  clean.sheenRoughnessMap = null;
  clean.transmissionMap = null;
  clean.alphaMap = null;
  clean.displacementMap = null;
  clean.needsUpdate = true;
  return clean;
}

/**
 * Exports clean 3D geometry scaled 1:1 in meters without heavy embedded textures.
 * Conforms to the standard Web & AR geometry.glb specification.
 */
export async function exportCleanGeometryGLB(): Promise<ArrayBuffer> {
  const targetObject = viewportBridge.modelGroup || viewportBridge.scene;
  if (!targetObject) {
    throw new Error('No 3D model loaded to export.');
  }

  const bakedObject = bakeModelTransforms(targetObject);

  bakedObject.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((m) => stripMaterialTextures(m));
        } else {
          mesh.material = stripMaterialTextures(mesh.material);
        }
      }
    }
  });

  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
  const exporter = new GLTFExporter();

  return new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      bakedObject,
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
        embedImages: false,
        includeCustomExtensions: true
      }
    );
  });
}

export interface UsdzExportOptions {
  maxTextureSize?: number;
  quickLookCompatible?: boolean;
}

/**
 * Exports model to Apple AR Quick Look USDZ archive.
 */
export async function exportModelToUSDZ(options: UsdzExportOptions = {}): Promise<ArrayBuffer> {
  const targetObject = viewportBridge.modelGroup || viewportBridge.scene;
  if (!targetObject) {
    throw new Error('No 3D model loaded to export.');
  }

  const bakedObject = bakeModelTransforms(targetObject);

  const { USDZExporter } = await import('three/examples/jsm/exporters/USDZExporter.js');
  const exporter = new USDZExporter();

  const uint8Result = await exporter.parseAsync(bakedObject, {
    quickLookCompatible: true,
    maxTextureSize: options.maxTextureSize || 2048,
    ...options
  });

  return uint8Result.buffer.slice(
    uint8Result.byteOffset,
    uint8Result.byteOffset + uint8Result.byteLength
  );
}
