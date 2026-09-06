/**
 * Hardware-accelerated Canvas texture processing utilities.
 * Uses Chromium's native WebP/PNG codecs for instant, zero-process-overhead operations.
 */

export async function convertImageToWebpCanvas(
  sourceUrl: string,
  outputPath: string,
  quality = 85,
  maxResolution?: number
): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`No se pudo cargar la imagen: ${sourceUrl}`));
    image.src = sourceUrl;
  });

  let width = img.naturalWidth || img.width || 2048;
  let height = img.naturalHeight || img.height || 2048;

  if (maxResolution && (width > maxResolution || height > maxResolution)) {
    if (width >= height) {
      height = Math.round((height * maxResolution) / width);
      width = maxResolution;
    } else {
      width = Math.round((width * maxResolution) / height);
      height = maxResolution;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo inicializar el contexto 2D');

  ctx.drawImage(img, 0, 0, width, height);

  const encoderQuality = Math.max(0.1, Math.min(1.0, quality / 100));
  const isPng = outputPath.toLowerCase().endsWith('.png');
  const mimeType = isPng ? 'image/png' : 'image/webp';

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Error al codificar imagen a WebP'));
      },
      mimeType,
      isPng ? undefined : encoderQuality
    );
  });

  const arrayBuffer = await blob.arrayBuffer();
  await window.electronAPI.writeBinaryFile(outputPath, new Uint8Array(arrayBuffer));
  return outputPath;
}

export async function flipNormalMapCanvas(
  sourceUrl: string,
  outputPath: string,
  quality = 95
): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`No se pudo cargar la textura: ${sourceUrl}`));
    image.src = sourceUrl;
  });

  const width = img.naturalWidth || img.width || 2048;
  const height = img.naturalHeight || img.height || 2048;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('No se pudo inicializar el contexto 2D');

  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const total = width * height;

  // Invert Green channel (Y axis in normal maps)
  for (let i = 0; i < total; i++) {
    data[i * 4 + 1] = 255 - data[i * 4 + 1];
  }

  ctx.putImageData(imageData, 0, 0);

  const isPng = outputPath.toLowerCase().endsWith('.png');
  const mimeType = isPng ? 'image/png' : 'image/webp';
  const encoderQuality = Math.max(0.1, Math.min(1.0, quality / 100));

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Error al codificar mapa normal'));
      },
      mimeType,
      isPng ? undefined : encoderQuality
    );
  });

  const arrayBuffer = await blob.arrayBuffer();
  await window.electronAPI.writeBinaryFile(outputPath, new Uint8Array(arrayBuffer));
  return outputPath;
}

export async function invertRoughnessCanvas(
  sourceUrl: string,
  outputPath: string,
  quality = 90
): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`No se pudo cargar la textura: ${sourceUrl}`));
    image.src = sourceUrl;
  });

  const width = img.naturalWidth || img.width || 2048;
  const height = img.naturalHeight || img.height || 2048;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('No se pudo inicializar el contexto 2D');

  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const total = width * height;

  // Invert RGB channels (1.0 - val)
  for (let i = 0; i < total; i++) {
    data[i * 4 + 0] = 255 - data[i * 4 + 0];
    data[i * 4 + 1] = 255 - data[i * 4 + 1];
    data[i * 4 + 2] = 255 - data[i * 4 + 2];
  }

  ctx.putImageData(imageData, 0, 0);

  const isPng = outputPath.toLowerCase().endsWith('.png');
  const mimeType = isPng ? 'image/png' : 'image/webp';
  const encoderQuality = Math.max(0.1, Math.min(1.0, quality / 100));

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Error al codificar mapa de rugosidad'));
      },
      mimeType,
      isPng ? undefined : encoderQuality
    );
  });

  const arrayBuffer = await blob.arrayBuffer();
  await window.electronAPI.writeBinaryFile(outputPath, new Uint8Array(arrayBuffer));
  return outputPath;
}
