import { z } from 'zod';

/**
 * Schemas for every privileged IPC payload.
 *
 * These are enforced in the main process, on the assumption that the renderer
 * may be compromised. Renderer-side types are a convenience, not a control.
 */

const nonEmptyString = z.string().min(1).max(4096);

/** Absolute-or-relative path string. Containment is enforced separately by accessPolicy. */
const pathString = nonEmptyString;

export const OpenFileDialogOptionsSchema = z
  .object({
    title: z.string().max(256).optional(),
    filters: z
      .array(
        z.object({
          name: z.string().max(128),
          extensions: z.array(z.string().max(32)).max(64)
        })
      )
      .max(32)
      .optional()
  })
  .optional();

export const SaveFileDialogOptionsSchema = z
  .object({
    title: z.string().max(256).optional(),
    defaultPath: pathString.optional(),
    filters: z
      .array(
        z.object({
          name: z.string().max(128),
          extensions: z.array(z.string().max(32)).max(64)
        })
      )
      .max(32)
      .optional()
  })
  .optional();

export const RelativeResourcePathSchema = z
  .string()
  .min(1)
  .max(1024)
  // No absolute paths, no traversal, no scheme, no NUL.
  .refine((v) => !v.includes('\0'), { message: 'Invalid path' })
  .refine((v) => !/^[a-zA-Z]:/.test(v) && !v.startsWith('/') && !v.startsWith('\\'), {
    message: 'Resource path must be relative'
  })
  .refine((v) => !v.split(/[\\/]/).includes('..'), { message: 'Resource path must not traverse' });

export const PackOrmOptionsSchema = z.object({
  aoPath: pathString,
  roughnessPath: pathString.optional(),
  metalnessPath: pathString.optional(),
  metalRoughnessPath: pathString.optional(),
  outputPath: pathString,
  resolution: z.number().int().min(16).max(8192).optional(),
  quality: z.number().int().min(1).max(100).optional()
});

export const TextureProcessOptionsSchema = z.object({
  task: z.enum(['packOrm', 'flipNormal', 'invertRoughness', 'convertResize', 'thumbnail']),
  inputPath: pathString.optional(),
  outputPath: pathString,
  aoPath: pathString.optional(),
  roughnessPath: pathString.optional(),
  metalnessPath: pathString.optional(),
  metalRoughnessPath: pathString.optional(),
  resolution: z.number().int().min(16).max(8192).optional(),
  quality: z.number().int().min(1).max(100).optional()
});

export const GetThumbnailSchema = z.object({
  filePath: pathString,
  size: z.number().int().min(16).max(512).optional().default(96)
});

export const CopyFileToLibrarySchema = z.object({
  entrySlug: z.string().min(1).max(128),
  sourceFilePath: pathString,
  targetType: z.string().min(1).max(128),
  ext: z.string().max(16).optional()
});

export const WriteBinaryToLibrarySchema = z.object({
  entrySlug: z.string().min(1).max(128),
  targetType: z.string().min(1).max(128),
  ext: z.string().min(1).max(16),
  buffer: z.union([z.instanceof(Uint8Array), z.instanceof(ArrayBuffer)])
});

export const RenameLibraryFileSchema = z.object({
  oldFilePath: pathString,
  newFileName: z.string().min(1).max(255)
});

export const McpServerConfigSchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string().max(256).optional(),
  type: z.enum(['stdio', 'sse']).optional(),
  command: z.string().max(1024).optional(),
  args: z.array(z.string().max(4096)).max(128).optional(),
  url: z.string().max(2048).optional(),
  env: z.record(z.string().max(128), z.string().max(8192)).optional(),
  headers: z.record(z.string().max(128), z.string().max(8192)).optional()
});

/**
 * Only http/https endpoints may be contacted. Blocks `file:`, `data:` and
 * other handlers from being reached through the provider test/fetch helpers.
 */
export const HttpUrlSchema = z
  .string()
  .min(1)
  .max(2048)
  .refine(
    (v) => {
      try {
        const u = new URL(v);
        return u.protocol === 'http:' || u.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'Only http(s) URLs are allowed' }
  );

export const AgentConnectionSchema = z.object({
  baseUrl: HttpUrlSchema,
  apiKey: z.string().max(4096).optional(),
  providerId: z.string().max(128).optional()
});

export const VaultKeySchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9._:-]+$/, {
  message: 'Invalid secret key'
});

export const VaultValueSchema = z.string().max(65536);

export const KeybindsSchema = z.record(z.string().max(128), z.string().max(64));

export const LibraryEntrySchema = z
  .object({ slug: z.string().min(1).max(128) })
  .passthrough();

export const EntrySlugSchema = z.string().min(1).max(128);

export const McpToolCallSchema = z.object({
  compositeId: z.string().min(1).max(512),
  args: z.record(z.string(), z.unknown()).optional()
});

export const SaveCustomHdrSchema = z.object({
  sourceFilePath: pathString.refine((v) => v.toLowerCase().endsWith('.hdr'), {
    message: 'Source file must have .hdr extension'
  })
});

export const DeleteCustomHdrSchema = z.object({
  fileName: z
    .string()
    .min(1)
    .max(255)
    .refine((v) => !v.includes('/') && !v.includes('\\') && !v.includes('..') && !v.includes('\0'), {
      message: 'Filename must not contain path traversal characters'
    })
    .refine((v) => v.toLowerCase().endsWith('.hdr'), {
      message: 'Filename must have .hdr extension'
    })
});

export const WatchFileSchema = pathString;

/**
 * Rejects `__proto__` / `constructor` / `prototype` keys anywhere in a payload.
 * Applied before any settings object is merged into main-process state.
 */
export const SettingsPayloadSchema = z
  .record(z.string(), z.unknown())
  .refine((value) => !containsForbiddenKeys(value), {
    message: 'Settings payload contains a forbidden key'
  });

function containsForbiddenKeys(value: unknown, depth = 0): boolean {
  if (depth > 32 || value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) {
    return value.some((item) => containsForbiddenKeys(item, depth + 1));
  }
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') return true;
    if (containsForbiddenKeys((value as Record<string, unknown>)[key], depth + 1)) return true;
  }
  return false;
}

/** Parses with a uniform, non-leaking error message. */
export function parseOrThrow<T>(schema: z.ZodType<T>, payload: unknown, label: string): T {
  const result = schema.safeParse(payload);
  if (!result.success) {
    const detail = result.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid ${label}: ${detail}`);
  }
  return result.data;
}
