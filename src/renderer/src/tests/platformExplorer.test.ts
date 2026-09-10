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

import { openPathInSystemExplorer, isLinux } from '../../../main/platform';

describe('openPathInSystemExplorer', () => {
  let mockChild: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockChild = new EventEmitter();
    mockChild.unref = vi.fn();
    mockSpawn.mockReturnValue(mockChild);
  });

  it('returns false for invalid, empty, or whitespace paths', async () => {
    expect(await openPathInSystemExplorer('')).toBe(false);
    expect(await openPathInSystemExplorer('   ')).toBe(false);
    expect(await openPathInSystemExplorer(null as any)).toBe(false);
    expect(await openPathInSystemExplorer(undefined as any)).toBe(false);
  });

  it('spawns detached xdg-open on Linux with stdio ignored and calls unref', async () => {
    const promise = openPathInSystemExplorer('/tmp');
    const result = await promise;

    expect(result).toBe(true);
    expect(mockSpawn).toHaveBeenCalledWith(
      'xdg-open',
      ['/tmp'],
      expect.objectContaining({
        detached: true,
        stdio: 'ignore'
      })
    );
    expect(mockChild.unref).toHaveBeenCalled();
  });

  it('resolves parent folder when targetPath is a file', async () => {
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

  it('handles spawn error gracefully without crashing or freezing', async () => {
    const mockGio = new EventEmitter() as any;
    mockGio.unref = vi.fn();

    mockSpawn.mockImplementation((cmd) => {
      if (cmd === 'xdg-open') {
        process.nextTick(() => mockChild.emit('error', new Error('ENOENT')));
        return mockChild;
      }
      return mockGio;
    });

    const result = await openPathInSystemExplorer('/tmp');
    expect(result).toBe(true);
  });
});
