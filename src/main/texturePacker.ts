import { spawn } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { app } from 'electron';

export interface PackOrmOptions {
  task?: 'packOrm';
  aoPath: string;
  roughnessPath?: string;
  metalnessPath?: string;
  metalRoughnessPath?: string; // glTF standard: Green = Rough, Blue = Metal
  outputPath: string;
  resolution?: number; // Default: 2048
  quality?: number; // Default: 90
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

/**
 * Executes Sharp texture processing inside an isolated Node.js process to avoid
 * the GLib / libvips assertion collisions that occur inside Electron on Linux.
 */
export async function processTextureTask(options: TextureProcessOptions): Promise<string> {
  const isDev = !app.isPackaged;
  const workerScript = isDev
    ? path.resolve(process.cwd(), 'resources', 'scripts', 'sharpWorker.cjs')
    : path.join(process.resourcesPath, 'resources', 'scripts', 'sharpWorker.cjs');

  await fs.mkdir(path.dirname(options.outputPath), { recursive: true });

  return new Promise((resolve, reject) => {
    const nodeModulesPath = isDev
      ? path.resolve(process.cwd(), 'node_modules')
      : path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules');

    const child = spawn(process.execPath, [workerScript, JSON.stringify(options)], {
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        NODE_PATH: `${nodeModulesPath}${path.delimiter}${process.env.NODE_PATH || ''}`
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      reject(new Error(`No se pudo ejecutar el proceso de procesamiento (Node.js): ${err.message}`));
    });

    child.on('close', (code) => {
      if (code === 0) {
        try {
          const res = JSON.parse(stdout.trim());
          if (res.success) {
            resolve(res.outputPath);
          } else {
            reject(new Error(res.error || 'Error desconocido al procesar'));
          }
        } catch {
          // Unparseable stdout: verify the work actually landed on disk rather
          // than reporting success on the strength of the exit code alone.
          fs.stat(options.outputPath)
            .then((stat) => {
              if (stat.size > 0) {
                resolve(options.outputPath);
              } else {
                reject(new Error(`El proceso no produjo salida: ${stderr || stdout}`));
              }
            })
            .catch(() =>
              reject(new Error(`No se pudo verificar la salida del proceso: ${stderr || stdout}`))
            );
        }
      } else {
        reject(new Error(`Proceso falló con código ${code}: ${stderr || stdout}`));
      }
    });
  });
}

export async function packOrmTexture(options: PackOrmOptions): Promise<string> {
  return processTextureTask({ ...options, task: 'packOrm' });
}

