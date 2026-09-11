import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';

const mockSpawn = vi.fn();

vi.mock('node:child_process', () => ({
  default: { spawn: (...args: any[]) => mockSpawn(...args) },
  spawn: (...args: any[]) => mockSpawn(...args)
}));

vi.mock('child_process', () => ({
  default: { spawn: (...args: any[]) => mockSpawn(...args) },
  spawn: (...args: any[]) => mockSpawn(...args)
}));

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => `/mock/${name}`),
    commandLine: {
      appendSwitch: vi.fn()
    }
  },
  shell: {
    openPath: vi.fn().mockResolvedValue('')
  }
}));

import { openPathInSystemExplorer } from '../../../main/platform';

/**
 * A ChildProcess double.
 *
 * The outcome is emitted *when a listener is attached* rather than on a timer,
 * because `openPathInSystemExplorer` performs async work before it spawns —
 * a `process.nextTick` emission would fire before the handler subscribes and
 * the event would be lost.
 */
const makeChild = (mode: 'spawn' | 'error' = 'spawn') => {
  const child: any = new EventEmitter();
  child.unref = vi.fn();

  const originalOnce = child.once.bind(child);
  child.once = (event: string, listener: (...args: any[]) => void) => {
    const registration = originalOnce(event, listener);
    if (event === mode && (event === 'spawn' || event === 'error')) {
      process.nextTick(() => {
        if (event === 'spawn') child.emit('spawn');
        else child.emit('error', new Error('ENOENT'));
      });
    }
    return registration;
  };

  return child;
};

describe('openPathInSystemExplorer', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns false for invalid, empty, or whitespace paths', async () => {
    expect(await openPathInSystemExplorer('')).toBe(false);
    expect(await openPathInSystemExplorer('   ')).toBe(false);
    expect(await openPathInSystemExplorer(null as any)).toBe(false);
    expect(await openPathInSystemExplorer(undefined as any)).toBe(false);
  });

  it('spawns detached xdg-open on Linux with stdio ignored and calls unref', async () => {
    const child = makeChild('spawn');
    mockSpawn.mockReturnValue(child);

    const result = await openPathInSystemExplorer('/tmp');

    expect(result).toBe(true);
    expect(mockSpawn).toHaveBeenCalledWith(
      'xdg-open',
      ['/tmp'],
      expect.objectContaining({
        detached: true,
        stdio: 'ignore'
      })
    );
    expect(child.unref).toHaveBeenCalled();
  });

  it('resolves parent folder when targetPath is a file', async () => {
    mockSpawn.mockReturnValue(makeChild('spawn'));

    // /etc/hosts is a standard file on linux
    const result = await openPathInSystemExplorer('/etc/hosts');

    expect(result).toBe(true);
    expect(mockSpawn).toHaveBeenCalledWith(
      'xdg-open',
      ['/etc'],
      expect.objectContaining({
        detached: true,
        stdio: 'ignore'
      })
    );
  });

  it('falls back to gio when xdg-open fails to spawn', async () => {
    const failingChild = makeChild('error');
    const gioChild = makeChild('spawn');

    mockSpawn.mockImplementation((cmd: string) => (cmd === 'xdg-open' ? failingChild : gioChild));

    const result = await openPathInSystemExplorer('/tmp');

    expect(result).toBe(true);
    expect(mockSpawn).toHaveBeenCalledWith(
      'gio',
      ['open', '/tmp'],
      expect.objectContaining({ detached: true })
    );
  });

  it('reports failure when both xdg-open and gio cannot spawn', async () => {
    mockSpawn.mockImplementation(() => makeChild('error'));

    // The previous implementation resolved `true` immediately after spawn(),
    // before the error was observed — reporting success for a launcher that
    // never started.
    const result = await openPathInSystemExplorer('/tmp');
    expect(result).toBe(false);
  });
});
