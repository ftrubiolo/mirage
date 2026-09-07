import { execFileSync } from 'node:child_process';

let cachedEnv: NodeJS.ProcessEnv | null = null;

export function resolveLoginShellEnvironment(): NodeJS.ProcessEnv {
  if (cachedEnv) return cachedEnv;

  if (process.platform === 'win32') {
    cachedEnv = { ...process.env };
    return cachedEnv;
  }

  const shell = process.env.SHELL || (process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash');
  const delimiter = '__ENV_DELIMITER__';

  try {
    const raw = execFileSync(shell, ['-lic', `echo "${delimiter}"; env; echo "${delimiter}"`], {
      encoding: 'utf-8',
      timeout: 3500,
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 1024 * 1024
    });

    const segments = raw.split(delimiter);
    if (segments.length >= 3) {
      const parsed: NodeJS.ProcessEnv = {};
      for (const line of segments[1].trim().split('\n')) {
        const idx = line.indexOf('=');
        if (idx !== -1) {
          const k = line.substring(0, idx);
          const v = line.substring(idx + 1);
          parsed[k] = v;
        }
      }

      if (process.platform === 'darwin') {
        const defaultMacPaths = ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin'];
        const current = (parsed.PATH || '').split(':');
        for (const p of defaultMacPaths) {
          if (!current.includes(p)) current.unshift(p);
        }
        parsed.PATH = current.join(':');
      }

      cachedEnv = { ...process.env, ...parsed };
      return cachedEnv;
    }
  } catch (err) {
    console.warn('[MCP] Could not resolve interactive login shell env, falling back to process.env:', err);
  }

  cachedEnv = { ...process.env };
  return cachedEnv;
}
