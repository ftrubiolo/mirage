import { contextBridge, ipcRenderer, webUtils } from 'electron';

export interface PackOrmOptions {
  aoPath: string;
  roughnessPath?: string;
  metalnessPath?: string;
  metalRoughnessPath?: string;
  outputPath: string;
  resolution?: number;
  quality?: number;
}

export interface FileInfo {
  exists: boolean;
  size: number;
  name: string;
  ext: string;
}

export interface TextureProcessOptions {
  task: 'packOrm' | 'flipNormal' | 'invertRoughness' | 'convertResize';
  inputPath?: string;
  outputPath: string;
  aoPath?: string;
  roughnessPath?: string;
  metalnessPath?: string;
  metalRoughnessPath?: string;
  resolution?: number;
  quality?: number;
}

export interface ElectronAPI {
  openFileDialog: (options?: { filters?: { name: string; extensions: string[] }[]; title?: string }) => Promise<string | null>;
  openDirectoryDialog: () => Promise<string | null>;
  saveFileDialog: (options?: { defaultPath?: string; filters?: { name: string; extensions: string[] }[]; title?: string }) => Promise<string | null>;
  writeFile: (filePath: string, content: string) => Promise<boolean>;
  writeBinaryFile: (filePath: string, buffer: Uint8Array | ArrayBuffer) => Promise<boolean>;
  getFileInfo: (filePath: string) => Promise<FileInfo>;
  watchFile: (filePath: string) => Promise<boolean>;
  stopWatching: () => Promise<boolean>;
  packOrmTexture: (options: PackOrmOptions) => Promise<string>;
  processTexture: (options: TextureProcessOptions) => Promise<string>;
  getResourcePath: (relativePath: string) => Promise<string>;
  toAssetUrl: (filePath: string) => string;
  getPathForFile: (file: File) => string;
  onFileChanged: (callback: (filePath: string) => void) => () => void;
  // Library methods
  getLibraryPath: () => Promise<string>;
  listLibraryEntries: () => Promise<any[]>;
  saveLibraryEntry: (entry: any) => Promise<boolean>;
  copyFileToLibrary: (options: { entrySlug: string; sourceFilePath: string; targetType: string; ext?: string }) => Promise<{ filePath: string; fileName: string; fileSize: number }>;
  writeBinaryToLibrary: (options: { entrySlug: string; targetType: string; ext: string; buffer: Uint8Array | ArrayBuffer }) => Promise<{ filePath: string; fileName: string; fileSize: number }>;
  deleteLibraryEntry: (entrySlug: string) => Promise<boolean>;
  renameLibraryFile: (options: { oldFilePath: string; newFileName: string }) => Promise<{ filePath: string; fileName: string; fileSize: number }>;
  openPathInExplorer: (targetPath: string) => Promise<boolean>;
}

const api: ElectronAPI = {
  openFileDialog: (options) => ipcRenderer.invoke('dialog:openFile', options),
  openDirectoryDialog: () => ipcRenderer.invoke('dialog:openDirectory'),
  saveFileDialog: (options) => ipcRenderer.invoke('dialog:saveFile', options),
  writeFile: (filePath, content) => ipcRenderer.invoke('fs:writeFile', filePath, content),
  writeBinaryFile: (filePath, buffer) => ipcRenderer.invoke('fs:writeBinaryFile', filePath, buffer),
  getFileInfo: (filePath) => ipcRenderer.invoke('fs:getFileInfo', filePath),
  watchFile: (filePath) => ipcRenderer.invoke('watcher:watch', filePath),
  stopWatching: () => ipcRenderer.invoke('watcher:stop'),
  packOrmTexture: (options) => ipcRenderer.invoke('texture:packOrm', options),
  processTexture: (options) => ipcRenderer.invoke('texture:process', options),
  getResourcePath: (relativePath) => ipcRenderer.invoke('app:getResourcePath', relativePath),
  getLibraryPath: () => ipcRenderer.invoke('library:getBaseDir'),
  listLibraryEntries: () => ipcRenderer.invoke('library:list'),
  saveLibraryEntry: (entry) => ipcRenderer.invoke('library:saveEntry', entry),
  copyFileToLibrary: (options) => ipcRenderer.invoke('library:copyFile', options),
  writeBinaryToLibrary: (options) => ipcRenderer.invoke('library:writeBinary', options),
  deleteLibraryEntry: (entrySlug) => ipcRenderer.invoke('library:deleteEntry', entrySlug),
  renameLibraryFile: (options) => ipcRenderer.invoke('library:renameFile', options),
  openPathInExplorer: (targetPath) => ipcRenderer.invoke('shell:openPath', targetPath),
  toAssetUrl: (filePath: string) => {
    if (!filePath) return '';
    if (
      filePath.startsWith('local-asset:') ||
      filePath.startsWith('data:') ||
      filePath.startsWith('blob:') ||
      filePath.startsWith('http:') ||
      filePath.startsWith('https:')
    ) {
      return filePath;
    }
    // Normalize Windows backslashes to forward slashes
    const forwardSlashed = filePath.replace(/\\/g, '/');
    const cleanPath = forwardSlashed.replace(/^\/+/, '');
    return `local-asset:///${cleanPath}`;
  },
  getPathForFile: (file: File) => {
    try {
      return webUtils.getPathForFile(file);
    } catch {
      return (file as unknown as { path?: string }).path || '';
    }
  },
  onFileChanged: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, filePath: string) => callback(filePath);
    ipcRenderer.on('file:changed', handler);
    return () => {
      ipcRenderer.removeListener('file:changed', handler);
    };
  }
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', api);
  } catch (error) {
    console.error('Failed to expose electronAPI:', error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electronAPI = api;
}
