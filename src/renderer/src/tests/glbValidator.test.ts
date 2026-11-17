import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  analyzeGlbHierarchy,
  auditModelScale,
  extractGlbManifest,
  parseGlbBinaryJson,
  extractEmbeddedImageBytes,
  extractAllEmbeddedImages
} from '@renderer/utils/glbValidator';
import { bakeModelTransforms } from '@renderer/utils/viewportBridge';

describe('glbValidator', () => {
  describe('analyzeGlbHierarchy', () => {
    it('accurately counts triangles and vertices for indexed geometry', () => {
      // BoxGeometry has 24 vertices and 12 triangles (36 index entries)
      const geom = new THREE.BoxGeometry(1, 1, 1);
      const mat = new THREE.MeshStandardMaterial({ name: 'Wood_Mat' });
      const mesh = new THREE.Mesh(geom, mat);
      const scene = new THREE.Group();
      scene.add(mesh);

      const stats = analyzeGlbHierarchy(scene);

      expect(stats.meshCount).toBe(1);
      expect(stats.triangleCount).toBe(12);
      expect(stats.vertexCount).toBe(24);
      expect(stats.materials).toEqual(['Wood_Mat']);
      expect(stats.dimensions.width).toBeCloseTo(1.0, 2);
      expect(stats.dimensions.height).toBeCloseTo(1.0, 2);
      expect(stats.dimensions.depth).toBeCloseTo(1.0, 2);
    });

    it('accurately calculates triangles and vertices for non-indexed geometry', () => {
      // Convert indexed BoxGeometry to non-indexed geometry (36 vertices, index = null)
      const indexedGeom = new THREE.BoxGeometry(2, 4, 6);
      const nonIndexedGeom = indexedGeom.toNonIndexed();
      expect(nonIndexedGeom.index).toBeNull();

      const mat = new THREE.MeshStandardMaterial({ name: 'Metal_Mat' });
      const mesh = new THREE.Mesh(nonIndexedGeom, mat);
      const scene = new THREE.Scene();
      scene.add(mesh);

      const stats = analyzeGlbHierarchy(scene);

      expect(stats.meshCount).toBe(1);
      expect(stats.triangleCount).toBe(12);
      expect(stats.vertexCount).toBe(36);
      expect(stats.materials).toEqual(['Metal_Mat']);
      expect(stats.dimensions.width).toBeCloseTo(2.0, 2);
      expect(stats.dimensions.height).toBeCloseTo(4.0, 2);
      expect(stats.dimensions.depth).toBeCloseTo(6.0, 2);
    });

    it('deduplicates material names across multiple meshes and handles unnamed materials', () => {
      const scene = new THREE.Group();
      const sharedMat = new THREE.MeshStandardMaterial({ name: 'Shared_Plastic' });
      const unnamedMat = new THREE.MeshStandardMaterial(); // name is empty string

      const meshA = new THREE.Mesh(new THREE.BufferGeometry(), sharedMat);
      const meshB = new THREE.Mesh(new THREE.BufferGeometry(), sharedMat);
      const meshC = new THREE.Mesh(new THREE.BufferGeometry(), unnamedMat);

      scene.add(meshA, meshB, meshC);

      const stats = analyzeGlbHierarchy(scene);

      expect(stats.meshCount).toBe(3);
      expect(stats.materials).toHaveLength(2);
      expect(stats.materials).toContain('Shared_Plastic');
      expect(stats.materials.some((m) => m.startsWith('Material_'))).toBe(true);
    });

    it('handles multi-material meshes correctly', () => {
      const geom = new THREE.BufferGeometry();
      const mat1 = new THREE.MeshStandardMaterial({ name: 'Mat_A' });
      const mat2 = new THREE.MeshStandardMaterial({ name: 'Mat_B' });
      const mesh = new THREE.Mesh(geom, [mat1, mat2]);
      const scene = new THREE.Group();
      scene.add(mesh);

      const stats = analyzeGlbHierarchy(scene);

      expect(stats.meshCount).toBe(1);
      expect(stats.materials).toEqual(['Mat_A', 'Mat_B']);
    });

    it('ignores non-mesh objects (lights, cameras, pure groups) when calculating counts', () => {
      const scene = new THREE.Group();
      const subGroup = new THREE.Group();
      const light = new THREE.PointLight(0xffffff);
      const camera = new THREE.PerspectiveCamera();

      const geom = new THREE.BoxGeometry(1, 1, 1);
      const mesh = new THREE.Mesh(geom, new THREE.MeshStandardMaterial());

      subGroup.add(light, camera, mesh);
      scene.add(subGroup);

      const stats = analyzeGlbHierarchy(scene);

      expect(stats.meshCount).toBe(1);
      expect(stats.triangleCount).toBe(12);
    });

    it('handles empty scenes without meshes', () => {
      const scene = new THREE.Group();
      const stats = analyzeGlbHierarchy(scene);

      expect(stats.meshCount).toBe(0);
      expect(stats.triangleCount).toBe(0);
      expect(stats.vertexCount).toBe(0);
      expect(stats.materials).toEqual([]);
    });

    it('calculates bounding box accurately for transformed hierarchical meshes', () => {
      const root = new THREE.Group();
      const parent = new THREE.Group();
      parent.position.set(10, 0, 0);

      // Child box centered at (0, 0, 0) of parent, so world position is (10, 0, 0)
      const childMesh = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2, 2),
        new THREE.MeshStandardMaterial()
      );
      parent.add(childMesh);
      root.add(parent);

      root.updateMatrixWorld(true);
      const stats = analyzeGlbHierarchy(root);

      expect(stats.dimensions.width).toBeCloseTo(2.0, 2);
      expect(stats.dimensions.height).toBeCloseTo(2.0, 2);
      expect(stats.dimensions.depth).toBeCloseTo(2.0, 2);
    });
  });

  describe('auditModelScale', () => {
    it('flags dimensions > 50m as error with millimeters hint', () => {
      const res = auditModelScale({ width: 850, height: 450, depth: 320 });
      expect(res.status).toBe('error');
      expect(res.detectedUnitHint).toBe('millimeters');
      expect(res.message).toContain('850.0m');
      expect(res.message).toContain('millimeters');
    });

    it('flags dimensions between 5m and 50m as warning with centimeters hint', () => {
      const res = auditModelScale({ width: 0.8, height: 18.5, depth: 0.5 });
      expect(res.status).toBe('warning');
      expect(res.detectedUnitHint).toBe('centimeters');
      expect(res.message).toContain('18.5m');
      expect(res.message).toContain('centimeters');
    });

    it('flags dimensions < 0.05m as warning with tiny scale hint', () => {
      const res = auditModelScale({ width: 0.02, height: 0.03, depth: 0.01 });
      expect(res.status).toBe('warning');
      expect(res.detectedUnitHint).toBe('unknown');
      expect(res.message).toContain('extremely small');
    });

    it('identifies dimensions between 0.05m and 5m as optimal in meters', () => {
      const res = auditModelScale({ width: 0.85, height: 1.2, depth: 0.6 });
      expect(res.status).toBe('optimal');
      expect(res.detectedUnitHint).toBe('meters');
      expect(res.message).toContain('Valid scale in meters');
      expect(res.message).toContain('1.20m');
    });

    it('evaluates exact boundary values correctly', () => {
      // maxDim = 50.0 -> warning (centimeters, <= 50)
      const res50 = auditModelScale({ width: 50.0, height: 1.0, depth: 1.0 });
      expect(res50.status).toBe('warning');
      expect(res50.detectedUnitHint).toBe('centimeters');

      // maxDim = 50.001 -> error (> 50)
      const res50Plus = auditModelScale({ width: 50.001, height: 1.0, depth: 1.0 });
      expect(res50Plus.status).toBe('error');
      expect(res50Plus.detectedUnitHint).toBe('millimeters');

      // maxDim = 5.0 -> optimal (meters, <= 5)
      const res5 = auditModelScale({ width: 5.0, height: 1.0, depth: 1.0 });
      expect(res5.status).toBe('optimal');
      expect(res5.detectedUnitHint).toBe('meters');

      // maxDim = 0.05 -> optimal (meters, >= 0.05)
      const res005 = auditModelScale({ width: 0.05, height: 0.02, depth: 0.01 });
      expect(res005.status).toBe('optimal');
      expect(res005.detectedUnitHint).toBe('meters');
    });
  });

  describe('bakeModelTransforms', () => {
    it('bakes rotation and scale into mesh geometry vertices and keeps model centered at origin (ignoring staging translation)', () => {
      const root = new THREE.Group();
      // Box geometry with dimensions X=1, Y=2, Z=3
      const geom = new THREE.BoxGeometry(1, 2, 3);
      const mesh = new THREE.Mesh(geom, new THREE.MeshStandardMaterial());
      root.add(mesh);

      // Rotate 90 deg on X (Math.PI / 2): swaps Y (2) and Z (3)
      root.rotation.x = Math.PI / 2;
      root.scale.set(2, 2, 2); // Scales all dimensions by 2
      root.position.set(5, 10, 15);
      root.updateMatrixWorld(true);

      const baked = bakeModelTransforms(root);

      // Node transforms are reset to identity
      expect(baked.position.x).toBe(0);
      expect(baked.position.y).toBe(0);
      expect(baked.position.z).toBe(0);
      expect(baked.rotation.x).toBe(0);
      expect(baked.rotation.y).toBe(0);
      expect(baked.rotation.z).toBe(0);
      expect(baked.scale.x).toBe(1);
      expect(baked.scale.y).toBe(1);
      expect(baked.scale.z).toBe(1);

      // Find the child mesh
      let childMesh: THREE.Mesh | null = null;
      baked.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) childMesh = c as THREE.Mesh;
      });

      expect(childMesh).not.toBeNull();
      expect(childMesh!.position.x).toBe(0);
      expect(childMesh!.position.y).toBe(0);
      expect(childMesh!.position.z).toBe(0);
      expect(childMesh!.scale.x).toBe(1);

      // Bounding box of baked object now reflects the baked transform in world space
      const box = new THREE.Box3().setFromObject(baked);
      const size = new THREE.Vector3();
      box.getSize(size);

      // Dimensions scaled by 2:
      // Width (X) was 1 -> 2
      // Height (Y) was 2, now swapped with Z (3) -> 3 * 2 = 6
      // Depth (Z) was 3, now swapped with Y (2) -> 2 * 2 = 4
      expect(size.x).toBeCloseTo(2.0, 1);
      expect(size.y).toBeCloseTo(6.0, 1);
      expect(size.z).toBeCloseTo(4.0, 1);

      // Center should remain at (0, 0, 0) because staging position is excluded from exports
      const center = new THREE.Vector3();
      box.getCenter(center);
      expect(center.x).toBeCloseTo(0.0, 1);
      expect(center.y).toBeCloseTo(0.0, 1);
      expect(center.z).toBeCloseTo(0.0, 1);
    });
  });

  describe('extractGlbManifest & parseGlbBinaryJson', () => {
    it('returns null on invalid or empty source', () => {
      expect(extractGlbManifest(null)).toBeNull();
      expect(extractGlbManifest(undefined)).toBeNull();
      expect(parseGlbBinaryJson(new Uint8Array(10))).toBeNull();
    });

    it('extracts complete glTF manifest from JSON object', () => {
      const gltfMock = {
        asset: { generator: 'Blender 4.2', version: '2.0' },
        extensionsUsed: ['KHR_materials_transmission'],
        bufferViews: [
          { byteLength: 5000 },
          { byteLength: 12000 }
        ],
        images: [
          { name: 'base_img', mimeType: 'image/png', bufferView: 0 },
          { name: 'glass_mask', mimeType: 'image/png', bufferView: 1 }
        ],
        textures: [
          { source: 0 },
          { source: 1 }
        ],
        materials: [
          {
            name: 'Glass_Tabletop',
            alphaMode: 'BLEND',
            doubleSided: true,
            pbrMetallicRoughness: {
              baseColorTexture: { index: 0 },
              roughnessFactor: 0.1,
              metallicFactor: 0.0
            },
            extensions: {
              KHR_materials_transmission: {
                transmissionFactor: 1.0,
                transmissionTexture: { index: 1 }
              }
            }
          }
        ],
        animations: [{ name: 'Turntable' }],
        cameras: [{ name: 'Camera_Main' }]
      };

      const manifest = extractGlbManifest(gltfMock);
      expect(manifest).not.toBeNull();
      expect(manifest?.generator).toBe('Blender 4.2');
      expect(manifest?.version).toBe('2.0');
      expect(manifest?.extensionsUsed).toEqual(['KHR_materials_transmission']);
      expect(manifest?.totalTexturesByteLength).toBe(17000);
      expect(manifest?.textures.length).toBe(2);
      expect(manifest?.textures[0].name).toBe('base_img');
      expect(manifest?.textures[0].assignedSlots).toContain('BaseColor');
      expect(manifest?.textures[1].assignedSlots).toContain('Transmission');

      expect(manifest?.materials.length).toBe(1);
      const mat = manifest!.materials[0];
      expect(mat.name).toBe('Glass_Tabletop');
      expect(mat.alphaMode).toBe('BLEND');
      expect(mat.doubleSided).toBe(true);
      expect(mat.transmissionFactor).toBe(1.0);
      expect(mat.extensions).toContain('KHR_materials_transmission');
      expect(mat.textures.length).toBe(2);

      expect(manifest?.animationsCount).toBe(1);
      expect(manifest?.animationNames).toEqual(['Turntable']);
      expect(manifest?.camerasCount).toBe(1);
      expect(manifest?.lightsCount).toBe(0);
    });

    it('extracts glTF manifest from gltf.parser.json structure', () => {
      const gltfWrapper = {
        parser: {
          json: {
            asset: { version: '2.0' },
            materials: [{ name: 'Fabric' }]
          }
        }
      };
      const manifest = extractGlbManifest(gltfWrapper);
      expect(manifest).not.toBeNull();
      expect(manifest?.materials.length).toBe(1);
      expect(manifest?.materials[0].name).toBe('Fabric');
    });

    it('correctly parses binary GLB chunk into glTF JSON', () => {
      const jsonStr = JSON.stringify({
        asset: { version: '2.0', generator: 'TestExporter' },
        materials: [{ name: 'Mat_Binary' }]
      });
      const jsonBytes = new TextEncoder().encode(jsonStr);

      // Construct a valid binary GLB header
      // Header: 12 bytes [magic(4), version(4), length(4)]
      // Chunk 0: 8 bytes [chunkLength(4), chunkType(4)], then jsonBytes
      const totalLen = 12 + 8 + jsonBytes.length;
      const buffer = new ArrayBuffer(totalLen);
      const view = new DataView(buffer);
      view.setUint32(0, 0x46546c67, true); // 'glTF'
      view.setUint32(4, 2, true); // version 2
      view.setUint32(8, totalLen, true);
      view.setUint32(12, jsonBytes.length, true);
      view.setUint32(16, 0x4e4f534a, true); // 'JSON'
      new Uint8Array(buffer).set(jsonBytes, 20);

      const parsed = parseGlbBinaryJson(buffer);
      expect(parsed).not.toBeNull();
      expect(parsed.asset.generator).toBe('TestExporter');

      const manifest = extractGlbManifest(buffer);
      expect(manifest).not.toBeNull();
      expect(manifest?.generator).toBe('TestExporter');
      expect(manifest?.materials[0].name).toBe('Mat_Binary');
    });

    it('extracts raw embedded image bytes from binary GLB buffer', () => {
      const mockImgData = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 1, 2, 3]); // Fake PNG bytes
      const jsonStr = JSON.stringify({
        asset: { version: '2.0' },
        bufferViews: [{ byteOffset: 0, byteLength: mockImgData.length }],
        images: [{ name: 'test_tex', mimeType: 'image/png', bufferView: 0 }]
      });
      const jsonBytes = new TextEncoder().encode(jsonStr);

      // Binary GLB layout:
      // Header: 12 bytes
      // Chunk 0 (JSON): 8 bytes header + jsonBytes (padded to 4 bytes if needed)
      const jsonPadding = (4 - (jsonBytes.length % 4)) % 4;
      const jsonChunkLen = jsonBytes.length + jsonPadding;

      // Chunk 1 (BIN): 8 bytes header + mockImgData (padded to 4 bytes)
      const binPadding = (4 - (mockImgData.length % 4)) % 4;
      const binChunkLen = mockImgData.length + binPadding;

      const totalLen = 12 + 8 + jsonChunkLen + 8 + binChunkLen;
      const buffer = new ArrayBuffer(totalLen);
      const view = new DataView(buffer);
      const u8 = new Uint8Array(buffer);

      // GLB Header
      view.setUint32(0, 0x46546c67, true);
      view.setUint32(4, 2, true);
      view.setUint32(8, totalLen, true);

      // Chunk 0 (JSON)
      view.setUint32(12, jsonChunkLen, true);
      view.setUint32(16, 0x4e4f534a, true);
      u8.set(jsonBytes, 20);

      // Chunk 1 (BIN)
      const binOffset = 20 + jsonChunkLen;
      view.setUint32(binOffset, binChunkLen, true);
      view.setUint32(binOffset + 4, 0x004e4942, true); // 'BIN\0'
      u8.set(mockImgData, binOffset + 8);

      const extracted = extractEmbeddedImageBytes(buffer, 0);
      expect(extracted).not.toBeNull();
      expect(extracted?.name).toBe('test_tex');
      expect(extracted?.mimeType).toBe('image/png');
      expect(extracted?.extension).toBe('png');
      expect(extracted?.bytes).toEqual(mockImgData);

      const all = extractAllEmbeddedImages(buffer);
      expect(all.length).toBe(1);
      expect(all[0].name).toBe('test_tex');
      expect(all[0].bytes).toEqual(mockImgData);
    });
  });
});
