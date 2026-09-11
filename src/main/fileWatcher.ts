import chokidar, { FSWatcher } from 'chokidar';
import { BrowserWindow } from 'electron';

let watcher: FSWatcher | null = null;

export function watchFile(filePath: string, mainWindow: BrowserWindow): void {
  stopWatching();

  watcher = chokidar.watch(filePath, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100
    }
  });

  // chokidar is an EventEmitter: an 'error' event with no listener throws and
  // would take down the main process. A missing or unreadable path is expected
  // when a model is deleted from under the app, so it is reported and ignored.
  watcher.on('error', (error) => {
    console.warn('[fileWatcher] Watcher error for', filePath, error);
  });

  watcher.on('change', (changedPath) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('file:changed', changedPath);
    }
  });
}

export function stopWatching(): void {
  if (watcher) {
    // Detach listeners before closing so a late error cannot escape.
    watcher.removeAllListeners();
    void watcher.close().catch(() => {});
    watcher = null;
  }
}
