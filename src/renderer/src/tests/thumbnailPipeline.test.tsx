import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import {
  ThumbnailImage,
  getCachedThumbnail,
  invalidateThumbnail
} from '../components/UI/ThumbnailImage';
import { GetThumbnailSchema } from '../../../main/ipcSchemas';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('Thumbnail Pipeline & ThumbnailImage Component', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    (window as any).electronAPI = {
      getThumbnail: vi.fn().mockImplementation(async ({ filePath, size = 96 }) => {
        return {
          filePath: `/cache/thumbnails/thumb-${size}.webp`,
          url: `local-asset:///cache/thumbnails/thumb-${size}.webp`
        };
      }),
      toAssetUrl: vi.fn((p: string) => `local-asset:///${p.replace(/^\/+/, '')}`)
    };
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  describe('ThumbnailImage Component', () => {
    it('does NOT render full 4K raw src immediately; shows pulse skeleton while waiting', async () => {
      const raw4kUrl = 'local-asset:///textures/huge_4k_basecolor.png';
      const filePath = '/textures/huge_4k_basecolor.png';

      // Ensure cache is empty for this path
      invalidateThumbnail(filePath);
      invalidateThumbnail(raw4kUrl);

      // Create a pending promise that does not resolve immediately
      let resolveThumb: (val: any) => void = () => {};
      const pendingPromise = new Promise((resolve) => {
        resolveThumb = resolve;
      });
      (window as any).electronAPI.getThumbnail = vi.fn().mockReturnValue(pendingPromise);

      await act(async () => {
        root.render(
          <ThumbnailImage
            src={raw4kUrl}
            filePath={filePath}
            alt="Huge BaseColor"
            size={96}
          />
        );
      });

      // Verification: <img> should NOT have src set to raw 4K texture!
      const img = container.querySelector('img');
      expect(img).toBeNull(); // Not mounted or no src yet

      // Skeleton loader should be active
      const skeleton = container.querySelector('.animate-pulse');
      expect(skeleton).not.toBeNull();

      // Resolve the thumbnail IPC call
      await act(async () => {
        resolveThumb({
          filePath: '/cache/thumbnails/thumb_96.webp',
          url: 'local-asset:///cache/thumbnails/thumb_96.webp'
        });
      });

      // Now the low-res thumbnail should be rendered
      const resolvedImg = container.querySelector('img');
      expect(resolvedImg).not.toBeNull();
      expect(resolvedImg?.getAttribute('src')).toBe('local-asset:///cache/thumbnails/thumb_96.webp');
    });

    it('requests thumbnail from window.electronAPI.getThumbnail when filePath is provided', async () => {
      const filePath = '/models/chair/diffuse.png';
      const rawUrl = 'local-asset:///models/chair/diffuse.png';
      invalidateThumbnail(filePath);

      await act(async () => {
        root.render(
          <ThumbnailImage
            src={rawUrl}
            filePath={filePath}
            alt="Chair Diffuse"
            size={96}
          />
        );
      });

      expect((window as any).electronAPI.getThumbnail).toHaveBeenCalledTimes(1);
      expect((window as any).electronAPI.getThumbnail).toHaveBeenCalledWith({
        filePath,
        size: 96
      });

      const img = container.querySelector('img');
      expect(img?.getAttribute('src')).toBe('local-asset:///cache/thumbnails/thumb-96.webp');
    });

    it('serves thumbnail instantly from in-memory cache on re-renders without calling IPC again', async () => {
      const filePath = '/models/table/normal.png';
      const rawUrl = 'local-asset:///models/table/normal.png';
      invalidateThumbnail(filePath);

      // First render: fetches from electronAPI
      await act(async () => {
        root.render(
          <ThumbnailImage
            src={rawUrl}
            filePath={filePath}
            alt="Table Normal"
            size={96}
          />
        );
      });

      expect((window as any).electronAPI.getThumbnail).toHaveBeenCalledTimes(1);
      expect(getCachedThumbnail(filePath)).toBe('local-asset:///cache/thumbnails/thumb-96.webp');

      // Unmount and re-mount another instance
      await act(async () => {
        root.render(<div>Different view</div>);
      });

      vi.clearAllMocks();

      // Second render: should hit in-memory cache directly
      await act(async () => {
        root.render(
          <ThumbnailImage
            src={rawUrl}
            filePath={filePath}
            alt="Table Normal Re-rendered"
            size={96}
          />
        );
      });

      const img = container.querySelector('img');
      expect(img?.getAttribute('src')).toBe('local-asset:///cache/thumbnails/thumb-96.webp');
      // In-memory cache hit: no IPC call needed!
      expect((window as any).electronAPI.getThumbnail).not.toHaveBeenCalled();
    });

    it('clears cache when invalidateThumbnail is called', async () => {
      const filePath = '/models/couch/fabric.png';
      invalidateThumbnail(filePath);

      await act(async () => {
        root.render(
          <ThumbnailImage
            src="local-asset:///models/couch/fabric.png"
            filePath={filePath}
            alt="Fabric"
            size={96}
          />
        );
      });

      expect(getCachedThumbnail(filePath)).toBeDefined();

      // Invalidate
      invalidateThumbnail(filePath);
      expect(getCachedThumbnail(filePath)).toBeUndefined();
    });

    it('deduplicates simultaneous in-flight IPC requests for the same filePath', async () => {
      const filePath = '/models/chair/ambient.png';
      const rawUrl = 'local-asset:///models/chair/ambient.png';
      invalidateThumbnail(filePath);

      let resolveIpc: (val: any) => void = () => {};
      const pendingIpc = new Promise((resolve) => {
        resolveIpc = resolve;
      });
      (window as any).electronAPI.getThumbnail = vi.fn().mockReturnValue(pendingIpc);

      const container2 = document.createElement('div');
      document.body.appendChild(container2);
      const root2 = createRoot(container2);

      try {
        await act(async () => {
          root.render(<ThumbnailImage src={rawUrl} filePath={filePath} alt="Chair 1" size={96} />);
          root2.render(<ThumbnailImage src={rawUrl} filePath={filePath} alt="Chair 2" size={96} />);
        });

        // Even though two components requested the thumbnail simultaneously, only 1 IPC call was made!
        expect((window as any).electronAPI.getThumbnail).toHaveBeenCalledTimes(1);

        await act(async () => {
          resolveIpc({
            filePath: '/cache/thumbnails/thumb-ambient.webp',
            url: 'local-asset:///cache/thumbnails/thumb-ambient.webp'
          });
        });

        const img1 = container.querySelector('img');
        const img2 = container2.querySelector('img');
        expect(img1?.getAttribute('src')).toBe('local-asset:///cache/thumbnails/thumb-ambient.webp');
        expect(img2?.getAttribute('src')).toBe('local-asset:///cache/thumbnails/thumb-ambient.webp');
      } finally {
        act(() => {
          root2.unmount();
        });
        container2.remove();
      }
    });
  });

  describe('GetThumbnailSchema IPC Validation', () => {
    it('accepts valid file paths and default size', () => {
      const valid = { filePath: '/home/user/textures/wood.png' };
      const parsed = GetThumbnailSchema.parse(valid);
      expect(parsed.filePath).toBe('/home/user/textures/wood.png');
      expect(parsed.size).toBe(96);
    });

    it('accepts custom size between 16 and 512', () => {
      const valid = { filePath: '/home/user/textures/wood.png', size: 128 };
      const parsed = GetThumbnailSchema.parse(valid);
      expect(parsed.size).toBe(128);
    });

    it('rejects invalid size out of range', () => {
      expect(() =>
        GetThumbnailSchema.parse({ filePath: '/path/test.png', size: 5 })
      ).toThrow();

      expect(() =>
        GetThumbnailSchema.parse({ filePath: '/path/test.png', size: 1024 })
      ).toThrow();
    });

    it('rejects empty file path', () => {
      expect(() => GetThumbnailSchema.parse({ filePath: '' })).toThrow();
    });
  });
});
