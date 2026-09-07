import { ipcMain, dialog, BrowserWindow, app, shell } from 'electron';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { packOrmTexture, processTextureTask, PackOrmOptions } from './texturePacker';
import { watchFile, stopWatching } from './fileWatcher';
import {
  getLibraryBasePath,
  getMirageDataDir,
  getLegacyMirageDataDir,
  getKeybindsPath,
  getSettingsPath
} from './platform';
import { storeSecret, retrieveSecret, hasSecret, deleteSecret } from './vault';
import { MCPClientManager, McpServerConfig } from './mcp/MCPClientManager';

const mcpManager = new MCPClientManager();
mcpManager.initialize().catch((err) => console.warn('[Main] MCPClientManager init error:', err));

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  // Open file dialog
  ipcMain.handle('dialog:openFile', async (_event, options: { filters?: { name: string; extensions: string[] }[]; title?: string }) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: options?.title || 'Seleccionar archivo',
      properties: ['openFile'],
      filters: options?.filters
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  // Open directory dialog
  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Seleccionar carpeta',
      properties: ['openDirectory']
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  // Save file dialog
  ipcMain.handle('dialog:saveFile', async (_event, options: { defaultPath?: string; filters?: { name: string; extensions: string[] }[]; title?: string }) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: options?.title || 'Guardar archivo',
      defaultPath: options?.defaultPath,
      filters: options?.filters
    });
    if (result.canceled || !result.filePath) {
      return null;
    }
    return result.filePath;
  });

  // File write (text)
  ipcMain.handle('fs:writeFile', async (_event, filePath: string, content: string) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
    return true;
  });

  // Binary file write (for Canvas WebP / packed buffers)
  ipcMain.handle('fs:writeBinaryFile', async (_event, filePath: string, buffer: Uint8Array | ArrayBuffer) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, Buffer.from(buffer as ArrayBuffer));
    return true;
  });

  // File stat / size
  ipcMain.handle('fs:getFileInfo', async (_event, filePath: string) => {
    try {
      const stat = await fs.stat(filePath);
      return {
        exists: true,
        size: stat.size,
        name: path.basename(filePath),
        ext: path.extname(filePath).toLowerCase()
      };
    } catch {
      return { exists: false, size: 0, name: '', ext: '' };
    }
  });

  // Watch file for live reloading
  ipcMain.handle('watcher:watch', (_event, filePath: string) => {
    watchFile(filePath, mainWindow);
    return true;
  });

  ipcMain.handle('watcher:stop', () => {
    stopWatching();
    return true;
  });

  // Fallback ORM packing handler (safe wrapped)
  ipcMain.handle('texture:packOrm', async (_event, options: PackOrmOptions) => {
    try {
      return await packOrmTexture(options);
    } catch (err: any) {
      console.error('[ipcMain texture:packOrm] Error:', err);
      throw new Error(`Error empaquetando textura: ${err?.message || err}`);
    }
  });

  // Universal texture processor (flipNormal, invertRoughness, convertResize, packOrm)
  ipcMain.handle('texture:process', async (_event, options: any) => {
    try {
      return await processTextureTask(options);
    } catch (err: any) {
      console.error('[ipcMain texture:process] Error:', err);
      throw new Error(`Error procesando textura: ${err?.message || err}`);
    }
  });

  // Get bundled resource path (e.g. offline city HDR)
  ipcMain.handle('app:getResourcePath', (_event, relativePath: string) => {
    const isDev = !app.isPackaged;
    if (isDev) {
      return path.resolve(process.cwd(), 'resources', relativePath);
    }
    return path.join(process.resourcesPath, 'resources', relativePath);
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

const DEFAULT_SETTINGS = {
  themeMode: 'dark',
  fontDensity: 'standard',
  defaultContactShadows: true,
  defaultGroundGrid: true,
  defaultAutoRotate: false,
  defaultExportFormat: 'webp',
  viewport: {
    viewportTheme: 'dark',
    environmentPreset: 'city',
    lightingPreset: 'studio',
    sunAzimuth: 45,
    sunElevation: 45,
    keyLightIntensity: 1.2,
    ambientLightIntensity: 0.6,
    fillLightIntensity: 0.4,
    environmentIntensity: 1.0,
    directionalShadows: true,
    contactShadowOpacity: 0.4,
    cameraFov: 50,
    isOrthographic: false
  }
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
      if (d.isDirectory()) {
        const itemFile = path.join(libDir, d.name, 'entry.json');
        try {
          const content = await fs.readFile(itemFile, 'utf-8');
          items.push(JSON.parse(content));
        } catch {
          // not a valid entry directory
        }
      }
    }
    items.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
    return items;
  });

  ipcMain.handle('library:saveEntry', async (_event, entry: any) => {
    if (!entry?.slug) {
      throw new Error('El slug de la pieza es requerido');
    }
    const libDir = getLibraryBasePath();
    const entryDir = path.join(libDir, entry.slug);
    await fs.mkdir(entryDir, { recursive: true });
    const jsonPath = path.join(entryDir, 'entry.json');
    await fs.writeFile(jsonPath, JSON.stringify(entry, null, 2), 'utf-8');
    return true;
  });

  ipcMain.handle('library:copyFile', async (_event, options: { entrySlug: string; sourceFilePath: string; targetType: string; ext?: string }) => {
    const libDir = getLibraryBasePath();
    const entryDir = path.join(libDir, options.entrySlug);
    await fs.mkdir(entryDir, { recursive: true });

    const originalExt = options.ext || path.extname(options.sourceFilePath) || '.bin';
    const cleanExt = originalExt.startsWith('.') ? originalExt : `.${originalExt}`;
    const fileName = `${options.entrySlug}_${options.targetType}${cleanExt}`;
    const destPath = path.join(entryDir, fileName);

    await fs.copyFile(options.sourceFilePath, destPath);

    // If it is a .gltf JSON file, inspect its buffers and images to copy adjacent assets
    if (cleanExt.toLowerCase() === '.gltf') {
      try {
        const gltfContent = await fs.readFile(options.sourceFilePath, 'utf-8');
        const gltfData = JSON.parse(gltfContent);
        const sourceDir = path.dirname(options.sourceFilePath);

        // Copy buffers
        if (Array.isArray(gltfData.buffers)) {
          for (const buffer of gltfData.buffers) {
            if (buffer.uri && !buffer.uri.startsWith('data:')) {
              const srcBuf = path.join(sourceDir, buffer.uri);
              const destBuf = path.join(entryDir, buffer.uri);
              try {
                await fs.mkdir(path.dirname(destBuf), { recursive: true });
                await fs.copyFile(srcBuf, destBuf);
              } catch (bErr) {
                console.warn('[ipcMain copyFile] Could not copy gltf buffer:', srcBuf, bErr);
              }
            }
          }
        }

        // Copy images referenced in glTF
        if (Array.isArray(gltfData.images)) {
          for (const img of gltfData.images) {
            if (img.uri && !img.uri.startsWith('data:')) {
              const srcImg = path.join(sourceDir, img.uri);
              const destImg = path.join(entryDir, img.uri);
              try {
                await fs.mkdir(path.dirname(destImg), { recursive: true });
                await fs.copyFile(srcImg, destImg);
              } catch (iErr) {
                console.warn('[ipcMain copyFile] Could not copy gltf image:', srcImg, iErr);
              }
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

  ipcMain.handle('library:writeBinary', async (_event, options: { entrySlug: string; targetType: string; ext: string; buffer: Uint8Array | ArrayBuffer }) => {
    const libDir = getLibraryBasePath();
    const entryDir = path.join(libDir, options.entrySlug);
    await fs.mkdir(entryDir, { recursive: true });

    const cleanExt = options.ext.startsWith('.') ? options.ext : `.${options.ext}`;
    const fileName = `${options.entrySlug}_${options.targetType}${cleanExt}`;
    const destPath = path.join(entryDir, fileName);

    await fs.writeFile(destPath, Buffer.from(options.buffer as ArrayBuffer));
    const stat = await fs.stat(destPath);
    return {
      filePath: destPath,
      fileName,
      fileSize: stat.size
    };
  });

  ipcMain.handle('library:deleteEntry', async (_event, entrySlug: string) => {
    const libDir = getLibraryBasePath();
    const entryDir = path.join(libDir, entrySlug);
    await fs.rm(entryDir, { recursive: true, force: true });
    return true;
  });

  ipcMain.handle('library:renameFile', async (_event, options: { oldFilePath: string; newFileName: string }) => {
    const dir = path.dirname(options.oldFilePath);
    const newFilePath = path.join(dir, options.newFileName);
    if (options.oldFilePath === newFilePath) {
      const stat = await fs.stat(newFilePath);
      return { filePath: newFilePath, fileName: options.newFileName, fileSize: stat.size };
    }
    await fs.rename(options.oldFilePath, newFilePath);
    const stat = await fs.stat(newFilePath);
    return {
      filePath: newFilePath,
      fileName: options.newFileName,
      fileSize: stat.size
    };
  });

  ipcMain.handle('shell:openPath', async (_event, targetPath: string) => {
    await shell.openPath(targetPath);
    return true;
  });

  // --- Hardware-Encrypted Vault IPC Handlers ---
  ipcMain.handle('vault:setSecret', async (_event, key: string, val: string) => {
    return storeSecret(key, val);
  });

  ipcMain.handle('vault:getSecret', async (_event, key: string) => {
    return retrieveSecret(key);
  });

  ipcMain.handle('vault:hasSecret', async (_event, key: string) => {
    return hasSecret(key);
  });

  ipcMain.handle('vault:deleteSecret', async (_event, key: string) => {
    return deleteSecret(key);
  });

  // --- Model Context Protocol (MCP) IPC Handlers ---
  mcpManager.onChange(() => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('mcp:serversChanged', mcpManager.getServerStatuses());
      mainWindow.webContents.send('mcp:toolsChanged', mcpManager.getAllTools());
    }
  });

  ipcMain.handle('mcp:listServers', async () => {
    return mcpManager.getServerStatuses();
  });

  ipcMain.handle('mcp:connectServer', async (_event, config: McpServerConfig) => {
    return mcpManager.connectServer(config);
  });

  ipcMain.handle('mcp:disconnectServer', async (_event, serverId: string) => {
    return mcpManager.disconnectServer(serverId);
  });

  ipcMain.handle('mcp:listTools', async () => {
    return mcpManager.getAllTools();
  });

  ipcMain.handle('mcp:callTool', async (_event, payload: { compositeId: string; args: Record<string, unknown> }) => {
    return mcpManager.callTool(payload.compositeId, payload.args || {});
  });

  // --- Agent Connection Test & Model Fetch Handlers ---
  ipcMain.handle('agent:fetchModels', async (_event, payload: { baseUrl: string; apiKey?: string }) => {
    const { baseUrl, apiKey } = payload;
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

  ipcMain.handle('agent:testConnection', async (_event, payload: { baseUrl: string; apiKey?: string; providerId: string }) => {
    const { baseUrl, apiKey } = payload;
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

  ipcMain.handle('keybinds:save', async (_event, keybinds: Record<string, string>) => {
    await ensureMirageDir();
    const filePath = getKeybindsPath();
    await fs.writeFile(filePath, JSON.stringify(keybinds, null, 2), 'utf-8');
    return true;
  });

  ipcMain.handle('keybinds:getPath', () => {
    return getKeybindsPath();
  });

  ipcMain.handle('settings:load', async () => {
    await ensureMirageDir();
    const filePath = getSettingsPath();
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      const loaded = JSON.parse(raw);
      return {
        ...DEFAULT_SETTINGS,
        ...loaded,
        viewport: {
          ...DEFAULT_SETTINGS.viewport,
          ...(loaded.viewport || {})
        }
      };
    } catch {
      await fs.writeFile(filePath, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
      return DEFAULT_SETTINGS;
    }
  });

  ipcMain.handle('settings:save', async (_event, settings: any) => {
    await ensureMirageDir();
    const filePath = getSettingsPath();
    await fs.writeFile(filePath, JSON.stringify(settings, null, 2), 'utf-8');
    return true;
  });

  ipcMain.handle('settings:getPath', () => {
    return getSettingsPath();
  });
}

