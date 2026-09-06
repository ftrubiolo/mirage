import { protocol, net } from 'electron';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isWindows } from './platform';

/**
 * Resolves any `local-asset://` URL into an absolute, normalized local filesystem path
 * handling cross-platform differences (Windows drive letters, Chromium host collapsing on POSIX,
 * percent-encoding, query parameters like ?t=...).
 */
export function resolveAssetUrlToPath(requestUrl: string): string {
  let u: URL;
  try {
    u = new URL(requestUrl);
  } catch {
    const raw = decodeURIComponent(requestUrl.replace(/^local-asset:\/\//i, ''));
    return path.resolve(raw);
  }

  const rawPathname = decodeURIComponent(u.pathname || '');
  const rawHost = decodeURIComponent(u.host || u.hostname || '');

  // Windows single-letter drive hostname (e.g. local-asset://c/Users/... or local-asset://C:/Users/...)
  if (rawHost && rawHost.length <= 2 && /^[a-zA-Z]:?$/.test(rawHost)) {
    const driveLetter = rawHost.replace(':', '').toUpperCase();
    const cleanPath = rawPathname.startsWith('/') ? rawPathname : `/${rawPathname}`;
    const combined = `${driveLetter}:${cleanPath}`;
    return isWindows ? path.win32.normalize(combined) : combined;
  }

  // Windows standard drive in pathname (e.g. local-asset:///C:/Users/... or /C:/Users/...)
  if (/^\/?[a-zA-Z]:/.test(rawPathname)) {
    const winPath = rawPathname.startsWith('/') ? rawPathname.slice(1) : rawPathname;
    return isWindows ? path.win32.normalize(winPath) : winPath;
  }

  // Windows UNC or Windows path when isWindows is true
  if (isWindows) {
    if (rawHost) {
      return path.win32.normalize(`\\\\${rawHost}${rawPathname}`);
    }
    return path.win32.normalize(rawPathname);
  }

  // POSIX (Linux / macOS): Reconstruct full path whether host was captured or not
  let posixPath = '';
  if (rawHost) {
    posixPath = `/${rawHost}${rawPathname.startsWith('/') ? rawPathname : `/${rawPathname}`}`;
  } else {
    posixPath = rawPathname.startsWith('/') ? rawPathname : `/${rawPathname}`;
  }

  return path.posix.normalize(posixPath);
}

export function registerLocalAssetProtocol(): void {
  protocol.handle('local-asset', async (request) => {
    try {
      const finalFilePath = resolveAssetUrlToPath(request.url);
      const fileUrl = pathToFileURL(finalFilePath).toString();
      return await net.fetch(fileUrl);
    } catch (err) {
      console.error('[protocol:local-asset] Failed to fetch:', request.url, err);
      return new Response(`Failed to load asset: ${err}`, { status: 404 });
    }
  });
}
