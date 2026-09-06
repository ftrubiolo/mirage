/**
 * Browser-safe cross-platform path utilities for Mirage Renderer.
 * Handles both Windows ('\') and POSIX ('/') paths uniformly without requiring Node.js 'path'.
 */

/**
 * Normalizes all backslashes to forward slashes and collapses redundant separators.
 */
export function normalizePath(p: string): string {
  if (!p) return '';
  const forward = p.replace(/\\/g, '/');
  // Collapse duplicate slashes except at the very beginning (for UNC / protocol paths)
  return forward.replace(/([^:])\/+/g, '$1/');
}

/**
 * Extracts the base filename from any path (Windows or POSIX).
 */
export function getFileName(p: string): string {
  if (!p) return '';
  const normalized = normalizePath(p);
  const parts = normalized.split('/');
  return parts.pop() || '';
}

/**
 * Extracts the file extension (including leading '.') in lowercase.
 */
export function getFileExt(p: string): string {
  const fileName = getFileName(p);
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return '';
  return fileName.slice(lastDot).toLowerCase();
}

/**
 * Extracts the directory name of a path.
 */
export function getDirName(p: string): string {
  if (!p) return '';
  const normalized = normalizePath(p);
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash === -1) return '';
  if (lastSlash === 0) return '/';
  return normalized.slice(0, lastSlash);
}

/**
 * Safely joins path segments using forward slashes.
 */
export function joinPath(...segments: string[]): string {
  const filtered = segments.filter(Boolean).map((s) => normalizePath(s));
  if (filtered.length === 0) return '';
  return filtered
    .map((seg, idx) => {
      let clean = seg;
      if (idx > 0) clean = clean.replace(/^\/+/, '');
      if (idx < filtered.length - 1) clean = clean.replace(/\/+$/, '');
      return clean;
    })
    .filter(Boolean)
    .join('/');
}

/**
 * Checks if a given filePath contains a specific folder segment or is a subpath of a directory.
 */
export function isPathInside(filePath: string, folderNameOrDir: string): boolean {
  if (!filePath || !folderNameOrDir) return false;
  const normFile = normalizePath(filePath).toLowerCase();
  const normFolder = normalizePath(folderNameOrDir).toLowerCase().replace(/^\/+|\/+$/g, '');
  return normFile.includes(`/${normFolder}/`) || normFile.endsWith(`/${normFolder}`) || normFile.startsWith(`${normFolder}/`);
}
