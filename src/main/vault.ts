import { safeStorage, app } from 'electron';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const getVaultPath = (): string => {
  return path.join(app.getPath('userData'), 'mirage_vault.enc');
};

const getLegacyVaultPath = (): string => {
  return path.join(app.getPath('userData'), 'sera_vault.enc');
};

interface VaultData {
  [key: string]: string; // scheme-prefixed, encoded secret
}

/**
 * Stored values are tagged with the scheme that produced them so retrieval
 * never has to guess. Without this, a secret written while no OS keyring was
 * available (plaintext fallback) becomes unreadable as soon as a keyring shows
 * up, and vice versa.
 */
const SCHEME_ENCRYPTED = 'enc:v1:';
const SCHEME_PLAINTEXT = 'plain:v1:';

let warnedAboutPlaintextFallback = false;

/** True when the OS keyring is usable, so secrets are really encrypted. */
export function isVaultEncryptionAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

/**
 * Reads the vault.
 *
 * A missing file is a normal first run. A *corrupt* file is not: it is moved
 * aside rather than treated as empty, because treating it as empty would make
 * the next write silently destroy every other stored secret.
 */
async function readVault(): Promise<VaultData> {
  const filePath = getVaultPath();
  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf-8');
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      // One-time migration from legacy sera_vault.enc if present
      const legacyPath = getLegacyVaultPath();
      try {
        const legacyRaw = await fs.readFile(legacyPath, 'utf-8');
        const legacyParsed = JSON.parse(legacyRaw);
        if (legacyParsed && typeof legacyParsed === 'object' && !Array.isArray(legacyParsed)) {
          await writeVault(legacyParsed as VaultData);
          console.log(`[Vault] Migrated legacy vault from ${legacyPath} to ${filePath}`);
          return legacyParsed as VaultData;
        }
      } catch (legacyErr: any) {
        if (legacyErr?.code !== 'ENOENT') {
          console.warn('[Vault] Legacy vault migration skipped (unreadable or corrupt):', legacyErr);
        }
      }
      return {};
    }
    console.warn('[Vault] Could not read vault file:', err);
    throw new Error('Credential vault could not be read');
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Vault root is not an object');
    }
    return parsed as VaultData;
  } catch (err) {
    const backupPath = `${filePath}.corrupt-${Date.now()}`;
    try {
      await fs.rename(filePath, backupPath);
      console.error(
        `[Vault] Vault file was corrupt and has been preserved at ${backupPath}. Starting with an empty vault.`
      );
    } catch (renameErr) {
      console.error('[Vault] Vault file is corrupt and could not be moved aside:', renameErr);
      throw new Error('Credential vault is damaged');
    }
    return {};
  }
}

/** Writes the vault atomically (temp file + rename). */
async function writeVault(data: VaultData): Promise<void> {
  const filePath = getVaultPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const payload = JSON.stringify(data, null, 2);
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, payload, { encoding: 'utf-8', mode: 0o600 });
  await fs.rename(tempPath, filePath);
  // rename preserves the temp file's mode, but be explicit for existing files.
  await fs.chmod(filePath, 0o600).catch(() => {});
}

export async function storeSecret(key: string, secretValue: string): Promise<boolean> {
  const vault = await readVault();

  if (isVaultEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(secretValue);
    vault[key] = `${SCHEME_ENCRYPTED}${encrypted.toString('base64')}`;
  } else {
    if (!warnedAboutPlaintextFallback) {
      warnedAboutPlaintextFallback = true;
      console.warn(
        '[Vault] No OS keyring is available (libsecret/gnome-keyring/kwallet missing?). ' +
          'Secrets will be stored obfuscated but NOT encrypted.'
      );
    }
    vault[key] = `${SCHEME_PLAINTEXT}${Buffer.from(secretValue, 'utf-8').toString('base64')}`;
  }

  await writeVault(vault);
  return true;
}

export async function retrieveSecret(key: string): Promise<string | null> {
  const vault = await readVault();
  const raw = vault[key];
  if (typeof raw !== 'string' || raw.length === 0) return null;

  try {
    if (raw.startsWith(SCHEME_ENCRYPTED)) {
      const buffer = Buffer.from(raw.slice(SCHEME_ENCRYPTED.length), 'base64');
      if (!isVaultEncryptionAvailable()) {
        console.warn(`[Vault] Secret "${key}" is encrypted but no keyring is available to read it.`);
        return null;
      }
      return safeStorage.decryptString(buffer);
    }

    if (raw.startsWith(SCHEME_PLAINTEXT)) {
      return Buffer.from(raw.slice(SCHEME_PLAINTEXT.length), 'base64').toString('utf-8');
    }

    // Legacy entry written before schemes were introduced: try to decrypt, and
    // fall back to interpreting it as plain base64.
    const buffer = Buffer.from(raw, 'base64');
    if (isVaultEncryptionAvailable()) {
      try {
        return safeStorage.decryptString(buffer);
      } catch {
        // fall through to the plaintext interpretation below
      }
    }
    return buffer.toString('utf-8');
  } catch (err) {
    console.error(`[Vault] Error retrieving secret for key "${key}":`, err);
    return null;
  }
}

export async function hasSecret(key: string): Promise<boolean> {
  const vault = await readVault();
  return typeof vault[key] === 'string' && vault[key].length > 0;
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
