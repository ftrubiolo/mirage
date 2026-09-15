import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import JSZip from 'jszip';
import {
  groundModelAtFloor,
  bakeVariantArtifacts,
  createArPackageZip
} from '../utils/arBakePipeline';
import { viewportBridge } from '../utils/viewportBridge';
import { EntryVariant } from '../types/library';

describe('arBakePipeline', () => {
  describe('groundModelAtFloor', () => {
    it('shifts object so minimum Y boundary is aligned to Y = 0 (floor plane)', () => {
      const geom = new THREE.BoxGeometry(1, 2, 1);
      // Box centered at (0, 5, 0) -> Y goes from 4 to 6
      geom.translate(0, 5, 0);
      const mesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial());
      const group = new THREE.Group();
      group.add(mesh);

      const beforeBox = new THREE.Box3().setFromObject(group);
      expect(beforeBox.min.y).toBeCloseTo(4);

      groundModelAtFloor(group);

      const afterBox = new THREE.Box3().setFromObject(group);
      expect(afterBox.min.y).toBeCloseTo(0);
      expect(afterBox.max.y).toBeCloseTo(2);
    });

    it('leaves already grounded objects at Y = 0 intact', () => {
      const geom = new THREE.BoxGeometry(1, 1, 1);
      geom.translate(0, 0.5, 0); // Y goes from 0 to 1
      const mesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial());
      const group = new THREE.Group();
      group.add(mesh);

      groundModelAtFloor(group);

      const box = new THREE.Box3().setFromObject(group);
      expect(box.min.y).toBeCloseTo(0);
    });
  });

  describe('bakeVariantArtifacts', () => {
    let testGroup: THREE.Group;
    let testMesh: THREE.Mesh;
    let testMat: THREE.MeshStandardMaterial;

    beforeEach(() => {
      testMat = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        roughness: 0.5,
        metalness: 0.2
      });
      testMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.8), testMat);
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

    it('generates valid standalone GLB and USDZ buffers for a variant without mutating original scene', async () => {
      const mockVariant: EntryVariant = {
        id: 'var-lino',
        name: 'Lino Arena',
        maps: {},
        settings: {
          roughnessFactor: 0.9,
          metalnessFactor: 0.1,
          normalScale: 1.5
        }
      };

      const result = await bakeVariantArtifacts(testGroup, mockVariant, {
        maxTextureSize: 1024,
        includeGlb: true,
        includeUsdz: true,
        groundModel: true
      });

      expect(result.variantCode).toBe('lino-arena');
      expect(result.variantLabel).toBe('Lino Arena');

      expect(result.glb).toBeDefined();
      expect(result.glb!.byteLength).toBeGreaterThan(0);

      expect(result.usdz).toBeDefined();
      expect(result.usdz!.byteLength).toBeGreaterThan(0);

      // Verify original viewport material in active scene is untouched
      expect(testMat.roughness).toBe(0.5);
      expect(testMat.metalness).toBe(0.2);
    });

    it('respects includeGlb and includeUsdz flags', async () => {
      const mockVariant: EntryVariant = {
        id: 'var-test',
        name: 'Test Only GLB',
        maps: {},
        settings: {}
      };

      const glbOnly = await bakeVariantArtifacts(testGroup, mockVariant, {
        includeGlb: true,
        includeUsdz: false
      });
      expect(glbOnly.glb).toBeDefined();
      expect(glbOnly.usdz).toBeUndefined();

      const usdzOnly = await bakeVariantArtifacts(testGroup, mockVariant, {
        includeGlb: false,
        includeUsdz: true
      });
      expect(usdzOnly.glb).toBeUndefined();
      expect(usdzOnly.usdz).toBeDefined();
    });
  });

  describe('createArPackageZip', () => {
    let testGroup: THREE.Group;

    beforeEach(() => {
      const testMat = new THREE.MeshStandardMaterial({ color: 0x999999 });
      const testMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), testMat);
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

    it('builds an AR bundle ZIP containing glb/, usdz/ and ar-manifest.json for all variants', async () => {
      const mockVariants: EntryVariant[] = [
        {
          id: 'v1',
          name: 'Lino Arena',
          maps: {},
          settings: { roughnessFactor: 0.8 }
        },
        {
          id: 'v2',
          name: 'Cuero Negro',
          maps: {},
          settings: { roughnessFactor: 0.3, metalnessFactor: 0.2 }
        }
      ];

      const progressSpy = vi.fn();
      const zipBlob = await createArPackageZip({
        productName: 'Sofa Kanso',
        productId: 'sofa-kanso',
        variants: mockVariants,
        maxTextureSize: 1024,
        onProgress: progressSpy
      });

      expect(zipBlob).toBeDefined();
      expect(zipBlob.size).toBeGreaterThan(0);
      expect(progressSpy).toHaveBeenCalled();

      const zip = await JSZip.loadAsync(zipBlob);
      const fileNames = Object.keys(zip.files);

      expect(fileNames).toContain('glb/lino-arena.glb');
      expect(fileNames).toContain('glb/cuero-negro.glb');
      expect(fileNames).toContain('usdz/lino-arena.usdz');
      expect(fileNames).toContain('usdz/cuero-negro.usdz');
      expect(fileNames).toContain('ar-manifest.json');

      const manifestStr = await zip.file('ar-manifest.json')!.async('string');
      const manifest = JSON.parse(manifestStr);

      expect(manifest.productName).toBe('Sofa Kanso');
      expect(manifest.maxTextureSize).toBe(1024);
      expect(manifest.variants).toHaveLength(2);
      expect(manifest.variants[0].code).toBe('lino-arena');
      expect(manifest.variants[0].glb).toBe('glb/lino-arena.glb');
      expect(manifest.variants[0].usdz).toBe('usdz/lino-arena.usdz');
      expect(manifest.variants[1].code).toBe('cuero-negro');
    });
  });
});
