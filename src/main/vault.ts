import { safeStorage, app } from 'electron';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const getVaultPath = (): string => {
  return path.join(app.getPath('userData'), 'sera_vault.enc');
};

interface VaultData {
  [key: string]: string; // base64-encoded encrypted string
}

async function readVault(): Promise<VaultData> {
  const filePath = getVaultPath();
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeVault(data: VaultData): Promise<void> {
  const filePath = getVaultPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function storeSecret(key: string, secretValue: string): Promise<boolean> {
  const vault = await readVault();

  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(secretValue);
    vault[key] = encrypted.toString('base64');
  } else {
    // Fallback if OS keychain is unavailable
    vault[key] = Buffer.from(secretValue, 'utf-8').toString('base64');
  }

  await writeVault(vault);
  return true;
}

export async function retrieveSecret(key: string): Promise<string | null> {
  const vault = await readVault();
  const raw = vault[key];
  if (!raw) return null;

  try {
    const buffer = Buffer.from(raw, 'base64');
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(buffer);
    } else {
      return buffer.toString('utf-8');
    }
  } catch (err) {
    console.error(`[Vault] Error retrieving secret for key "${key}":`, err);
    return null;
  }
}

export async function hasSecret(key: string): Promise<boolean> {
  const vault = await readVault();
  return Boolean(vault[key]);
}

export async function deleteSecret(key: string): Promise<boolean> {
  const vault = await readVault();
  if (key in vault) {
    delete vault[key];
    await writeVault(vault);
    return true;
  }
  return false;
}
