import { ipcMain, dialog, BrowserWindow, app, shell } from 'electron';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { packOrmTexture, processTextureTask, PackOrmOptions } from './texturePacker';
import { getThumbnail } from './thumbnailService';
import { watchFile, stopWatching } from './fileWatcher';
import {
  getLibraryBasePath,
  getMirageDataDir,
  getLegacyMirageDataDir,
  getKeybindsPath,
  getSettingsPath,
  openPathInSystemExplorer
} from './platform';
import { storeSecret, retrieveSecret, hasSecret, deleteSecret } from './vault';
import { MCPClientManager, McpServerConfig } from './mcp/MCPClientManager';
import { SettingsService } from './settingsService';
import {
  approveDirectory,
  approveDroppedAsset,
  assertAllReadable,
  assertReadable,
  assertSafeFileName,
  assertSafeSlug,
  assertWritable,
  canRead,
  isInside,
  resolveAdjacentAsset,
  safeJoin
} from './accessPolicy';
import {
  AgentConnectionSchema,
  CopyFileToLibrarySchema,
  EntrySlugSchema,
  GetThumbnailSchema,
  KeybindsSchema,
  LibraryEntrySchema,
  McpServerConfigSchema,
  McpToolCallSchema,
  OpenFileDialogOptionsSchema,
  PackOrmOptionsSchema,
  RelativeResourcePathSchema,
  RenameLibraryFileSchema,
  SaveFileDialogOptionsSchema,
  SettingsPayloadSchema,
  TextureProcessOptionsSchema,
  VaultKeySchema,
  VaultValueSchema,
  WatchFileSchema,
  WriteBinaryToLibrarySchema,
  parseOrThrow
} from './ipcSchemas';

let mcpManager: MCPClientManager | null = null;
let ipcRegistered = false;
let targetWindow: BrowserWindow | null = null;

/**
 * Points the IPC handlers at the current window. Handlers are registered once
 * per process (ipcMain is global), so the window is tracked separately rather
 * than captured in closures.
 */
export function setTargetWindow(win: BrowserWindow | null): void {
  targetWindow = win;
}

/**
 * Flushes pending settings and stops child processes. Awaited from
 * `before-quit` so a debounced settings write is not lost.
 */
