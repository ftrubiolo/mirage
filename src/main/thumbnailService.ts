import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { getThumbnailsCacheDir } from './platform';
import { processTextureTask } from './texturePacker';

// Lazy-load sharp to ensure module load failures don't crash startup
let sharpInstance: any = null;
let sharpLoadAttempted = false;

function getSharp(): any {
  if (sharpLoadAttempted) return sharpInstance;
  sharpLoadAttempted = true;

  const candidateModules = [
    '@janhapke/sharp-electron',
    'sharp'
  ];

  for (const mod of candidateModules) {
    try {
      sharpInstance = require(mod);
      if (sharpInstance) break;
    } catch {
      // try next candidate
    }
  }

  return sharpInstance;
}

// In-flight deduplication map: thumbPath -> Promise<{ filePath: string }>
const inFlightRequests = new Map<string, Promise<{ filePath: string }>>();

// Concurrency queue to avoid CPU / disk saturation when many thumbnails are requested
const MAX_CONCURRENT_THUMBNAILS = 4;
let activeThumbnailCount = 0;
const thumbnailQueue: Array<() => void> = [];

function acquireThumbnailSlot(): Promise<void> {
  if (activeThumbnailCount < MAX_CONCURRENT_THUMBNAILS) {
    activeThumbnailCount++;
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    thumbnailQueue.push(() => {
      activeThumbnailCount++;
      resolve();
    });
  });
}

function releaseThumbnailSlot(): void {
  activeThumbnailCount--;
  const next = thumbnailQueue.shift();
  if (next) {
    next();
  }
}

/**
 * High-performance thumbnail generation with persistent disk caching,
 * in-flight request deduplication, concurrency limiting, and atomic writes.
 */
export async function getThumbnail(
  filePath: string,
  targetSize: number = 96
): Promise<{ filePath: string }> {
  const stat = await fs.stat(filePath);
  const hash = crypto
    .createHash('md5')
    .update(`${filePath}:${stat.mtimeMs}:${stat.size}:${targetSize}`)
    .digest('hex');

  const thumbDir = getThumbnailsCacheDir();
  await fs.mkdir(thumbDir, { recursive: true });
  const thumbPath = path.join(thumbDir, `${hash}.webp`);

  // 1. Fast disk cache check
  try {
    const thumbStat = await fs.stat(thumbPath);
    if (thumbStat.size > 0) {
      return { filePath: thumbPath };
    }
  } catch {
    // Thumbnail not yet cached on disk
  }

  // 2. In-flight request deduplication
  const existingPromise = inFlightRequests.get(thumbPath);
  if (existingPromise) {
    return existingPromise;
  }

  const generationPromise = (async () => {
    await acquireThumbnailSlot();
    try {
      // Double check disk cache after acquiring concurrency slot
      try {
        const checkStat = await fs.stat(thumbPath);
        if (checkStat.size > 0) {
          return { filePath: thumbPath };
        }
      } catch {
        // Continue generation
      }

      const tmpPath = `${thumbPath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 7)}`;
      const sharp = getSharp();

      if (sharp) {
        try {
          await sharp(filePath)
            .rotate()
            .resize(targetSize, targetSize, {
              fit: 'cover',
              position: 'centre',
              withoutEnlargement: true
            })
            .webp({
              quality: 80,
              effort: 4,
              smartSubsample: true
            })
            .toFile(tmpPath);

          await fs.rename(tmpPath, thumbPath);
          return { filePath: thumbPath };
        } catch (inProcessErr) {
          // Clean up temp file if present
          try {
            await fs.unlink(tmpPath);
          } catch {
            // Ignore
          }
          console.warn('[ThumbnailService] In-process sharp failed, trying worker fallback:', inProcessErr);
        }
      }

      // 3. Fallback to worker process if in-process sharp unavailable or failed
      await processTextureTask({
        task: 'thumbnail',
        inputPath: filePath,
        outputPath: thumbPath,
        resolution: targetSize,
        quality: 80
      });

      return { filePath: thumbPath };
    } finally {
      releaseThumbnailSlot();
      inFlightRequests.delete(thumbPath);
    }
  })();

  inFlightRequests.set(thumbPath, generationPromise);
  return generationPromise;
}
