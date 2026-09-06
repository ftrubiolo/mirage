export interface CanvasOrmPackOptions {
  aoUrl: string;
  metalRoughnessUrl?: string;
  roughnessUrl?: string;
  metalnessUrl?: string;
  outputPath: string;
  resolution?: number; // Default: 2048
  quality?: number; // 0 - 100, Default: 90
  onProgress?: (step: string) => void;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar la imagen desde: ${url}`));
    img.src = url;
  });
}

/**
 * Packs separate PBR texture maps (AO, Roughness, Metalness) into a standard glTF ORM texture
 * (Red = Ambient Occlusion, Green = Roughness, Blue = Metalness).
 *
 * Uses hardware-accelerated 2D Canvas and Chromium's native WebP encoder, bypassing native
 * C++ libvips / sharp library linking issues entirely and delivering instant, crash-free packing.
 */
export async function packOrmWithCanvas(options: CanvasOrmPackOptions): Promise<string> {
  const {
    aoUrl,
    metalRoughnessUrl,
    roughnessUrl,
    metalnessUrl,
    outputPath,
    resolution = 2048,
    quality = 90,
    onProgress
  } = options;

  // 1. Load source images
  onProgress?.('Cargando mapa de Oclusión Ambiental (AO)...');
  const aoImg = await loadImage(aoUrl);

  let mrImg: HTMLImageElement | null = null;
  let roughImg: HTMLImageElement | null = null;
  let metalImg: HTMLImageElement | null = null;

  if (metalRoughnessUrl) {
    onProgress?.('Cargando mapa glTF Metal-Roughness...');
    mrImg = await loadImage(metalRoughnessUrl);
  } else {
    if (roughnessUrl) {
      onProgress?.('Cargando mapa de Rugosidad...');
      roughImg = await loadImage(roughnessUrl);
    }
    if (metalnessUrl) {
      onProgress?.('Cargando mapa de Metalicidad...');
      metalImg = await loadImage(metalnessUrl);
    }
  }

  // 2. Setup processing canvas to read pixel channels
  const helperCanvas = document.createElement('canvas');
  helperCanvas.width = resolution;
  helperCanvas.height = resolution;
  const helperCtx = helperCanvas.getContext('2d', { willReadFrequently: true });

  if (!helperCtx) {
    throw new Error('No se pudo inicializar el contexto de dibujo Canvas 2D');
  }

  // 3. Extract AO (Red channel)
  onProgress?.('Extrayendo canal de Oclusión (R)...');
  helperCtx.clearRect(0, 0, resolution, resolution);
  helperCtx.drawImage(aoImg, 0, 0, resolution, resolution);
  const aoData = helperCtx.getImageData(0, 0, resolution, resolution).data;

  // 4. Extract Roughness (G) and Metalness (B)
  let mrData: Uint8ClampedArray | null = null;
  let roughData: Uint8ClampedArray | null = null;
  let metalData: Uint8ClampedArray | null = null;

  if (mrImg) {
    onProgress?.('Extrayendo Rugosidad (G) y Metalicidad (B) de glTF...');
    helperCtx.clearRect(0, 0, resolution, resolution);
    helperCtx.drawImage(mrImg, 0, 0, resolution, resolution);
    mrData = helperCtx.getImageData(0, 0, resolution, resolution).data;
  } else {
    if (roughImg) {
      onProgress?.('Extrayendo mapa de Rugosidad...');
      helperCtx.clearRect(0, 0, resolution, resolution);
      helperCtx.drawImage(roughImg, 0, 0, resolution, resolution);
      roughData = helperCtx.getImageData(0, 0, resolution, resolution).data;
    }
    if (metalImg) {
      onProgress?.('Extrayendo mapa de Metalicidad...');
      helperCtx.clearRect(0, 0, resolution, resolution);
      helperCtx.drawImage(metalImg, 0, 0, resolution, resolution);
      metalData = helperCtx.getImageData(0, 0, resolution, resolution).data;
    }
  }

  // 5. Interleave channels into standard glTF ORM:
  // R = Occlusion, G = Roughness, B = Metalness, A = 255
  onProgress?.('Combinando canales ORM (R: AO, G: Rugosidad, B: Metal)...');
  const ormCanvas = document.createElement('canvas');
  ormCanvas.width = resolution;
  ormCanvas.height = resolution;
  const ormCtx = ormCanvas.getContext('2d', { willReadFrequently: true });

  if (!ormCtx) {
    throw new Error('No se pudo inicializar el lienzo para componer ORM');
  }

  const ormImageData = ormCtx.createImageData(resolution, resolution);
  const out = ormImageData.data;
  const totalPixels = resolution * resolution;

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;

    // Red = Occlusion (AO)
    out[idx + 0] = aoData[idx + 0];

    // Green = Roughness
    if (mrData) {
      out[idx + 1] = mrData[idx + 1]; // glTF standard: Green = Roughness
    } else if (roughData) {
      out[idx + 1] = roughData[idx + 0]; // Greyscale roughness
    } else {
      out[idx + 1] = 128; // Default 0.5
    }

    // Blue = Metalness
    if (mrData) {
      out[idx + 2] = mrData[idx + 2]; // glTF standard: Blue = Metalness
    } else if (metalData) {
      out[idx + 2] = metalData[idx + 0]; // Greyscale metalness
    } else {
      out[idx + 2] = 0; // Default dielectric (0.0)
    }

    // Alpha = 255 (full opacity)
    out[idx + 3] = 255;
  }

  ormCtx.putImageData(ormImageData, 0, 0);

  // 6. Encode to WebP or PNG
  const isPng = outputPath.toLowerCase().endsWith('.png');
  const mimeType = isPng ? 'image/png' : 'image/webp';
  const encoderQuality = isPng ? undefined : Math.max(0.1, Math.min(1.0, quality / 100));

  onProgress?.(`Codificando textura final a ${isPng ? 'PNG' : 'WebP'} (${resolution}x${resolution})...`);
  const blob = await new Promise<Blob>((resolve, reject) => {
    ormCanvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error(`Fallo al codificar textura con formato ${mimeType}`));
      },
      mimeType,
      encoderQuality
    );
  });

  // 7. Write binary to disk via Electron IPC
  onProgress?.('Guardando archivo empaquetado en disco...');
  const arrayBuffer = await blob.arrayBuffer();
  await window.electronAPI.writeBinaryFile(outputPath, new Uint8Array(arrayBuffer));

  return outputPath;
}
