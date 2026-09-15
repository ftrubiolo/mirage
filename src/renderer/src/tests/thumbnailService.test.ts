import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { getThumbnail } from '../../../main/thumbnailService';

describe('ThumbnailService', () => {
  let tempDir: string;
  let sampleImagePath: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mirage-thumb-test-'));
    sampleImagePath = path.join(tempDir, 'sample.png');

    // Create a simple valid 10x10 RGBA PNG
    const samplePngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAFklEQVR4nGP4z8DwnxjMMKrwP10VAgCSw8c5SFqOKgAAAABJRU5ErkJggg==';
    await fs.writeFile(sampleImagePath, Buffer.from(samplePngBase64, 'base64'));
  });

  afterAll(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  it('generates a valid webp thumbnail on disk', async () => {
    const res = await getThumbnail(sampleImagePath, 96);
    expect(res).toBeDefined();
    expect(res.filePath).toMatch(/\.webp$/);

    const stat = await fs.stat(res.filePath);
    expect(stat.size).toBeGreaterThan(0);
  });

  it('returns cached thumbnail immediately on subsequent calls without regenerating', async () => {
    const res1 = await getThumbnail(sampleImagePath, 96);
    const stat1 = await fs.stat(res1.filePath);

    const res2 = await getThumbnail(sampleImagePath, 96);
    expect(res2.filePath).toBe(res1.filePath);

    const stat2 = await fs.stat(res2.filePath);
    expect(stat2.mtimeMs).toBe(stat1.mtimeMs);
  });

  it('deduplicates simultaneous in-flight requests for the same image', async () => {
    const [p1, p2] = await Promise.all([
      getThumbnail(sampleImagePath, 96),
      getThumbnail(sampleImagePath, 96)
    ]);
    expect(p1.filePath).toBe(p2.filePath);
  });

  it('throws a readable error when the source image does not exist', async () => {
    await expect(getThumbnail('/path/does/not/exist.png', 96)).rejects.toThrow();
  });
});
