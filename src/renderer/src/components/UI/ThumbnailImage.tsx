import React, { useState, useEffect } from 'react';

// Global in-memory cache for downscaled WebP thumbnails
const thumbnailCache = new Map<string, string>();
const pendingGenerations = new Set<string>();

export function getCachedThumbnail(src: string): string | undefined {
  return thumbnailCache.get(src);
}

export function invalidateThumbnail(src?: string | null): void {
  if (!src) return;
  const cleanSrc = src.split('?')[0];
  for (const key of Array.from(thumbnailCache.keys())) {
    if (key.startsWith(src) || key.startsWith(cleanSrc) || key.includes(cleanSrc)) {
      thumbnailCache.delete(key);
    }
  }
}

export interface ThumbnailImageProps {
  src: string;
  alt: string;
  className?: string;
  size?: number; // target thumbnail square size, default 80
}

export const ThumbnailImage: React.FC<ThumbnailImageProps> = React.memo(
  ({ src, alt, className = '', size = 80 }) => {
    const cached = thumbnailCache.get(src);
    const [thumbSrc, setThumbSrc] = useState<string>(() => cached || src);
    const [isLoaded, setIsLoaded] = useState<boolean>(() => Boolean(cached));

    useEffect(() => {
      const hit = thumbnailCache.get(src);
      if (hit) {
        setThumbSrc(hit);
        setIsLoaded(true);
        return;
      }

      setThumbSrc(src);
      setIsLoaded(false);

      if (!src) return;
      if (pendingGenerations.has(src)) return;

      pendingGenerations.add(src);
      let isCancelled = false;

      // Downsample asynchronously off the critical rendering path
      const img = new Image();
      img.decoding = 'async';
      img.loading = 'lazy';
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        pendingGenerations.delete(src);
        if (isCancelled) return;
        setIsLoaded(true);

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
            thumbnailCache.set(src, dataUrl);

            if (!isCancelled) {
              setThumbSrc(dataUrl);
            }
          }
        } catch {
          // Fallback to original URL
        }
      };

      img.onerror = () => {
        pendingGenerations.delete(src);
        if (!isCancelled) {
          setIsLoaded(true);
        }
      };

      img.src = src;

      return () => {
        isCancelled = true;
        pendingGenerations.delete(src);
      };
    }, [src, size]);

    return (
      <div className={`relative overflow-hidden shrink-0 ${className}`}>
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
        {!isLoaded && (
          <div className="absolute inset-0 bg-surface-container animate-pulse flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-ink-tertiary/20" />
          </div>
        )}
      </div>
    );
  }
);
