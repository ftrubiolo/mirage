import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { getMirageDataDir } from './platform';

/**
 * Filesystem access policy for the main process.
 *
 * The renderer is treated as an untrusted caller: it parses hostile 3D/2D asset
 * binaries and relays text produced by remote services. Every privileged path
 * that reaches the main process is therefore resolved and checked against an
 * explicit set of roots before it is touched.
 *
 * Two scopes exist:
 *   - `read`      — the path may be read (protocol streaming, binary reads, watching)
 *   - `readwrite` — the path may be read and written
 *
 * Roots are only ever added as the result of a genuine user gesture: a native
 * open/save dialog, or a file the user dropped onto the window. Drag-and-drop
 * grants `read` only — never write — so a compromised renderer cannot use a
 * dropped path to obtain a write primitive.
 */

export type RootScope = 'read' | 'readwrite';

export interface ApprovedRoot {
  path: string;
  scope: RootScope;
  /** Where the grant came from, for diagnostics. */
  source: string;
}

/** Asset extensions a dropped file may use to seed a read grant. */
const DROPPABLE_ASSET_EXTENSIONS = new Set([
  '.glb', '.gltf', '.bin', '.fbx', '.obj', '.usdz', '.usdc', '.usd',
  '.webp', '.png', '.jpg', '.jpeg', '.avif', '.ktx2', '.basis',
  '.hdr', '.exr', '.tga', '.bmp', '.dds'
]);

let roots: ApprovedRoot[] = [];
let initialized = false;
let persistTimer: NodeJS.Timeout | null = null;

const isWindows = process.platform === 'win32';

const accessFilePath = (): string => path.join(getMirageDataDir(), 'access.json');

/**
 * Case-insensitive comparison on Windows/macOS, case-sensitive elsewhere.
 */
function samePath(a: string, b: string): boolean {
  return isWindows ? a.toLowerCase() === b.toLowerCase() : a === b;
}

/**
 * True when `child` is `parent` itself or lives underneath it.
 *
 * Uses `path.relative` rather than a string prefix test so that `/data/models-evil`
 * is not mistaken for a child of `/data/models`.
 */
export function isInside(child: string, parent: string): boolean {
  if (!child || !parent) return false;
  const rel = path.relative(parent, child);
  if (rel === '') return true;
  if (rel.startsWith('..')) return false;
  if (path.isAbsolute(rel)) return false;
  return true;
}

/**
 * Resolves symlinks where possible. Falls back to lexical normalization for
 * paths that do not exist yet (writes to a new file).
 */
export async function resolveReal(target: string): Promise<string> {
  const resolved = path.resolve(target);
  try {
    return await fs.realpath(resolved);
  } catch {
    // Path does not exist yet: resolve the deepest existing ancestor so that a
    // symlinked parent directory cannot be used to escape a root.
    let dir = path.dirname(resolved);
    const tail: string[] = [path.basename(resolved)];
    for (let i = 0; i < 40; i++) {
      try {
        const realDir = await fs.realpath(dir);
        return path.join(realDir, ...tail.reverse());
      } catch {
        const parent = path.dirname(dir);
        if (parent === dir) break;
        tail.push(path.basename(dir));
        dir = parent;
      }
    }
    return resolved;
  }
}

function addRootSync(rootPath: string, scope: RootScope, source: string): void {
  const normalized = path.resolve(rootPath);
  const existing = roots.find((r) => samePath(r.path, normalized));

  if (existing) {
    // Never downgrade a readwrite grant to read.
    if (scope === 'readwrite' && existing.scope === 'read') {
      existing.scope = 'readwrite';
      existing.source = source;
      schedulePersist();
    }
    return;
  }

  roots.push({ path: normalized, scope, source });
  schedulePersist();
}

/**
 * Grants access to a directory. Called for native dialog results and drops.
 */
export function approveDirectory(dirPath: string, scope: RootScope, source: string): void {
  if (!dirPath || typeof dirPath !== 'string') return;
  addRootSync(dirPath, scope, source);
}

/**
 * Gratuitous self-access: the app's own data, bundled resources and scratch dir.
 */
export function grantInternalRoots(): void {
  addRootSync(getMirageDataDir(), 'readwrite', 'app-data');
  addRootSync(path.join(os.tmpdir(), 'mirage'), 'readwrite', 'app-temp');

  const resourceCandidates = [
    path.join(process.resourcesPath || '', 'resources'),
    path.resolve(process.cwd(), 'resources')
  ];
  for (const candidate of resourceCandidates) {
    if (candidate && candidate !== 'resources') {
      addRootSync(candidate, 'read', 'app-resources');
    }
  }
}

export function getApprovedRoots(): ApprovedRoot[] {
  return roots.map((r) => ({ ...r }));
}

function schedulePersist(): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    void persistRoots();
  }, 250);
}

async function persistRoots(): Promise<void> {
  persistTimer = null;
  try {
    const dir = getMirageDataDir();
    await fs.mkdir(dir, { recursive: true });
    const payload = JSON.stringify({ version: 1, roots }, null, 2);
    const tmp = path.join(dir, 'access.json.tmp');
    await fs.writeFile(tmp, payload, 'utf-8');
    await fs.rename(tmp, accessFilePath());
  } catch (err) {
    console.warn('[AccessPolicy] Could not persist access roots:', err);
  }
}

/**
 * Restores roots granted in earlier sessions. Only `read` grants for
 * user-chosen locations are restored, so a stale entry can never widen write
 * access.
 */
