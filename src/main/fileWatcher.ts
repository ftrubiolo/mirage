import chokidar, { FSWatcher } from 'chokidar';
import { BrowserWindow } from 'electron';

let watcher: FSWatcher | null = null;

export function watchFile(filePath: string, mainWindow: BrowserWindow): void {
  if (watcher) {
    watcher.close();
    watcher = null;
  }

  watcher = chokidar.watch(filePath, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100
    }
  });

  watcher.on('change', (changedPath) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('file:changed', changedPath);
    }
  });
}

export function stopWatching(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}
