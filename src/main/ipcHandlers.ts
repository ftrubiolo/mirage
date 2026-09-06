import { ipcMain, dialog, BrowserWindow, app, shell } from 'electron';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { packOrmTexture, processTextureTask, PackOrmOptions } from './texturePacker';
import { watchFile, stopWatching } from './fileWatcher';
import { getLibraryBasePath } from './platform';

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

  // --- Sera Atelier Library IPC Handlers ---

  ipcMain.handle('library:getBaseDir', async () => {
    const libDir = getLibraryBasePath();
    await fs.mkdir(libDir, { recursive: true });
    return libDir;
  });

  ipcMain.handle('library:list', async () => {
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
}