export async function initAccessPolicy(): Promise<void> {
  if (initialized) return;
  initialized = true;

  grantInternalRoots();

  try {
    const raw = await fs.readFile(accessFilePath(), 'utf-8');
    const parsed = JSON.parse(raw) as { version?: number; roots?: ApprovedRoot[] };
    if (parsed?.version === 1 && Array.isArray(parsed.roots)) {
      for (const root of parsed.roots) {
        if (!root?.path || typeof root.path !== 'string') continue;
        // Downgrade anything restored from disk to read-only. Persisted write
        // grants are re-established by the next save dialog instead.
        addRootSync(root.path, 'read', `restored:${root.source || 'unknown'}`);
      }
    }
  } catch {
    // No stored grants yet, or unreadable: internal roots are enough to boot.
  }
}

/** Throws when `target` may not be read. */
export async function assertReadable(target: string, label = 'path'): Promise<string> {
  if (typeof target !== 'string' || target.length === 0) {
    throw new Error(`Invalid ${label}: expected a non-empty string`);
  }
  const real = await resolveReal(target);
  const allowed = roots.some((r) => isInside(real, r.path));
  if (!allowed) {
    throw new Error(`Access denied: ${label} is outside every approved location`);
  }
  return real;
}

/** Throws when `target` may not be written. */
export async function assertWritable(target: string, label = 'path'): Promise<string> {
  if (typeof target !== 'string' || target.length === 0) {
    throw new Error(`Invalid ${label}: expected a non-empty string`);
  }
  const real = await resolveReal(target);
  const allowed = roots.some((r) => r.scope === 'readwrite' && isInside(real, r.path));
  if (!allowed) {
    throw new Error(`Access denied: ${label} is outside every writable location`);
  }
  return real;
}

/** Non-throwing read check, for the protocol handler. */
export async function canRead(target: string): Promise<boolean> {
  try {
    await assertReadable(target);
    return true;
  } catch {
    return false;
  }
}

/** Asserts every provided path is readable, skipping empty/optional entries. */
export async function assertAllReadable(targets: Array<string | undefined | null>): Promise<void> {
  for (const target of targets) {
    if (typeof target === 'string' && target.length > 0) {
      await assertReadable(target);
    }
  }
}

/** Asserts every provided path is writable, skipping empty/optional entries. */
export async function assertAllWritable(targets: Array<string | undefined | null>): Promise<void> {
  for (const target of targets) {
    if (typeof target === 'string' && target.length > 0) {
      await assertWritable(target);
    }
  }
}

/**
 * Joins an untrusted segment onto a trusted base, refusing anything that would
 * escape it. This is the replacement for bare `path.join(base, userInput)`.
 */
export function safeJoin(base: string, untrusted: string, label = 'path'): string {
  if (typeof untrusted !== 'string' || untrusted.length === 0) {
    throw new Error(`Invalid ${label}: expected a non-empty string`);
  }
  // Reject absolute segments and drive-qualified segments outright.
  if (path.isAbsolute(untrusted) || /^[a-zA-Z]:/.test(untrusted)) {
    throw new Error(`Invalid ${label}: absolute paths are not allowed here`);
  }
  const joined = path.resolve(base, untrusted);
  if (!isInside(joined, path.resolve(base))) {
    throw new Error(`Invalid ${label}: escapes its container`);
  }
  return joined;
}

const SLUG_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

/** Validates a library entry slug: no separators, no traversal, no dotfiles. */
export function assertSafeSlug(slug: unknown): string {
  if (typeof slug !== 'string' || !SLUG_PATTERN.test(slug)) {
    throw new Error('Invalid entry slug');
  }
  if (slug.includes('..')) {
    throw new Error('Invalid entry slug');
  }
  return slug;
}

/** Validates a bare file name (no directories). */
export function assertSafeFileName(name: unknown): string {
  if (typeof name !== 'string' || name.length === 0 || name.length > 255) {
    throw new Error('Invalid file name');
  }
  if (name.includes('/') || name.includes('\\') || name.includes('\0')) {
    throw new Error('Invalid file name: must not contain path separators');
  }
  if (name === '.' || name === '..') {
    throw new Error('Invalid file name');
  }
  return name;
}

/**
 * Restricts a glTF-adjacent asset URI (buffer/image `uri`) so it cannot point
 * outside the directory of the glTF that references it.
 */
export function resolveAdjacentAsset(sourceDir: string, uri: string): string | null {
  if (typeof uri !== 'string' || uri.length === 0) return null;
  if (uri.startsWith('data:')) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(uri)) return null; // absolute URL / scheme
  let decoded = uri;
  try {
    decoded = decodeURIComponent(uri);
  } catch {
    // Keep the raw value; it will simply fail containment below if malformed.
  }
  if (path.isAbsolute(decoded) || /^[a-zA-Z]:/.test(decoded)) return null;
  const resolved = path.resolve(sourceDir, decoded);
  if (!isInside(resolved, path.resolve(sourceDir))) return null;
  return resolved;
}

/**
 * Validates a dropped path and, if it looks like an asset file, grants
 * read-only access to its containing directory. Write access is never granted
 * this way.
 */
export async function approveDroppedAsset(candidate: unknown): Promise<boolean> {
  if (typeof candidate !== 'string' || candidate.length === 0) return false;

  const resolved = path.resolve(candidate);
  const ext = path.extname(resolved).toLowerCase();
  if (!DROPPABLE_ASSET_EXTENSIONS.has(ext)) return false;

  try {
    const stat = await fs.stat(resolved);
    if (!stat.isFile()) return false;
  } catch {
    return false;
  }

  approveDirectory(path.dirname(resolved), 'read', 'drop');
  return true;
}
