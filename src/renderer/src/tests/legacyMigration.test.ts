import { describe, it, expect, beforeEach } from 'vitest';
import { readMigratedStorage } from '../utils/storageMigration';
import { normalizeCategory, normalizeStatus, migrateEntrySchema } from '../utils/entryMigration';

describe('Backward-Compatible Debranding Migrations', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('readMigratedStorage', () => {
    it('migrates legacy sera-* key to mirage-* key and deletes the legacy key', () => {
      localStorage.setItem('sera-app-settings', JSON.stringify({ themeMode: 'light' }));

      const value = readMigratedStorage('mirage-app-settings', 'sera-app-settings');

      expect(value).toBe(JSON.stringify({ themeMode: 'light' }));
      expect(localStorage.getItem('mirage-app-settings')).toBe(JSON.stringify({ themeMode: 'light' }));
      expect(localStorage.getItem('sera-app-settings')).toBeNull();
    });

    it('prefers current mirage-* key without overwriting from legacy key', () => {
      localStorage.setItem('mirage-ai-providers', JSON.stringify([{ id: 'openai' }]));
      localStorage.setItem('sera-ai-providers', JSON.stringify([{ id: 'legacy' }]));

      const value = readMigratedStorage('mirage-ai-providers', 'sera-ai-providers');

      expect(value).toBe(JSON.stringify([{ id: 'openai' }]));
      expect(localStorage.getItem('mirage-ai-providers')).toBe(JSON.stringify([{ id: 'openai' }]));
    });

    it('returns null when neither key exists', () => {
      expect(readMigratedStorage('mirage-missing', 'sera-missing')).toBeNull();
    });
  });

  describe('entryMigration category and status normalization', () => {
    it('maps legacy furniture categories to generalized ModelCategory values', () => {
      expect(normalizeCategory('asientos')).toBe('products');
      expect(normalizeCategory('mesas')).toBe('products');
      expect(normalizeCategory('almacenamiento')).toBe('products');
      expect(normalizeCategory('camas')).toBe('products');
      expect(normalizeCategory('iluminacion')).toBe('products');
      expect(normalizeCategory('accesorios')).toBe('props');
      expect(normalizeCategory('otro')).toBe('other');
      expect(normalizeCategory('characters')).toBe('characters');
      expect(normalizeCategory('unknown-category')).toBe('other');
      expect(normalizeCategory(undefined)).toBe('other');
    });

    it('maps legacy workshop/order statuses to generalized EntryStatus values', () => {
      expect(normalizeStatus('workshop')).toBe('wip');
      expect(normalizeStatus('madeToOrder')).toBe('approved');
      expect(normalizeStatus('dispatched')).toBe('published');
      expect(normalizeStatus('active')).toBe('active');
      expect(normalizeStatus('pending')).toBe('pending');
      expect(normalizeStatus('neutral')).toBe('neutral');
      expect(normalizeStatus(undefined)).toBe('wip');
    });

    it('normalizes legacy entries cleanly during migrateEntrySchema with English fallbacks', () => {
      const migrated = migrateEntrySchema({
        category: 'asientos',
        status: 'workshop',
        variants: [{ id: 'v1', name: 'Linen', materials: { Fabric: { assignedMapIds: {}, settings: {} } } }],
        texturePool: {
          baseColor: [],
          normal: [],
          orm: [],
          metalRoughness: [],
          ao: [],
          roughness: [],
          metalness: [],
          emissive: [],
          clearcoat: [],
          sheen: [],
          transmission: [],
          alpha: [],
          displacement: []
        }
      });

      expect(migrated.category).toBe('products');
      expect(migrated.status).toBe('wip');
    });
  });
});