export async function shutdownIpcResources(): Promise<void> {
  stopWatching();
  try {
    await SettingsService.getInstance().flush();
  } catch (err) {
    console.warn('[Main] Could not flush settings during shutdown:', err);
  }
  if (mcpManager) {
    try {
      await mcpManager.shutdownAll();
    } catch (err) {
      console.warn('[Main] Could not shut down MCP servers:', err);
    }
  }
}

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  targetWindow = mainWindow;

  // ipcMain is process-global: registering twice would throw for every channel.
  if (ipcRegistered) return;
  ipcRegistered = true;

  // Created here rather than at import time so it runs after `app.whenReady()`
  // (the constructor reads `app.getPath('userData')`).
  mcpManager = new MCPClientManager();
  mcpManager.initialize().catch((err) => console.warn('[Main] MCPClientManager init error:', err));
  const mcp = mcpManager;

  // Open file dialog
  ipcMain.handle('dialog:openFile', async (_event, options: unknown) => {
    const parsed = parseOrThrow(OpenFileDialogOptionsSchema, options, 'openFile options');
    const dialogOptions = {
      title: parsed?.title || 'Seleccionar archivo',
      properties: ['openFile' as const],
      filters: parsed?.filters
    };
    const result = targetWindow
      ? await dialog.showOpenDialog(targetWindow, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    // The user picked this location: grant read access to it.
    const selected = result.filePaths[0];
    approveDirectory(path.dirname(selected), 'read', 'open-dialog');
    return selected;
  });

  // Open directory dialog
  ipcMain.handle('dialog:openDirectory', async () => {
    const dialogOptions = {
      title: 'Seleccionar carpeta',
      properties: ['openDirectory' as const]
    };
    const result = targetWindow
      ? await dialog.showOpenDialog(targetWindow, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    const selected = result.filePaths[0];
    approveDirectory(selected, 'read', 'open-dialog');
    return selected;
  });

  // Save file dialog
  ipcMain.handle('dialog:saveFile', async (_event, options: unknown) => {
    const parsed = parseOrThrow(SaveFileDialogOptionsSchema, options, 'saveFile options');
    const dialogOptions = {
      title: parsed?.title || 'Guardar archivo',
      defaultPath: parsed?.defaultPath,
      filters: parsed?.filters
    };
    const result = targetWindow
      ? await dialog.showSaveDialog(targetWindow, dialogOptions)
      : await dialog.showSaveDialog(dialogOptions);
    if (result.canceled || !result.filePath) {
      return null;
    }
    // The user chose this destination: grant read/write access to its folder.
    approveDirectory(path.dirname(result.filePath), 'readwrite', 'save-dialog');
    return result.filePath;
  });

  // Registers a path the user dropped onto the window. Grants read-only access
  // to the containing folder, and only for recognised asset extensions.
  ipcMain.handle('fs:approveDroppedPath', async (_event, droppedPath: unknown) => {
    return approveDroppedAsset(droppedPath);
  });

  // File write (text)
  ipcMain.handle('fs:writeFile', async (_event, filePath: unknown, content: unknown) => {
    if (typeof content !== 'string') {
      throw new Error('Invalid content: expected a string');
    }
    const target = await assertWritable(String(filePath), 'filePath');
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content, 'utf-8');
    return true;
  });

  // Binary file write (for Canvas WebP / packed buffers)
  ipcMain.handle('fs:writeBinaryFile', async (_event, filePath: unknown, buffer: unknown) => {
    if (!(buffer instanceof Uint8Array) && !(buffer instanceof ArrayBuffer)) {
      throw new Error('Invalid buffer: expected binary data');
    }
    const target = await assertWritable(String(filePath), 'filePath');
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, Buffer.from(buffer as ArrayBuffer));
    return true;
  });

  // Binary file read (raw direct disk read)
  ipcMain.handle('fs:readBinaryFile', async (_event, filePath: unknown) => {
    const target = await assertReadable(String(filePath), 'filePath');
    const buf = await fs.readFile(target);
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  });

  // File stat / size
  ipcMain.handle('fs:getFileInfo', async (_event, filePath: unknown) => {
    try {
      const target = await assertReadable(String(filePath), 'filePath');
      const stat = await fs.stat(target);
      return {
        exists: true,
        size: stat.size,
        name: path.basename(target),
        ext: path.extname(target).toLowerCase()
      };
    } catch {
      // Unreadable or denied: reported the same as missing, leaking nothing.
      return { exists: false, size: 0, name: '', ext: '' };
    }
  });

  // Watch file for live reloading
  ipcMain.handle('watcher:watch', async (_event, filePath: unknown) => {
    const requested = parseOrThrow(WatchFileSchema, filePath, 'filePath');
    const target = await assertReadable(requested, 'filePath');
    if (!targetWindow) return false;
    watchFile(target, targetWindow);
    return true;
  });

  ipcMain.handle('watcher:stop', () => {
    stopWatching();
    return true;
  });

  // Fallback ORM packing handler (safe wrapped)
  ipcMain.handle('texture:packOrm', async (_event, options: unknown) => {
    try {
      const parsed = parseOrThrow(PackOrmOptionsSchema, options, 'packOrm options');
      await assertAllReadable([
        parsed.aoPath,
        parsed.roughnessPath,
        parsed.metalnessPath,
        parsed.metalRoughnessPath
      ]);
      await assertWritable(parsed.outputPath, 'outputPath');
      return await packOrmTexture(parsed as PackOrmOptions);
    } catch (err: any) {
      console.error('[ipcMain texture:packOrm] Error:', err);
      throw new Error(`Error empaquetando textura: ${err?.message || err}`);
    }
  });

  // Universal texture processor (flipNormal, invertRoughness, convertResize, packOrm)
  ipcMain.handle('texture:process', async (_event, options: unknown) => {
    try {
      const parsed = parseOrThrow(TextureProcessOptionsSchema, options, 'texture options');
      await assertAllReadable([
        parsed.inputPath,
        parsed.aoPath,
        parsed.roughnessPath,
        parsed.metalnessPath,
        parsed.metalRoughnessPath
      ]);
      await assertWritable(parsed.outputPath, 'outputPath');
      return await processTextureTask(parsed);
    } catch (err: any) {
      console.error('[ipcMain texture:process] Error:', err);
      throw new Error(`Error procesando textura: ${err?.message || err}`);
    }
  });

  // High-performance background thumbnail generator with persistent disk caching
  ipcMain.handle('thumbnail:get', async (_event, options: unknown) => {
    try {
      const parsed = parseOrThrow(GetThumbnailSchema, options, 'thumbnail options');
      await assertReadable(parsed.filePath, 'thumbnail source filePath');
      const targetSize = parsed.size || 96;
      return await getThumbnail(parsed.filePath, targetSize);
    } catch (err: any) {
      console.error('[ipcMain thumbnail:get] Error:', err);
      throw new Error(`Error generando miniatura: ${err?.message || err}`);
    }
  });

  // Get bundled resource path (e.g. offline city HDR)
  ipcMain.handle('app:getResourcePath', (_event, relativePath: unknown) => {
    const relative = parseOrThrow(RelativeResourcePathSchema, relativePath, 'resource path');
    const base = app.isPackaged
      ? path.join(process.resourcesPath, 'resources')
      : path.resolve(process.cwd(), 'resources');
    // safeJoin rejects absolute segments and traversal; the schema already
    // rejects `..`, so this is defence in depth.
    return safeJoin(base, relative, 'resource path');
  });

