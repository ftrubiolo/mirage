import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => path.join(os.tmpdir(), 'mirage-access-test', name)),
    commandLine: { appendSwitch: vi.fn() }
  },
  shell: { openPath: vi.fn().mockResolvedValue('') }
}));

import {
  approveDroppedAsset,
  approveDirectory,
  assertReadable,
  assertSafeFileName,
  assertSafeSlug,
  assertWritable,
  canRead,
  isInside,
  resolveAdjacentAsset,
  safeJoin,
  initAccessPolicy,
  getApprovedRoots,
  _resetAccessPolicyForTesting
} from '../../../main/accessPolicy';

/**
 * The access policy is the filesystem trust boundary: the renderer is untrusted,
 * so these are the checks that decide whether a hostile asset file (or a
 * compromised renderer) can reach anything outside the user's chosen folders.
 */
describe('accessPolicy — filesystem trust boundary', () => {
  let sandbox: string;
  let approvedDir: string;
  let outsideDir: string;

  beforeEach(async () => {
    _resetAccessPolicyForTesting();
    sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'mirage-access-'));
    approvedDir = path.join(sandbox, 'approved');
    outsideDir = path.join(sandbox, 'outside');
    await fs.mkdir(approvedDir, { recursive: true });
    await fs.mkdir(outsideDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(sandbox, { recursive: true, force: true });
  });

  describe('isInside', () => {
    it('accepts a path inside the root and the root itself', () => {
      expect(isInside('/data/models/a.glb', '/data/models')).toBe(true);
      expect(isInside('/data/models', '/data/models')).toBe(true);
    });

    it('rejects siblings that merely share a prefix', () => {
      // A naive `startsWith` check would wrongly accept this.
      expect(isInside('/data/models-evil/a.glb', '/data/models')).toBe(false);
      expect(isInside('/data/models2', '/data/models')).toBe(false);
    });

    it('rejects traversal out of the root', () => {
      expect(isInside('/data/other/a.glb', '/data/models')).toBe(false);
      expect(isInside('/etc/passwd', '/data/models')).toBe(false);
    });
  });

  describe('read confinement', () => {
    it('denies reads outside every approved root', async () => {
      const secret = path.join(outsideDir, 'secret.txt');
      await fs.writeFile(secret, 'top secret');

      await expect(assertReadable(secret)).rejects.toThrow(/Access denied/);
      expect(await canRead(secret)).toBe(false);
    });

    it('permits reads inside an approved root', async () => {
      const ok = path.join(approvedDir, 'model.glb');
      await fs.writeFile(ok, 'data');
      approveDirectory(approvedDir, 'read', 'test');

      await expect(assertReadable(ok)).resolves.toBeTruthy();
      expect(await canRead(ok)).toBe(true);
    });

    it('denies a traversal path that escapes an approved root', async () => {
      approveDirectory(approvedDir, 'read', 'test');
      const escape = path.join(approvedDir, '..', 'outside', 'secret.txt');
      await fs.writeFile(path.join(outsideDir, 'secret.txt'), 'x');

      await expect(assertReadable(escape)).rejects.toThrow(/Access denied/);
    });

    it('cannot be escaped through a symlink inside an approved root', async () => {
      approveDirectory(approvedDir, 'read', 'test');
      const link = path.join(approvedDir, 'link.txt');
      const target = path.join(outsideDir, 'secret.txt');
      await fs.writeFile(target, 'top secret');

      try {
        await fs.symlink(target, link);
      } catch {
        return; // symlinks unavailable in this environment
      }

      // `resolveReal` follows the link, so the real path is outside the root.
      await expect(assertReadable(link)).rejects.toThrow(/Access denied/);
    });

    it('rejects empty and non-string paths', async () => {
      await expect(assertReadable('')).rejects.toThrow(/Invalid/);
      await expect(assertReadable(undefined as unknown as string)).rejects.toThrow(/Invalid/);
    });
  });

  describe('write confinement', () => {
    it('denies writes outside every writable root', async () => {
      approveDirectory(approvedDir, 'read', 'test');
      const target = path.join(approvedDir, 'nope.txt');

      // A read grant must never imply a write grant.
      await expect(assertWritable(target)).rejects.toThrow(/Access denied/);
    });

    it('permits writes inside a readwrite root', async () => {
      approveDirectory(approvedDir, 'readwrite', 'test');
      await expect(assertWritable(path.join(approvedDir, 'ok.txt'))).resolves.toBeTruthy();
    });

    it('never downgrades an existing readwrite grant to read', () => {
      approveDirectory(approvedDir, 'readwrite', 'test');
      approveDirectory(approvedDir, 'read', 'test-again');
      // Granting read afterwards must not revoke write.
      return expect(assertWritable(path.join(approvedDir, 'ok.txt'))).resolves.toBeTruthy();
    });
  });

  describe('safeJoin', () => {
    it('joins an ordinary segment', () => {
      expect(safeJoin('/base', 'entry-1')).toBe(path.resolve('/base/entry-1'));
    });

    it('rejects traversal, absolute paths and drive-qualified paths', () => {
      expect(() => safeJoin('/base', '../../etc')).toThrow(/escapes its container/);
      expect(() => safeJoin('/base', '/etc/passwd')).toThrow(/absolute/);
      expect(() => safeJoin('/base', 'C:/Windows')).toThrow(/absolute/);
      expect(() => safeJoin('/base', '')).toThrow(/Invalid/);
    });
  });

  describe('slug and filename validation', () => {
    it('accepts ordinary slugs', () => {
      expect(assertSafeSlug('silla-roble_01')).toBe('silla-roble_01');
    });

    it('rejects traversal, separators and dotfiles', () => {
      for (const bad of ['..', '../../etc', 'a/b', 'a\\b', '.hidden', '', '-leading']) {
        expect(() => assertSafeSlug(bad), `slug ${bad}`).toThrow(/Invalid entry slug/);
      }
    });

    it('rejects file names containing separators or traversal', () => {
      for (const bad of ['../x', 'a/b', 'a\\b', '..', '.', '']) {
        expect(() => assertSafeFileName(bad), `name ${bad}`).toThrow(/Invalid file name/);
      }
      expect(assertSafeFileName('model_normal.webp')).toBe('model_normal.webp');
    });
  });

  describe('glTF adjacent-asset resolution', () => {
    it('resolves a relative sibling uri', () => {
      const resolved = resolveAdjacentAsset('/models/chair', 'textures/wood.png');
      expect(resolved).toBe(path.resolve('/models/chair/textures/wood.png'));
    });

    it('refuses to escape the glTF directory', () => {
      expect(resolveAdjacentAsset('/models/chair', '../../../etc/passwd')).toBeNull();
      expect(resolveAdjacentAsset('/models/chair', '/etc/passwd')).toBeNull();
      expect(resolveAdjacentAsset('/models/chair', 'C:/Windows/system32')).toBeNull();
      expect(resolveAdjacentAsset('/models/chair', 'file:///etc/passwd')).toBeNull();
      expect(resolveAdjacentAsset('/models/chair', 'https://evil.example/x.png')).toBeNull();
    });

    it('ignores embedded data uris', () => {
      expect(resolveAdjacentAsset('/models/chair', 'data:image/png;base64,AAAA')).toBeNull();
    });

    it('resolves a percent-encoded traversal (encoded traversal is still traversal)', () => {
      expect(resolveAdjacentAsset('/models/chair', '%2e%2e%2f%2e%2e%2fetc%2fpasswd')).toBeNull();
    });
  });

  describe('dropped-asset approval', () => {
    it('rejects a path that does not exist', async () => {
      expect(await approveDroppedAsset(path.join(outsideDir, 'ghost.glb'))).toBe(false);
    });

    it('rejects a directory and a non-asset extension', async () => {
      const txt = path.join(outsideDir, 'notes.txt');
      await fs.writeFile(txt, 'x');

      expect(await approveDroppedAsset(outsideDir)).toBe(false);
      expect(await approveDroppedAsset(txt)).toBe(false);
      expect(await canRead(txt)).toBe(false);
    });

    it('grants READ ONLY access for a real asset file', async () => {
      const glb = path.join(outsideDir, 'chair.glb');
      await fs.writeFile(glb, 'glTF');

      expect(await approveDroppedAsset(glb)).toBe(true);
      expect(await canRead(glb)).toBe(true);

      // A drop must never yield a write primitive.
      await expect(assertWritable(glb)).rejects.toThrow(/Access denied/);
      await expect(assertWritable(path.join(outsideDir, 'new.txt'))).rejects.toThrow(/Access denied/);
    });

    it('rejects non-string input', async () => {
      expect(await approveDroppedAsset(null)).toBe(false);
      expect(await approveDroppedAsset(42)).toBe(false);
    });
  });

  describe('initAccessPolicy and root sanitization', () => {
    let originalXdgDataHome: string | undefined;

    beforeEach(() => {
      originalXdgDataHome = process.env.XDG_DATA_HOME;
      process.env.XDG_DATA_HOME = sandbox;
    });

    afterEach(() => {
      process.env.XDG_DATA_HOME = originalXdgDataHome;
    });

    it('sanitizes compounding restored prefixes and ignores ephemeral/internal roots', async () => {
      const dataDir = path.join(sandbox, 'mirage');
      await fs.mkdir(dataDir, { recursive: true });
      const accessFile = path.join(dataDir, 'access.json');

      const mockAccessJson = {
        version: 1,
        roots: [
          {
            path: '/tmp/.mount_Mirage123/resources/resources',
            scope: 'read',
            source: 'restored:restored:app-resources'
          },
          {
            path: path.join(sandbox, 'app-data-dummy'),
            scope: 'readwrite',
            source: 'app-data'
          },
          {
            path: approvedDir,
            scope: 'read',
            source: 'restored:restored:restored:open-dialog'
          }
        ]
      };
      await fs.writeFile(accessFile, JSON.stringify(mockAccessJson));

      await initAccessPolicy();

      const roots = getApprovedRoots();
      // Should not contain ephemeral AppImage mount
      expect(roots.some((r) => r.path.includes('.mount_'))).toBe(false);

      // Approved dir should have clean restored source
      const userRoot = roots.find((r) => r.path === approvedDir);
      expect(userRoot).toBeDefined();
      expect(userRoot?.source).toBe('restored:open-dialog');

      // Live user action should promote restored root
      approveDirectory(approvedDir, 'read', 'open-dialog');
      const updatedRoots = getApprovedRoots();
      const updatedUserRoot = updatedRoots.find((r) => r.path === approvedDir);
      expect(updatedUserRoot?.source).toBe('open-dialog');
    });
  });
});
