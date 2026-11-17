import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import JSZip from 'jszip';
import {
  slugifyCode,
  formatMapFileName,
  buildModel3dJson,
  createWebPackageZip,
  getRawBinaryBytes
} from '../utils/webPackageExporter';
import { viewportBridge, exportCleanGeometryGLB, exportModelToUSDZ } from '../utils/viewportBridge';
import { useVariantStore } from '../store/variantStore';

describe('webPackageExporter', () => {
  describe('slugifyCode', () => {
    it('normalizes accents, symbols and whitespace into clean kebab-case', () => {
      expect(slugifyCode('Sand Linen')).toBe('sand-linen');
      expect(slugifyCode('Cámara Clásica #1')).toBe('camara-clasica-1');
      expect(slugifyCode('Brushed Steel #3!')).toBe('brushed-steel-3');
      expect(slugifyCode('  MATTE_CARBON--FIBER  ')).toBe('matte-carbon-fiber');
    });

    it('falls back to default if empty or pure punctuation', () => {
      expect(slugifyCode('')).toBe('variant');
      expect(slugifyCode('---')).toBe('variant');
      expect(slugifyCode('???')).toBe('variant');
    });
  });

  describe('formatMapFileName', () => {
    it('formats baseColor map with variant code and preserves extension', () => {
      expect(formatMapFileName('base', 'sand-fabric', 'sand-fabric_base.webp')).toBe('sand-fabric_base.webp');
      expect(formatMapFileName('base', 'brushed-metal', 'metal_texture.png')).toBe('brushed-metal_base.png');
    });

    it('derives clean shared normal and ORM map names preserving original extension', () => {
      expect(formatMapFileName('norm', 'sand-fabric', 'fabric_norm.webp')).toBe('fabric_norm.webp');
      expect(formatMapFileName('norm', 'slate-fabric', 'fabric_normal.png')).toBe('fabric_norm.png');
      expect(formatMapFileName('orm', 'sand-fabric', 'fabric_orm.webp')).toBe('fabric_orm.webp');
      expect(formatMapFileName('orm', 'brushed-metal', 'metal_mro.png')).toBe('metal_orm.png');
    });

    it('falls back to variant code if original file name is generic', () => {
      expect(formatMapFileName('norm', 'sand-fabric', 'normal.webp')).toBe('sand-fabric_norm.webp');
      expect(formatMapFileName('orm', 'sand-fabric', 'orm.webp')).toBe('sand-fabric_orm.webp');
    });
  });

  describe('buildModel3dJson', () => {
    it('generates the expected model-3d.json schema', () => {
      const variants = [
        {
          code: 'sand-fabric',
          label: 'Sand Fabric',
          baseColor: 'maps/sand-fabric_base.webp',
          normalMap: 'maps/fabric_norm.webp',
          ormMap: 'maps/fabric_orm.webp'
        },
        {
          code: 'brushed-metal',
          label: 'Brushed Metal',
          baseColor: 'maps/brushed-metal_base.webp',
          normalMap: 'maps/metal_norm.webp',
          ormMap: 'maps/metal_orm.webp',
          roughnessFactor: 0.6
        }
      ];

      const json = buildModel3dJson('Studio Camera Rig', variants, true);

      expect(json.name).toBe('Studio Camera Rig');
      expect(json.files.glb).toBe('geometry.glb');
      expect(json.files.usdz).toBe('model.usdz');
      expect(json.variants).toHaveLength(2);
      expect(json.variants[0]).toEqual({
        code: 'sand-fabric',
        label: 'Sand Fabric',
        baseColor: 'maps/sand-fabric_base.webp',
        normalMap: 'maps/fabric_norm.webp',
        ormMap: 'maps/fabric_orm.webp'
      });
      expect(json.variants[1]).toEqual({
        code: 'brushed-metal',
        label: 'Brushed Metal',
        baseColor: 'maps/brushed-metal_base.webp',
        normalMap: 'maps/metal_norm.webp',
        ormMap: 'maps/metal_orm.webp',
        roughnessFactor: 0.6
      });
    });

    it('omits usdz from files when hasUsdz is false', () => {
      const json = buildModel3dJson('Display Stand', [], false);
      expect(json.files.glb).toBe('geometry.glb');
      expect(json.files.usdz).toBeUndefined();
    });

    it('falls back to "3D Model" when productName is empty', () => {
      const json = buildModel3dJson('', [], false);
      expect(json.name).toBe('3D Model');
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

  describe('createWebPackageZip integration', () => {
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

      (window as any).electronAPI = {
        readBinaryFile: vi.fn(async (filePath: string) => {
          return new TextEncoder().encode(`RAW_BYTES_FOR_${filePath}`);
        }),
        toAssetUrl: vi.fn((path: string) => `local-asset://${path}`)
      };
    });

    it('assembles a Web & AR ZIP package with geometry.glb, deduplicated maps/, and model-3d.json', async () => {
      const mockVariants = [
        {
          id: 'v-sand-fabric',
          name: 'Sand Fabric',
          isDefault: true,
          maps: {
            baseColor: { fileName: 'sand-fabric_base.webp', filePath: '/fake/path/sand-fabric_base.webp', fileSize: 100 },
            normal: { fileName: 'fabric_norm.webp', filePath: '/fake/path/fabric_norm.webp', fileSize: 100 },
            orm: { fileName: 'fabric_orm.webp', filePath: '/fake/path/fabric_orm.webp', fileSize: 100 }
          },
          settings: { roughnessFactor: 0.85 }
        },
        {
          id: 'v-slate-fabric',
          name: 'Slate Fabric',
          maps: {
            baseColor: { fileName: 'slate-fabric_base.webp', filePath: '/fake/path/slate-fabric_base.webp', fileSize: 100 },
            normal: { fileName: 'fabric_norm.webp', filePath: '/fake/path/fabric_norm.webp', fileSize: 100 },
            orm: { fileName: 'fabric_orm.webp', filePath: '/fake/path/fabric_orm.webp', fileSize: 100 }
          },
          settings: {}
        }
      ];

      const zipBlob = await createWebPackageZip({
        productName: 'Studio Camera Rig',
        variants: mockVariants as any
      });

      expect(zipBlob).toBeDefined();

      const zip = await JSZip.loadAsync(zipBlob);
      const fileNames = Object.keys(zip.files);

      expect(fileNames).toContain('geometry.glb');
      expect(fileNames).not.toContain('model.usdz');
      expect(fileNames).toContain('model-3d.json');

      expect(fileNames).toContain('maps/sand-fabric_base.webp');
      expect(fileNames).toContain('maps/slate-fabric_base.webp');
      expect(fileNames).toContain('maps/fabric_norm.webp');
      expect(fileNames).toContain('maps/fabric_orm.webp');

      const normMaps = fileNames.filter((f) => f.includes('_norm'));
      expect(normMaps).toHaveLength(1);

      const baseColorData = await zip.file('maps/sand-fabric_base.webp')!.async('text');
      expect(baseColorData).toBe('RAW_BYTES_FOR_/fake/path/sand-fabric_base.webp');

      const jsonContent = JSON.parse(await zip.file('model-3d.json')!.async('text'));
      expect(jsonContent.name).toBe('Studio Camera Rig');
      expect(jsonContent.files).toEqual({
        glb: 'geometry.glb'
      });
      expect(jsonContent.variants).toHaveLength(2);
      expect(jsonContent.variants[0].code).toBe('sand-fabric');
      expect(jsonContent.variants[0].label).toBe('Sand Fabric');
      expect(jsonContent.variants[0].baseColor).toBe('maps/sand-fabric_base.webp');
      expect(jsonContent.variants[0].normalMap).toBe('maps/fabric_norm.webp');
      expect(jsonContent.variants[0].ormMap).toBe('maps/fabric_orm.webp');
      expect(jsonContent.variants[0].roughnessFactor).toBe(0.85);

      expect(jsonContent.variants[1].code).toBe('slate-fabric');
      expect(jsonContent.variants[1].baseColor).toBe('maps/slate-fabric_base.webp');
      expect(jsonContent.variants[1].normalMap).toBe('maps/fabric_norm.webp');
      expect(jsonContent.variants[1].ormMap).toBe('maps/fabric_orm.webp');
    });

    it('packages baked AR variant models into ar/ folder and updates model-3d.json when includeArVariants is true', async () => {
      const mockVariants = [
        {
          id: 'v-matte-carbon',
          name: 'Matte Carbon',
          maps: {},
          settings: { roughnessFactor: 0.4 }
        }
      ];

      const zipBlob = await createWebPackageZip({
        productName: 'Modular Asset',
        variants: mockVariants as any,
        includeArVariants: true,
        arTextureSize: 1024
      });

      const zip = await JSZip.loadAsync(zipBlob);
      const fileNames = Object.keys(zip.files);

      expect(fileNames).toContain('geometry.glb');
      expect(fileNames).not.toContain('model.usdz');
      expect(fileNames).toContain('model-3d.json');
      expect(fileNames).toContain('ar/glb/matte-carbon.glb');
      expect(fileNames).toContain('ar/usdz/matte-carbon.usdz');

      const json = JSON.parse(await zip.file('model-3d.json')!.async('text'));
      expect(json.files.ar).toEqual({
        glbDir: 'ar/glb',
        usdzDir: 'ar/usdz'
      });
      expect(json.variants[0].ar).toEqual({
        glb: 'ar/glb/matte-carbon.glb',
        usdz: 'ar/usdz/matte-carbon.usdz'
      });
    });

    it('falls back to candidate pool if a variant primary normal map file is missing on disk', async () => {
      (window as any).electronAPI.readBinaryFile = vi.fn(async (filePath: string) => {
        if (filePath.includes('corrupt')) {
          throw new Error('ENOENT: no such file or directory');
        }
        return new TextEncoder().encode(`RAW_BYTES_FOR_${filePath}`);
      });

      useVariantStore.setState({
        mapVariants: {
          baseColor: [],
          normal: [
            {
              id: 'n-fallback',
              name: 'fabric_norm',
              fileName: 'fabric_norm.webp',
              filePath: '/fake/path/fabric_norm.webp',
              url: ''
            }
          ],
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

      const mockVariants = [
        {
          id: 'v-corrupt-norm',
          name: 'Sand Fabric',
          maps: {
            normal: {
              fileName: 'corrupt_norm.webp',
              filePath: '/non/existent/corrupt_norm.webp'
            }
          },
          settings: {}
        }
      ];

      const zipBlob = await createWebPackageZip({
        productName: 'Fallback Asset',
        variants: mockVariants as any
      });

      const zip = await JSZip.loadAsync(zipBlob);
      const fileNames = Object.keys(zip.files);

      expect(fileNames).toContain('maps/fabric_norm.webp');
      const json = JSON.parse(await zip.file('model-3d.json')!.async('text'));
      expect(json.variants[0].normalMap).toBe('maps/fabric_norm.webp');
    });

    it('getRawBinaryBytes reads file via electronAPI', async () => {
      const bytes = await getRawBinaryBytes('/fake/path/test.webp', undefined);
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(new TextDecoder().decode(bytes!)).toBe('RAW_BYTES_FOR_/fake/path/test.webp');
    });
  });
});