async function ensureMirageDir(): Promise<void> {
  const mirageDir = getMirageDataDir();
  try {
    await fs.access(mirageDir);
  } catch {
    // Check if legacy directory exists (mirage-sera)
    const legacyDir = getLegacyMirageDataDir();
    try {
      await fs.access(legacyDir);
      try {
        await fs.rename(legacyDir, mirageDir);
        console.log(`[Mirage] Migrated legacy directory from ${legacyDir} to ${mirageDir}`);
        return;
      } catch {
        await fs.cp(legacyDir, mirageDir, { recursive: true });
        console.log(`[Mirage] Copied legacy directory from ${legacyDir} to ${mirageDir}`);
        return;
      }
    } catch {
      // Legacy directory does not exist either
    }
    await fs.mkdir(mirageDir, { recursive: true });
  }
}

const DEFAULT_KEYBINDS: Record<string, string> = {
  'camera.iso': '0',
  'camera.front': '1',
  'camera.right': '3',
  'camera.top': '7',
  'camera.back': 'Ctrl+1',
  'camera.left': 'Ctrl+3',
  'camera.bottom': 'Ctrl+7',
  'camera.reset': 'F',
  'camera.toggleOrthographic': '5',
  'view.toggleGrid': 'G',
  'view.toggleDimensions': 'D',
  'view.toggleAutoRotate': 'Space',
  'view.toggleWireframe': 'Z',
  'view.toggleContactShadows': 'C',
  'view.toggleBackground': 'B',
  'lighting.presetStudio': 'Alt+1',
  'lighting.presetNatural': 'Alt+2',
  'lighting.presetDramatic': 'Alt+3',
  'lighting.presetTechnical': 'Alt+4'
};


  // --- Mirage Atelier Library IPC Handlers ---

  ipcMain.handle('library:getBaseDir', async () => {
    await ensureMirageDir();
    const libDir = getLibraryBasePath();
    await fs.mkdir(libDir, { recursive: true });
    return libDir;
  });

  ipcMain.handle('library:list', async () => {
    await ensureMirageDir();
    const libDir = getLibraryBasePath();
    await fs.mkdir(libDir, { recursive: true });
    const dirEntries = await fs.readdir(libDir, { withFileTypes: true });
    const items: any[] = [];
    for (const d of dirEntries) {
      if (!d.isDirectory()) continue;
      // Ignore anything that is not a plainly-named entry directory.
      try {
        assertSafeSlug(d.name);
      } catch {
        continue;
      }
      const itemFile = path.join(libDir, d.name, 'entry.json');
      try {
        const content = await fs.readFile(itemFile, 'utf-8');
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          items.push(parsed);
        }
      } catch {
        // not a valid entry directory
      }
    }
    items.sort(
      (a, b) =>
        new Date(b?.updatedAt || b?.createdAt || 0).getTime() -
        new Date(a?.updatedAt || a?.createdAt || 0).getTime()
    );
    return items;
  });

  ipcMain.handle('library:saveEntry', async (_event, entry: unknown) => {
    const parsed = parseOrThrow(LibraryEntrySchema, entry, 'library entry');
    const slug = assertSafeSlug(parsed.slug);
    const libDir = getLibraryBasePath();
    const entryDir = safeJoin(libDir, slug, 'entry slug');
    await fs.mkdir(entryDir, { recursive: true });
    const jsonPath = path.join(entryDir, 'entry.json');
    await fs.writeFile(jsonPath, JSON.stringify(entry, null, 2), 'utf-8');
    return true;
  });

  ipcMain.handle('library:copyFile', async (_event, options: unknown) => {
    const parsed = parseOrThrow(CopyFileToLibrarySchema, options, 'copyFile options');
    const slug = assertSafeSlug(parsed.entrySlug);
    const sourcePath = await assertReadable(parsed.sourceFilePath, 'sourceFilePath');

    const libDir = getLibraryBasePath();
    const entryDir = safeJoin(libDir, slug, 'entry slug');
    await fs.mkdir(entryDir, { recursive: true });

    const originalExt = parsed.ext || path.extname(sourcePath) || '.bin';
    const cleanExt = originalExt.startsWith('.') ? originalExt : `.${originalExt}`;
    const fileName = assertSafeFileName(`${slug}_${parsed.targetType}${cleanExt}`);
    const destPath = safeJoin(entryDir, fileName, 'destination file name');

    await fs.copyFile(sourcePath, destPath);

    // If it is a .gltf JSON file, inspect its buffers and images to copy adjacent assets
    if (cleanExt.toLowerCase() === '.gltf') {
      try {
        const gltfContent = await fs.readFile(sourcePath, 'utf-8');
        const gltfData = JSON.parse(gltfContent);
        const sourceDir = path.dirname(sourcePath);

        const copyAdjacent = async (uri: unknown, kind: string) => {
          // Resolve strictly inside the source directory: a crafted glTF must
          // not be able to make the app read or write outside its own folder.
          const src = resolveAdjacentAsset(sourceDir, String(uri ?? ''));
          if (!src) {
            console.warn(`[ipcMain copyFile] Skipped unsafe gltf ${kind} uri:`, uri);
            return;
          }
          const rel = path.relative(sourceDir, src);
          const dest = safeJoin(entryDir, rel, `gltf ${kind} destination`);
          try {
            await fs.mkdir(path.dirname(dest), { recursive: true });
            await fs.copyFile(src, dest);
          } catch (err) {
            console.warn(`[ipcMain copyFile] Could not copy gltf ${kind}:`, src, err);
          }
        };

        if (Array.isArray(gltfData.buffers)) {
          for (const buffer of gltfData.buffers) {
            if (buffer?.uri && !String(buffer.uri).startsWith('data:')) {
              await copyAdjacent(buffer.uri, 'buffer');
            }
          }
        }

        if (Array.isArray(gltfData.images)) {
          for (const img of gltfData.images) {
            if (img?.uri && !String(img.uri).startsWith('data:')) {
              await copyAdjacent(img.uri, 'image');
            }
          }
        }
      } catch (gltfErr) {
        console.warn('[ipcMain copyFile] Error parsing gltf dependencies:', gltfErr);
      }
    }

    const stat = await fs.stat(destPath);
    return {
      filePath: destPath,
      fileName,
      fileSize: stat.size
    };
  });

  ipcMain.handle('library:writeBinary', async (_event, options: unknown) => {
    const parsed = parseOrThrow(WriteBinaryToLibrarySchema, options, 'writeBinary options');
    const slug = assertSafeSlug(parsed.entrySlug);

    const libDir = getLibraryBasePath();
    const entryDir = safeJoin(libDir, slug, 'entry slug');
    await fs.mkdir(entryDir, { recursive: true });

    const cleanExt = parsed.ext.startsWith('.') ? parsed.ext : `.${parsed.ext}`;
    const fileName = assertSafeFileName(`${slug}_${parsed.targetType}${cleanExt}`);
    const destPath = safeJoin(entryDir, fileName, 'destination file name');

    await fs.writeFile(destPath, Buffer.from(parsed.buffer as ArrayBuffer));
    const stat = await fs.stat(destPath);
    return {
      filePath: destPath,
      fileName,
      fileSize: stat.size
    };
  });

  ipcMain.handle('library:deleteEntry', async (_event, entrySlug: unknown) => {
    const slug = assertSafeSlug(parseOrThrow(EntrySlugSchema, entrySlug, 'entry slug'));
    const libDir = getLibraryBasePath();
    const entryDir = safeJoin(libDir, slug, 'entry slug');
    // Never delete the library root itself, even if the slug somehow resolved to it.
    if (path.resolve(entryDir) === path.resolve(libDir)) {
      throw new Error('Refusing to delete the library root');
    }
    await fs.rm(entryDir, { recursive: true, force: true });
    return true;
  });

  ipcMain.handle('library:renameFile', async (_event, options: unknown) => {
    const parsed = parseOrThrow(RenameLibraryFileSchema, options, 'renameFile options');
    const oldPath = await assertWritable(parsed.oldFilePath, 'oldFilePath');
    const newName = assertSafeFileName(parsed.newFileName);
    const newFilePath = safeJoin(path.dirname(oldPath), newName, 'new file name');

    if (oldPath === newFilePath) {
      const stat = await fs.stat(newFilePath);
      return { filePath: newFilePath, fileName: newName, fileSize: stat.size };
    }
    await fs.rename(oldPath, newFilePath);
    const stat = await fs.stat(newFilePath);
    return {
      filePath: newFilePath,
      fileName: newName,
      fileSize: stat.size
    };
  });

  ipcMain.handle('shell:openPath', async (_event, targetPath: unknown) => {
    // Only reveal locations the app is already allowed to read.
    const target = await assertReadable(String(targetPath), 'targetPath');
    return openPathInSystemExplorer(target);
  });

  // --- Hardware-Encrypted Vault IPC Handlers ---
  ipcMain.handle('vault:setSecret', async (_event, key: unknown, val: unknown) => {
    const safeKey = parseOrThrow(VaultKeySchema, key, 'secret key');
    const safeVal = parseOrThrow(VaultValueSchema, val, 'secret value');
    return storeSecret(safeKey, safeVal);
  });

  ipcMain.handle('vault:getSecret', async (_event, key: unknown) => {
    return retrieveSecret(parseOrThrow(VaultKeySchema, key, 'secret key'));
  });

  ipcMain.handle('vault:hasSecret', async (_event, key: unknown) => {
    return hasSecret(parseOrThrow(VaultKeySchema, key, 'secret key'));
  });

  ipcMain.handle('vault:deleteSecret', async (_event, key: unknown) => {
    return deleteSecret(parseOrThrow(VaultKeySchema, key, 'secret key'));
  });

  // --- Model Context Protocol (MCP) IPC Handlers ---
  mcp.onChange(() => {
    if (targetWindow && !targetWindow.isDestroyed()) {
      targetWindow.webContents.send('mcp:serversChanged', mcp.getServerStatuses());
      targetWindow.webContents.send('mcp:toolsChanged', mcp.getAllTools());
    }
  });

  ipcMain.handle('mcp:listServers', async () => {
    return mcp.getServerStatuses();
  });

  ipcMain.handle('mcp:connectServer', async (_event, config: unknown) => {
    const parsed = parseOrThrow(McpServerConfigSchema, config, 'MCP server config') as McpServerConfig;

    if (!parsed.command && !parsed.url) {
      throw new Error('Invalid MCP server config: a command or URL is required');
    }

    // The renderer may only connect servers the user declared on disk.
    if (!(await mcp.isDeclaredServer(parsed))) {
      throw new Error(
        'Access denied: this MCP server is not declared in mcp_config.json'
      );
    }

    return mcp.connectServer(parsed);
  });

  ipcMain.handle('mcp:disconnectServer', async (_event, serverId: unknown) => {
    return mcp.disconnectServer(parseOrThrow(EntrySlugSchema, serverId, 'server id'));
  });

  ipcMain.handle('mcp:listTools', async () => {
    return mcp.getAllTools();
  });

  ipcMain.handle('mcp:callTool', async (_event, payload: unknown) => {
    const parsed = parseOrThrow(McpToolCallSchema, payload, 'MCP tool call');
    return mcp.callTool(parsed.compositeId, parsed.args || {});
  });

  // --- Agent Connection Test & Model Fetch Handlers ---
  ipcMain.handle('agent:fetchModels', async (_event, payload: unknown) => {
    const { baseUrl, apiKey } = parseOrThrow(AgentConnectionSchema, payload, 'agent request');
    const cleanUrl = baseUrl.replace(/\/+$/, '');

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(`${cleanUrl}/models`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const data = await response.json();
        const modelList: string[] = [];
        if (Array.isArray(data.data)) {
          for (const m of data.data) {
            if (m && typeof m.id === 'string') modelList.push(m.id);
          }
        } else if (Array.isArray(data.models)) {
          for (const m of data.models) {
            if (m && typeof m.name === 'string') modelList.push(m.name);
            else if (m && typeof m.model === 'string') modelList.push(m.model);
          }
        }
        modelList.sort((a, b) => a.localeCompare(b));
        return { success: true, models: modelList };
      } else {
        const errorText = await response.text().catch(() => '');
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText.slice(0, 150) || response.statusText}`
        };
      }
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Error de conexión'
      };
    }
  });

  ipcMain.handle('agent:testConnection', async (_event, payload: unknown) => {
    const { baseUrl, apiKey } = parseOrThrow(AgentConnectionSchema, payload, 'agent request');
    const cleanUrl = baseUrl.replace(/\/+$/, '');

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      // First try /models endpoint
      const response = await fetch(`${cleanUrl}/models`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(8000)
      });

      if (response.ok) {
        const data = await response.json();
        const modelList: string[] = [];
        if (Array.isArray(data.data)) {
          for (const m of data.data) {
            if (m && typeof m.id === 'string') modelList.push(m.id);
          }
        } else if (Array.isArray(data.models)) {
          for (const m of data.models) {
            if (m && typeof m.name === 'string') modelList.push(m.name);
          }
        }
        return { success: true, models: modelList };
      } else {
        const errorText = await response.text().catch(() => '');
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText.slice(0, 150) || response.statusText}`
        };
      }
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Error de conexión o tiempo de espera agotado'
      };
    }
  });

  // --- Keybinds and Settings IPC Handlers (.local/share/mirage/) ---

  ipcMain.handle('keybinds:load', async () => {
    await ensureMirageDir();
    const filePath = getKeybindsPath();
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      const loaded = JSON.parse(raw);
      return { ...DEFAULT_KEYBINDS, ...loaded };
    } catch {
      await fs.writeFile(filePath, JSON.stringify(DEFAULT_KEYBINDS, null, 2), 'utf-8');
      return DEFAULT_KEYBINDS;
    }
  });

  ipcMain.handle('keybinds:save', async (_event, keybinds: unknown) => {
    const parsed = parseOrThrow(KeybindsSchema, keybinds, 'keybinds');
    await ensureMirageDir();
    const filePath = getKeybindsPath();
    await fs.writeFile(filePath, JSON.stringify(parsed, null, 2), 'utf-8');
    return true;
  });

  ipcMain.handle('keybinds:getPath', () => {
    return getKeybindsPath();
  });

  // --- Settings Persistence via SettingsService (Atomic, debounced, mutex-serialized) ---
  const settingsService = SettingsService.getInstance();

  const handleSettingsLoad = async () => {
    await ensureMirageDir();
    return settingsService.loadSettings();
  };

  const handleSettingsSave = async (_event: any, settings: unknown) => {
    await ensureMirageDir();
    // Rejects non-objects and any `__proto__` / `constructor` / `prototype` key
    // before the payload is deep-merged into main-process state.
    const parsed = parseOrThrow(SettingsPayloadSchema, settings, 'settings payload');
    return settingsService.saveSettings(parsed);
  };

  const handleSettingsUpdate = async (_event: any, partial: unknown) => {
    await ensureMirageDir();
    const parsed = parseOrThrow(SettingsPayloadSchema, partial, 'settings payload');
    return settingsService.updateSettings(parsed);
  };

  const handleSettingsGetPath = () => {
    return settingsService.getSettingsPath();
  };

  ipcMain.handle('settings:load', handleSettingsLoad);
  ipcMain.handle('mirage:settings:load', handleSettingsLoad);

  ipcMain.handle('settings:save', handleSettingsSave);
  ipcMain.handle('mirage:settings:save', handleSettingsSave);

  ipcMain.handle('settings:update', handleSettingsUpdate);
  ipcMain.handle('mirage:settings:update', handleSettingsUpdate);

  ipcMain.handle('settings:getPath', handleSettingsGetPath);
  ipcMain.handle('mirage:settings:getPath', handleSettingsGetPath);
}

