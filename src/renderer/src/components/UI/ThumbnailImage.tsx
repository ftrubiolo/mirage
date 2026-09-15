import React, { useState, useEffect } from 'react';

// Global in-memory cache for downscaled WebP thumbnails
const thumbnailCache = new Map<string, string>();
const pendingGenerations = new Set<string>();
const pendingIpcRequests = new Map<string, Promise<{ filePath: string; url: string }>>();

export function getCachedThumbnail(key: string): string | undefined {
  return thumbnailCache.get(key);
}

export function invalidateThumbnail(target?: string | null): void {
  if (!target) return;
  const cleanTarget = target.split('?')[0];
  for (const key of Array.from(thumbnailCache.keys())) {
    if (key.startsWith(target) || key.startsWith(cleanTarget) || key.includes(cleanTarget)) {
      thumbnailCache.delete(key);
    }
  }
  for (const key of Array.from(pendingIpcRequests.keys())) {
    if (key.startsWith(target) || key.startsWith(cleanTarget) || key.includes(cleanTarget)) {
      pendingIpcRequests.delete(key);
    }
  }
}

export interface ThumbnailImageProps {
  src: string;
  filePath?: string;
  alt: string;
  className?: string;
  size?: number; // target thumbnail square size, default 96
}

export const ThumbnailImage: React.FC<ThumbnailImageProps> = React.memo(
  ({ src, filePath, alt, className = '', size = 96 }) => {
    const cacheKey = filePath || src;
    const cached = cacheKey ? thumbnailCache.get(cacheKey) : undefined;
    const [thumbSrc, setThumbSrc] = useState<string>(() => cached || '');
    const [isLoaded, setIsLoaded] = useState<boolean>(() => Boolean(cached));

    useEffect(() => {
      const currentKey = filePath || src;
      if (!currentKey) {
        setThumbSrc('');
        setIsLoaded(false);
        return;
      }

      const hit = thumbnailCache.get(currentKey);
      if (hit) {
        setThumbSrc(hit);
        setIsLoaded(true);
        return;
      }

      let isCancelled = false;

      // 1. Offload to background thumbnail service when local file path is available
      if (filePath && window.electronAPI?.getThumbnail) {
        const reqKey = `${filePath}:${size}`;
        let reqPromise = pendingIpcRequests.get(reqKey);
        if (!reqPromise) {
          reqPromise = window.electronAPI.getThumbnail({ filePath, size });
          pendingIpcRequests.set(reqKey, reqPromise);
          reqPromise.finally(() => {
            pendingIpcRequests.delete(reqKey);
          });
        }

        reqPromise
          .then((res) => {
            if (isCancelled) return;
            thumbnailCache.set(currentKey, res.url);
            if (src && src !== currentKey) {
              thumbnailCache.set(src, res.url);
            }
            setThumbSrc(res.url);
            setIsLoaded(true);
          })
          .catch((err) => {
            console.warn(`[ThumbnailImage] Native thumbnail fallback for ${filePath}:`, err);
            if (!isCancelled && src) {
              setThumbSrc(src);
              setIsLoaded(true);
            }
          });

        return () => {
          isCancelled = true;
        };
      }

      // 2. Fallback for non-filesystem URLs (data:, blob:, web HTTP)
      if (!src) return;
      if (pendingGenerations.has(currentKey)) return;

      pendingGenerations.add(currentKey);

      // Downsample asynchronously off the critical rendering path
      const img = new Image();
      img.decoding = 'async';
      img.loading = 'lazy';
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        pendingGenerations.delete(currentKey);
        if (isCancelled) return;

        try {
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'medium';
            const minDim = Math.min(img.naturalWidth, img.naturalHeight);
            const sx = (img.naturalWidth - minDim) / 2;
            const sy = (img.naturalHeight - minDim) / 2;
            ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

            const dataUrl = canvas.toDataURL('image/webp', 0.85);
            thumbnailCache.set(currentKey, dataUrl);

            if (!isCancelled) {
              setThumbSrc(dataUrl);
              setIsLoaded(true);
            }
            return;
          }
        } catch {
          // Fallback to original URL
        }

        if (!isCancelled) {
          setThumbSrc(src);
          setIsLoaded(true);
        }
      };

      img.onerror = () => {
        pendingGenerations.delete(currentKey);
        if (!isCancelled) {
          setThumbSrc(src);
          setIsLoaded(true);
        }
      };

      img.src = src;

      return () => {
        isCancelled = true;
        pendingGenerations.delete(currentKey);
      };
    }, [src, filePath, size]);

    return (
      <div className={`relative overflow-hidden shrink-0 ${className}`}>
        {thumbSrc ? (
          <img
            src={thumbSrc}
            alt={alt}
            loading="lazy"
            decoding="async"
            onLoad={() => setIsLoaded(true)}
            className={`w-full h-full object-cover transition-opacity duration-150 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ) : null}
        {!isLoaded && (
          <div className="absolute inset-0 bg-surface-container animate-pulse flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-ink-tertiary/20" />
          </div>
        )}
      </div>
    );
  }
);
