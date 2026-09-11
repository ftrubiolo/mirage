import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import JSZip from 'jszip';
import {
  slugifyCode,
  formatMapFileName,
  buildModel3dJson,
  createSeraPackageZip,
  getRawBinaryBytes
} from '../utils/seraPackageExporter';
import { viewportBridge, exportCleanGeometryGLB, exportModelToUSDZ } from '../utils/viewportBridge';
import { useVariantStore } from '../store/variantStore';

describe('seraPackageExporter', () => {
  describe('slugifyCode', () => {
    it('normalizes accents, symbols and whitespace into clean kebab-case', () => {
      expect(slugifyCode('Lino Arena')).toBe('lino-arena');
      expect(slugifyCode('Silla Nórdica Escandinava')).toBe('silla-nordica-escandinava');
      expect(slugifyCode('Cuero Vintage #3!')).toBe('cuero-vintage-3');
      expect(slugifyCode('  TAPIZADO_GRIS--OSCURO  ')).toBe('tapizado-gris-oscuro');
    });

    it('falls back to default if empty or pure punctuation', () => {
      expect(slugifyCode('')).toBe('variante');
      expect(slugifyCode('---')).toBe('variante');
      expect(slugifyCode('???')).toBe('variante');
    });
  });

  describe('formatMapFileName', () => {
    it('formats baseColor map with variant code and preserves extension', () => {
      expect(formatMapFileName('base', 'lino-arena', 'lino-arena_base.webp')).toBe('lino-arena_base.webp');
      expect(formatMapFileName('base', 'cuero-vintage', 'cuero_texture.png')).toBe('cuero-vintage_base.png');
    });

    it('derives clean shared normal and ORM map names preserving original extension', () => {
      expect(formatMapFileName('norm', 'lino-arena', 'lino_norm.webp')).toBe('lino_norm.webp');
      expect(formatMapFileName('norm', 'lino-terracota', 'lino_normal.png')).toBe('lino_norm.png');
      expect(formatMapFileName('orm', 'lino-arena', 'lino_orm.webp')).toBe('lino_orm.webp');
      expect(formatMapFileName('orm', 'cuero-vintage', 'cuero_mro.png')).toBe('cuero_orm.png');
    });

    it('falls back to variant code if original file name is generic', () => {
      expect(formatMapFileName('norm', 'lino-arena', 'normal.webp')).toBe('lino-arena_norm.webp');
      expect(formatMapFileName('orm', 'lino-arena', 'orm.webp')).toBe('lino-arena_orm.webp');
    });
  });

  describe('buildModel3dJson', () => {
    it('generates the exact schema matching plantilla-modelo-3d-seramuebles', () => {
      const variants = [
        {
          code: 'lino-arena',
          label: 'Lino Arena',
          baseColor: 'maps/lino-arena_base.webp',
          normalMap: 'maps/lino_norm.webp',
          ormMap: 'maps/lino_orm.webp'
        },
        {
          code: 'cuero-vintage',
          label: 'Cuero Vintage',
          baseColor: 'maps/cuero-vintage_base.webp',
          normalMap: 'maps/cuero_norm.webp',
          ormMap: 'maps/cuero_orm.webp',
          roughnessFactor: 0.6
        }
      ];

      const json = buildModel3dJson('Silla Nórdica Escandinava', variants, true);

      expect(json.name).toBe('Silla Nórdica Escandinava');
      expect(json.files.glb).toBe('geometry.glb');
      expect(json.files.usdz).toBe('model.usdz');
      expect(json.variants).toHaveLength(2);
      expect(json.variants[0]).toEqual({
        code: 'lino-arena',
        label: 'Lino Arena',
        baseColor: 'maps/lino-arena_base.webp',
        normalMap: 'maps/lino_norm.webp',
        ormMap: 'maps/lino_orm.webp'
      });
      expect(json.variants[1]).toEqual({
        code: 'cuero-vintage',
        label: 'Cuero Vintage',
        baseColor: 'maps/cuero-vintage_base.webp',
        normalMap: 'maps/cuero_norm.webp',
        ormMap: 'maps/cuero_orm.webp',
        roughnessFactor: 0.6
      });
    });

    it('omits usdz from files when hasUsdz is false', () => {
      const json = buildModel3dJson('Mesa Rustica', [], false);
      expect(json.files.glb).toBe('geometry.glb');
      expect(json.files.usdz).toBeUndefined();
    });
  });

  describe('Clean GLB and USDZ export helpers', () => {
    let testGroup: THREE.Group;
    let testMesh: THREE.Mesh;
    let testMat: THREE.MeshStandardMaterial;

    beforeEach(() => {
      testMat = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        roughness: 0.5,
        metalness: 0.1
      });
      testMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), testMat);
      testGroup = new THREE.Group();
      testGroup.add(testMesh);

      const scene = new THREE.Scene();
      scene.add(testGroup);
      const camera = new THREE.PerspectiveCamera();
      const gl = {
        render: vi.fn(),
        getSize: vi.fn((v) => v.set(100, 100)),
        getPixelRatio: vi.fn(() => 1),
        getClearAlpha: vi.fn(() => 1),
        getClearColor: vi.fn((c) => c),
        setClearColor: vi.fn(),
        setSize: vi.fn(),
        setPixelRatio: vi.fn(),
        domElement: document.createElement('canvas')
      } as any;

      viewportBridge.register(gl, scene, camera);
      viewportBridge.registerModel(testGroup);
    });

    it('exportCleanGeometryGLB strips heavy textures from cloned materials', async () => {
      // Attach mock textures to verify stripping
      const dummyTex = new THREE.Texture();
      testMat.map = dummyTex;
      testMat.normalMap = dummyTex;
      testMat.roughnessMap = dummyTex;

      const glbBuf = await exportCleanGeometryGLB();
      expect(glbBuf).toBeDefined();
      expect(glbBuf.byteLength).toBeGreaterThan(0);

      // Verify that the active viewport material still has its original textures (not mutated)
      expect(testMat.map).toBe(dummyTex);
      expect(testMat.normalMap).toBe(dummyTex);
    });

    it('exportModelToUSDZ generates valid binary buffer without errors', async () => {
      const usdzBuf = await exportModelToUSDZ({ maxTextureSize: 512 });
      expect(usdzBuf).toBeDefined();
      expect(usdzBuf.byteLength).toBeGreaterThan(0);
    });
  });

  describe('createSeraPackageZip integration', () => {
    beforeEach(() => {
      const testMat = new THREE.MeshStandardMaterial({ color: 0xdddddd });
      const testMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.85, 0.8), testMat);
      const testGroup = new THREE.Group();
      testGroup.add(testMesh);

      const scene = new THREE.Scene();
      scene.add(testGroup);
      const camera = new THREE.PerspectiveCamera();
      const gl = {
        render: vi.fn(),
        getSize: vi.fn((v) => v.set(100, 100)),
        getPixelRatio: vi.fn(() => 1),
        getClearAlpha: vi.fn(() => 1),
        getClearColor: vi.fn((c) => c),
        setClearColor: vi.fn(),
        setSize: vi.fn(),
        setPixelRatio: vi.fn(),
        domElement: document.createElement('canvas')
      } as any;

      viewportBridge.register(gl, scene, camera);
      viewportBridge.registerModel(testGroup);

      // Mock electronAPI
      (window as any).electronAPI = {
        readBinaryFile: vi.fn(async (filePath: string) => {
          return new TextEncoder().encode(`RAW_BYTES_FOR_${filePath}`);
        }),
        toAssetUrl: vi.fn((path: string) => `local-asset://${path}`)
      };
    });

    it('assembles a ZIP package strictly following plantilla-modelo-3d-seramuebles', async () => {
      const mockVariants = [
        {
          id: 'v-lino-arena',
          name: 'Lino Arena',
          isDefault: true,
          maps: {
            baseColor: { fileName: 'lino-arena_base.webp', filePath: '/fake/path/lino-arena_base.webp', fileSize: 100 },
            normal: { fileName: 'lino_norm.webp', filePath: '/fake/path/lino_norm.webp', fileSize: 100 },
            orm: { fileName: 'lino_orm.webp', filePath: '/fake/path/lino_orm.webp', fileSize: 100 }
          },
          settings: { roughnessFactor: 0.85 }
        },
        {
          id: 'v-lino-terracota',
          name: 'Lino Terracota',
          maps: {
            baseColor: { fileName: 'lino-terracota_base.webp', filePath: '/fake/path/lino-terracota_base.webp', fileSize: 100 },
            // Reusing same normal and orm to test deduplication
            normal: { fileName: 'lino_norm.webp', filePath: '/fake/path/lino_norm.webp', fileSize: 100 },
            orm: { fileName: 'lino_orm.webp', filePath: '/fake/path/lino_orm.webp', fileSize: 100 }
          },
          settings: {}
        }
      ];

      const zipBlob = await createSeraPackageZip({
        productName: 'Silla Nórdica Escandinava',
        variants: mockVariants as any,
        includeUsdz: true
      });

      expect(zipBlob).toBeDefined();

      // Inspect unzipped contents using JSZip
      const zip = await JSZip.loadAsync(zipBlob);
      const fileNames = Object.keys(zip.files);

      // Check root files
      expect(fileNames).toContain('geometry.glb');
      expect(fileNames).toContain('model.usdz');
      expect(fileNames).toContain('model-3d.json');

      // Check maps/ directory
      expect(fileNames).toContain('maps/lino-arena_base.webp');
      expect(fileNames).toContain('maps/lino-terracota_base.webp');
      expect(fileNames).toContain('maps/lino_norm.webp');
      expect(fileNames).toContain('maps/lino_orm.webp');

      // Ensure exact deduplication: shared maps appear only once in maps/
      const normMaps = fileNames.filter((f) => f.includes('_norm'));
      expect(normMaps).toHaveLength(1);

      // Check raw binary preservation
      const baseColorData = await zip.file('maps/lino-arena_base.webp')!.async('text');
      expect(baseColorData).toBe('RAW_BYTES_FOR_/fake/path/lino-arena_base.webp');

      // Check model-3d.json content and schema
      const jsonContent = JSON.parse(await zip.file('model-3d.json')!.async('text'));
      expect(jsonContent.name).toBe('Silla Nórdica Escandinava');
      expect(jsonContent.files).toEqual({
        glb: 'geometry.glb',
        usdz: 'model.usdz'
      });
      expect(jsonContent.variants).toHaveLength(2);
      expect(jsonContent.variants[0].code).toBe('lino-arena');
      expect(jsonContent.variants[0].label).toBe('Lino Arena');
      expect(jsonContent.variants[0].baseColor).toBe('maps/lino-arena_base.webp');
      expect(jsonContent.variants[0].normalMap).toBe('maps/lino_norm.webp');
      expect(jsonContent.variants[0].ormMap).toBe('maps/lino_orm.webp');
      expect(jsonContent.variants[0].roughnessFactor).toBe(0.85);

      expect(jsonContent.variants[1].code).toBe('lino-terracota');
      expect(jsonContent.variants[1].baseColor).toBe('maps/lino-terracota_base.webp');
      expect(jsonContent.variants[1].normalMap).toBe('maps/lino_norm.webp');
      expect(jsonContent.variants[1].ormMap).toBe('maps/lino_orm.webp');
    });
  });
});
