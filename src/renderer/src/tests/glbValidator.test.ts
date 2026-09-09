import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { analyzeGlbHierarchy, auditModelScale } from '@renderer/utils/glbValidator';

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
      expect(res.message).toContain('milímetros');
    });

    it('flags dimensions between 5m and 50m as warning with centimeters hint', () => {
      const res = auditModelScale({ width: 0.8, height: 18.5, depth: 0.5 });
      expect(res.status).toBe('warning');
      expect(res.detectedUnitHint).toBe('centimeters');
      expect(res.message).toContain('18.5m');
      expect(res.message).toContain('centímetros');
    });

    it('flags dimensions < 0.05m as warning with tiny scale hint', () => {
      const res = auditModelScale({ width: 0.02, height: 0.03, depth: 0.01 });
      expect(res.status).toBe('warning');
      expect(res.detectedUnitHint).toBe('unknown');
      expect(res.message).toContain('sumamente pequeño');
    });

    it('identifies dimensions between 0.05m and 5m as optimal in meters', () => {
      const res = auditModelScale({ width: 0.85, height: 1.2, depth: 0.6 });
      expect(res.status).toBe('optimal');
      expect(res.detectedUnitHint).toBe('meters');
      expect(res.message).toContain('Escala correcta en metros');
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
});
