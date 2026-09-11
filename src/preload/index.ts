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
  readBinaryFile: (filePath: string) => Promise<Uint8Array>;
  getFileInfo: (filePath: string) => Promise<FileInfo>;
  watchFile: (filePath: string) => Promise<boolean>;
  stopWatching: () => Promise<boolean>;
  packOrmTexture: (options: PackOrmOptions) => Promise<string>;
  processTexture: (options: TextureProcessOptions) => Promise<string>;
  getResourcePath: (relativePath: string) => Promise<string>;
  toAssetUrl: (filePath: string) => string;
  getPathForFile: (file: File) => string;
  approveDroppedPath: (filePath: string) => Promise<boolean>;
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
  // Vault methods (Encrypted Keychain storage)
  setSecret: (key: string, val: string) => Promise<boolean>;
  getSecret: (key: string) => Promise<string | null>;
  hasSecret: (key: string) => Promise<boolean>;
  deleteSecret: (key: string) => Promise<boolean>;
  // MCP methods
  listMcpServers: () => Promise<any[]>;
  connectMcpServer: (config: any) => Promise<boolean>;
  disconnectMcpServer: (serverId: string) => Promise<boolean>;
  listMcpTools: () => Promise<any[]>;
  callMcpTool: (compositeId: string, args?: Record<string, unknown>) => Promise<any>;
  onMcpServersChanged: (callback: (servers: any[]) => void) => () => void;
  onMcpToolsChanged: (callback: (tools: any[]) => void) => () => void;
  // Agent Connection & Model Fetch
  testAgentConnection: (params: { baseUrl: string; apiKey?: string; providerId: string }) => Promise<{ success: boolean; error?: string; models?: string[] }>;
  fetchAgentModels: (params: { baseUrl: string; apiKey?: string }) => Promise<{ success: boolean; error?: string; models?: string[] }>;
  // Keybinds & Settings methods (.local/share/mirage/)
  loadKeybinds: () => Promise<Record<string, string>>;
  saveKeybinds: (keybinds: Record<string, string>) => Promise<boolean>;
  getKeybindsPath: () => Promise<string>;
  loadSettings: () => Promise<any>;
  saveSettings: (settings: any) => Promise<boolean>;
  /**
   * Merges a partial settings object in the main process. Preferred over
   * `saveSettings` for anything that only owns part of the document: the merge
   * happens in main under a mutex, so two callers cannot clobber each other.
   */
  updateSettings: (partial: Record<string, unknown>) => Promise<{ success: boolean; settings: any }>;
  getSettingsPath: () => Promise<string>;
}

const api: ElectronAPI = {
  openFileDialog: (options) => ipcRenderer.invoke('dialog:openFile', options),
  openDirectoryDialog: () => ipcRenderer.invoke('dialog:openDirectory'),
  saveFileDialog: (options) => ipcRenderer.invoke('dialog:saveFile', options),
  writeFile: (filePath, content) => ipcRenderer.invoke('fs:writeFile', filePath, content),
  writeBinaryFile: (filePath, buffer) => ipcRenderer.invoke('fs:writeBinaryFile', filePath, buffer),
  readBinaryFile: (filePath) => ipcRenderer.invoke('fs:readBinaryFile', filePath),
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
  setSecret: (key, val) => ipcRenderer.invoke('vault:setSecret', key, val),
  getSecret: (key) => ipcRenderer.invoke('vault:getSecret', key),
  hasSecret: (key) => ipcRenderer.invoke('vault:hasSecret', key),
  deleteSecret: (key) => ipcRenderer.invoke('vault:deleteSecret', key),
  listMcpServers: () => ipcRenderer.invoke('mcp:listServers'),
  connectMcpServer: (config) => ipcRenderer.invoke('mcp:connectServer', config),
  disconnectMcpServer: (serverId) => ipcRenderer.invoke('mcp:disconnectServer', serverId),
  listMcpTools: () => ipcRenderer.invoke('mcp:listTools'),
  callMcpTool: (compositeId, args) => ipcRenderer.invoke('mcp:callTool', { compositeId, args }),
  onMcpServersChanged: (callback) => {
    const handler = (_e: any, servers: any[]) => callback(servers);
    ipcRenderer.on('mcp:serversChanged', handler);
    return () => ipcRenderer.removeListener('mcp:serversChanged', handler);
  },
  onMcpToolsChanged: (callback) => {
    const handler = (_e: any, tools: any[]) => callback(tools);
    ipcRenderer.on('mcp:toolsChanged', handler);
    return () => ipcRenderer.removeListener('mcp:toolsChanged', handler);
  },
  testAgentConnection: (params) => ipcRenderer.invoke('agent:testConnection', params),
  fetchAgentModels: (params) => ipcRenderer.invoke('agent:fetchModels', params),
  loadKeybinds: () => ipcRenderer.invoke('keybinds:load'),
  saveKeybinds: (keybinds) => ipcRenderer.invoke('keybinds:save', keybinds),
  getKeybindsPath: () => ipcRenderer.invoke('keybinds:getPath'),
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  updateSettings: (partial) => ipcRenderer.invoke('settings:update', partial),
  getSettingsPath: () => ipcRenderer.invoke('settings:getPath'),
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
  approveDroppedPath: (filePath: string) => ipcRenderer.invoke('fs:approveDroppedPath', filePath),
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
