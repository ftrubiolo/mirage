import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Resolves the environment handed to MCP stdio servers.
 *
 * The login shell is inspected only to discover `PATH` and other benign
 * process essentials — never to harvest the user's full environment. MCP
 * servers are third-party executables, so forwarding `SSH_AUTH_SOCK`,
 * `AWS_*`, `GITHUB_TOKEN` and friends would hand every connected server
 * credentials it has no business holding.
 *
 * Anything a server genuinely needs must be declared explicitly in
 * `mcp_config.json` under that server's `env` block.
 */
const POSIX_ENV_ALLOWLIST = [
  'PATH',
  'HOME',
  'USER',
  'LOGNAME',
  'SHELL',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'TMPDIR',
  'TZ'
];

const WINDOWS_ENV_ALLOWLIST = [
  'PATH',
  'PATHEXT',
  'SystemRoot',
  'SystemDrive',
  'COMSPEC',
  'windir',
  'TEMP',
  'TMP',
  'USERPROFILE',
  'APPDATA',
  'LOCALAPPDATA',
  'PROGRAMFILES',
  'PROGRAMFILES(X86)',
  'PROGRAMDATA',
  'NUMBER_OF_PROCESSORS',
  'OS',
  'LANG'
];

export type McpServerEnvironment = Record<string, string>;

let cachedEnv: McpServerEnvironment | null = null;
let pendingEnv: Promise<McpServerEnvironment> | null = null;

function pick(source: NodeJS.ProcessEnv, allowlist: string[]): McpServerEnvironment {
  const picked: McpServerEnvironment = {};
  const lookup = new Map(Object.keys(source).map((k) => [k.toLowerCase(), k]));
  for (const key of allowlist) {
    const actual = lookup.get(key.toLowerCase());
    if (actual === undefined) continue;
    const value = source[actual];
    if (typeof value === 'string' && value.length > 0) {
      picked[key] = value;
    }
  }
  return picked;
}

async function resolveFromLoginShell(): Promise<McpServerEnvironment> {
  const allowlist = process.platform === 'win32' ? WINDOWS_ENV_ALLOWLIST : POSIX_ENV_ALLOWLIST;
  const base = pick(process.env, allowlist);

  if (process.platform === 'win32') {
    return base;
  }

  const shell = process.env.SHELL || (process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash');
  const delimiter = '__MIRAGE_ENV_DELIMITER__';

  try {
    // Asynchronous so a slow shell rc file cannot block the main process.
    const { stdout } = await execFileAsync(
      shell,
      ['-lic', `echo "${delimiter}"; env; echo "${delimiter}"`],
      {
        encoding: 'utf-8',
        timeout: 3500,
        windowsHide: true,
        maxBuffer: 1024 * 1024
      }
    );

    const segments = stdout.split(delimiter);
    if (segments.length >= 3) {
      const parsed: NodeJS.ProcessEnv = {};
      for (const line of segments[1].trim().split('\n')) {
        const idx = line.indexOf('=');
        if (idx !== -1) {
          parsed[line.substring(0, idx)] = line.substring(idx + 1);
        }
      }

      // Only allowlisted keys survive the harvest.
      const shellPicked = pick(parsed, allowlist);
      const merged: McpServerEnvironment = { ...base, ...shellPicked };

      if (process.platform === 'darwin') {
        const defaultMacPaths = [
          '/opt/homebrew/bin',
          '/usr/local/bin',
          '/usr/bin',
          '/bin',
          '/usr/sbin',
          '/sbin'
        ];
        const current = (merged.PATH || '').split(':').filter(Boolean);
        for (const p of defaultMacPaths) {
          if (!current.includes(p)) current.unshift(p);
        }
        merged.PATH = current.join(':');
      }

      return merged;
    }
  } catch (err) {
    console.warn('[MCP] Could not resolve login shell environment, using process environment:', err);
  }

  return base;
}

/**
 * Returns the allowlisted environment for MCP servers, memoised.
 */
export function resolveLoginShellEnvironment(): Promise<McpServerEnvironment> {
  if (cachedEnv) return Promise.resolve(cachedEnv);
  if (!pendingEnv) {
    pendingEnv = resolveFromLoginShell()
      .then((env) => {
        cachedEnv = env;
        pendingEnv = null;
        return env;
      })
      .catch((err) => {
        pendingEnv = null;
        throw err;
      });
  }
  return pendingEnv;
}
