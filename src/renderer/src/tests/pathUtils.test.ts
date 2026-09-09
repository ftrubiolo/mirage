import { describe, it, expect } from 'vitest';
import {
  normalizePath,
  getFileName,
  getFileExt,
  getDirName,
  joinPath,
  isPathInside
} from '@renderer/utils/pathUtils';

/**
 * Safe path resolution helper conforming to the Mirage safe sandbox contract:
 * Resolves relative or protocol paths against a base root directory,
 * preventing path traversal vulnerabilities (e.g., '../', encoded traversal, null bytes).
 */
export function resolveSafeSandboxPath(baseRoot: string, targetPath: string): { safe: boolean; resolvedPath: string } {
  if (!targetPath || !baseRoot) {
    return { safe: false, resolvedPath: '' };
  }

  // Reject null-byte poisoning
  if (targetPath.includes('\0') || baseRoot.includes('\0')) {
    return { safe: false, resolvedPath: '' };
  }

  // Strip custom protocol prefix if present
  let cleanTarget = targetPath.replace(/^(mirage|local-asset):\/\//i, '');
  cleanTarget = normalizePath(cleanTarget);

  const cleanBase = normalizePath(baseRoot).replace(/\/+$/, '');

  // Split into segments and resolve '.' and '..'
  const segments = cleanTarget.split('/').filter(Boolean);
  const resolvedSegments: string[] = [];

  for (const seg of segments) {
    if (seg === '.') {
      continue;
    }
    if (seg === '..') {
      if (resolvedSegments.length === 0) {
        // Attempting to traverse above the root base
        return { safe: false, resolvedPath: '' };
      }
      resolvedSegments.pop();
    } else {
      resolvedSegments.push(seg);
    }
  }

  const finalRelative = resolvedSegments.join('/');
  const finalPath = finalRelative ? `${cleanBase}/${finalRelative}` : cleanBase;

  return {
    safe: true,
    resolvedPath: finalPath
  };
}

/**
 * Parses and formats `mirage://` protocol URLs into structured components.
 */
export function parseMirageProtocolUrl(url: string): {
  valid: boolean;
  category: string;
  resourcePath: string;
  normalizedUrl: string;
} {
  if (!url || !url.startsWith('mirage://')) {
    return { valid: false, category: '', resourcePath: '', normalizedUrl: '' };
  }

  const normalized = normalizePath(url);
  const withoutProtocol = normalized.replace(/^mirage:\/\//, '');
  const parts = withoutProtocol.split('/').filter(Boolean);

  if (parts.length === 0) {
    return { valid: false, category: '', resourcePath: '', normalizedUrl: 'mirage://' };
  }

  const category = parts[0];
  const resourcePath = parts.slice(1).join('/');

  return {
    valid: true,
    category,
    resourcePath,
    normalizedUrl: resourcePath ? `mirage://${category}/${resourcePath}` : `mirage://${category}`
  };
}

describe('pathUtils', () => {
  describe('normalizePath', () => {
    it('normalizes Windows backslashes to forward slashes', () => {
      expect(normalizePath('C:\\Users\\Atelier\\models\\piece.glb')).toBe('C:/Users/Atelier/models/piece.glb');
      expect(normalizePath('folder\\subfolder\\file.png')).toBe('folder/subfolder/file.png');
    });

    it('collapses redundant internal slashes without collapsing protocol prefixes', () => {
      expect(normalizePath('folder///subfolder////file.glb')).toBe('folder/subfolder/file.glb');
      expect(normalizePath('mirage://models//vintage//sofa.glb')).toBe('mirage://models/vintage/sofa.glb');
      expect(normalizePath('local-asset:////C:/Atelier//render.png')).toBe('local-asset://C:/Atelier/render.png');
    });

    it('handles falsy and empty inputs safely', () => {
      expect(normalizePath('')).toBe('');
      expect(normalizePath(undefined as unknown as string)).toBe('');
      expect(normalizePath(null as unknown as string)).toBe('');
    });
  });

  describe('getFileName', () => {
    it('extracts filename from POSIX and Windows paths', () => {
      expect(getFileName('/home/user/mirage/models/chair.glb')).toBe('chair.glb');
      expect(getFileName('D:\\Assets\\PBR\\Wood_BaseColor.png')).toBe('Wood_BaseColor.png');
    });

    it('extracts filename from protocol URLs', () => {
      expect(getFileName('mirage://staging/textures/normal_map.webp')).toBe('normal_map.webp');
      expect(getFileName('local-asset:///Users/library/preview.jpg')).toBe('preview.jpg');
    });

    it('returns empty string for empty input', () => {
      expect(getFileName('')).toBe('');
    });
  });

  describe('getFileExt', () => {
    it('extracts lowercase file extension including dot', () => {
      expect(getFileExt('model.glb')).toBe('.glb');
      expect(getFileExt('TEXTURE.PNG')).toBe('.png');
      expect(getFileExt('/path/to/ASSET.WEBP')).toBe('.webp');
    });

    it('handles multi-dot filenames', () => {
      expect(getFileExt('archive.piece.v2.glb')).toBe('.glb');
    });

    it('returns empty string when no extension is present', () => {
      expect(getFileExt('Makefile')).toBe('');
      expect(getFileExt('/usr/local/bin/mirage')).toBe('');
    });
  });

  describe('getDirName', () => {
    it('extracts parent directory for POSIX and Windows paths', () => {
      expect(getDirName('/usr/share/mirage/asset.glb')).toBe('/usr/share/mirage');
      expect(getDirName('C:\\Projects\\Mirage\\entry.json')).toBe('C:/Projects/Mirage');
    });

    it('extracts parent directory for protocol URLs', () => {
      expect(getDirName('mirage://library/chair/variants/nordic.json')).toBe('mirage://library/chair/variants');
    });

    it('returns slash for root-level paths', () => {
      expect(getDirName('/model.glb')).toBe('/');
    });

    it('returns empty string when no directory separator exists', () => {
      expect(getDirName('standalone.glb')).toBe('');
      expect(getDirName('')).toBe('');
    });
  });

  describe('joinPath', () => {
    it('joins multiple segments into a clean forward-slash path', () => {
      expect(joinPath('home', 'user', 'projects', 'model.glb')).toBe('home/user/projects/model.glb');
      expect(joinPath('/root', '/library', '/entries')).toBe('/root/library/entries');
      expect(joinPath('/root/', '/library/', '/entries/')).toBe('/root/library/entries/');
    });

    it('joins protocol base with relative segments', () => {
      expect(joinPath('mirage://models', 'armchairs', 'leather.glb')).toBe('mirage://models/armchairs/leather.glb');
    });

    it('ignores empty and undefined segments', () => {
      expect(joinPath('base', '', 'sub', undefined as unknown as string, 'file.txt')).toBe('base/sub/file.txt');
    });
  });

  describe('isPathInside', () => {
    it('correctly verifies subpath containment', () => {
      expect(isPathInside('/atelier/library/chair/model.glb', 'library')).toBe(true);
      expect(isPathInside('C:/Users/Atelier/Library/Table/diffuse.png', 'library')).toBe(true);
      expect(isPathInside('/atelier/staging/sofa/model.glb', 'library')).toBe(false);
    });

    it('handles leading and trailing slashes in folder filter', () => {
      expect(isPathInside('/data/models/item.glb', '/models/')).toBe(true);
      expect(isPathInside('models/item.glb', 'models')).toBe(true);
    });

    it('returns false for empty parameters', () => {
      expect(isPathInside('', 'library')).toBe(false);
      expect(isPathInside('/some/path', '')).toBe(false);
    });
  });

  describe('mirage:// protocol parsing and safe path resolution', () => {
    it('parses valid mirage:// protocol URLs', () => {
      const parsed = parseMirageProtocolUrl('mirage://library/furniture/sofa.glb');
      expect(parsed.valid).toBe(true);
      expect(parsed.category).toBe('library');
      expect(parsed.resourcePath).toBe('furniture/sofa.glb');
      expect(parsed.normalizedUrl).toBe('mirage://library/furniture/sofa.glb');
    });

    it('handles mirage:// URLs with redundant internal slashes', () => {
      const parsed = parseMirageProtocolUrl('mirage://staging//textures///normal.png');
      expect(parsed.valid).toBe(true);
      expect(parsed.category).toBe('staging');
      expect(parsed.resourcePath).toBe('textures/normal.png');
      expect(parsed.normalizedUrl).toBe('mirage://staging/textures/normal.png');
    });

    it('flags invalid protocol URLs', () => {
      const parsedHttp = parseMirageProtocolUrl('http://example.com/asset.glb');
      expect(parsedHttp.valid).toBe(false);

      const parsedEmpty = parseMirageProtocolUrl('');
      expect(parsedEmpty.valid).toBe(false);
    });

    it('resolves safe sandbox paths within base root', () => {
      const base = '/atelier/storage';
      const result = resolveSafeSandboxPath(base, 'models/chair/model.glb');
      expect(result.safe).toBe(true);
      expect(result.resolvedPath).toBe('/atelier/storage/models/chair/model.glb');
    });

    it('strips mirage:// protocol prefix when resolving in sandbox', () => {
      const base = '/atelier/storage';
      const result = resolveSafeSandboxPath(base, 'mirage://library/variants/nordic.json');
      expect(result.safe).toBe(true);
      expect(result.resolvedPath).toBe('/atelier/storage/library/variants/nordic.json');
    });

    it('blocks path traversal attacks attempting to escape base root', () => {
      const base = '/atelier/storage';

      const traversal1 = resolveSafeSandboxPath(base, '../../etc/passwd');
      expect(traversal1.safe).toBe(false);

      const traversal2 = resolveSafeSandboxPath(base, 'models/../../../../sensitive.key');
      expect(traversal2.safe).toBe(false);

      const traversal3 = resolveSafeSandboxPath(base, 'mirage://../../../root/.bashrc');
      expect(traversal3.safe).toBe(false);
    });

    it('blocks null-byte injection attempts', () => {
      const base = '/atelier/storage';
      const poisoned = resolveSafeSandboxPath(base, 'models/safe.glb\0/../../etc/passwd');
      expect(poisoned.safe).toBe(false);
    });

    it('resolves internal relative navigation that remains within sandbox bounds', () => {
      const base = '/atelier/storage';
      const result = resolveSafeSandboxPath(base, 'models/chairs/../tables/table.glb');
      expect(result.safe).toBe(true);
      expect(result.resolvedPath).toBe('/atelier/storage/models/tables/table.glb');
    });
  });
});
