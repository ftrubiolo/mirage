import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import {
  applyPbrUniforms,
  applyPbrTextures,
  applyPbrState,
  type PbrUniformValues,
  type PbrTextureValues
} from '../utils/pbrController';

describe('pbrController', () => {
  let model: THREE.Group;
  let mesh: THREE.Mesh;
  let mat: THREE.MeshPhysicalMaterial;

  beforeEach(() => {
    mat = new THREE.MeshPhysicalMaterial({
      roughness: 0.5,
      metalness: 0.2,
      clearcoat: 0.5,
      clearcoatRoughness: 0.1,
      transmission: 0.5,
      ior: 1.5
    });

    mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
    model = new THREE.Group();
    model.add(mesh);
  });

  describe('Dynamic uniform updates (applyPbrUniforms)', () => {
    it('updates roughness and metalness without setting needsUpdate = true or incrementing version', () => {
      const initialVersion = mat.version;
      const setterSpy = vi.spyOn(mat, 'needsUpdate', 'set');

      applyPbrUniforms(model, { roughness: 0.85, metalness: 0.9 });

      expect(mat.roughness).toBe(0.85);
      expect(mat.metalness).toBe(0.9);
      expect(setterSpy).not.toHaveBeenCalledWith(true);
      expect(mat.version).toBe(initialVersion);
      setterSpy.mockRestore();
    });

    it('updates normalScale and aoMapIntensity without triggering recompilation', () => {
      const initialVersion = mat.version;
      const setterSpy = vi.spyOn(mat, 'needsUpdate', 'set');

      applyPbrUniforms(model, { normalScale: 2.0, aoMapIntensity: 1.5 });

      expect(mat.normalScale.x).toBe(2.0);
      expect(mat.normalScale.y).toBe(2.0);
      expect(mat.aoMapIntensity).toBe(1.5);
      expect(setterSpy).not.toHaveBeenCalledWith(true);
      expect(mat.version).toBe(initialVersion);
      setterSpy.mockRestore();
    });

    it('updates physical properties (clearcoat, transmission, ior) without setting needsUpdate', () => {
      const initialVersion = mat.version;
      const setterSpy = vi.spyOn(mat, 'needsUpdate', 'set');

      applyPbrUniforms(model, {
        clearcoat: 0.8,
        clearcoatRoughness: 0.25,
        transmission: 0.9,
        ior: 1.52
      });

      expect(mat.clearcoat).toBe(0.8);
      expect(mat.clearcoatRoughness).toBe(0.25);
      expect(mat.transmission).toBe(0.9);
      expect(mat.ior).toBe(1.52);
      expect(setterSpy).not.toHaveBeenCalledWith(true);
      expect(mat.version).toBe(initialVersion);
      setterSpy.mockRestore();
    });

    it('updates emissive and albedo colors without setting needsUpdate', () => {
      const initialVersion = mat.version;
      const setterSpy = vi.spyOn(mat, 'needsUpdate', 'set');

      applyPbrUniforms(model, {
        color: '#ff8800',
        emissive: '#002244',
        emissiveIntensity: 3.5
      });

      expect(mat.color.getHexString()).toBe('ff8800');
      expect(mat.emissive.getHexString()).toBe('002244');
      expect(mat.emissiveIntensity).toBe(3.5);
      expect(setterSpy).not.toHaveBeenCalledWith(true);
      expect(mat.version).toBe(initialVersion);
      setterSpy.mockRestore();
    });

    it('handles simulated 60 FPS slider dragging without ever setting needsUpdate = true', () => {
      const initialVersion = mat.version;
      const setterSpy = vi.spyOn(mat, 'needsUpdate', 'set');

      for (let i = 0; i <= 60; i++) {
        const factor = i / 60;
        applyPbrUniforms(model, {
          roughness: factor,
          metalness: 1.0 - factor,
          aoMapIntensity: factor * 2
        });

        expect(setterSpy).not.toHaveBeenCalledWith(true);
      }

      expect(mat.roughness).toBe(1.0);
      expect(mat.metalness).toBe(0.0);
      expect(mat.aoMapIntensity).toBe(2.0);
      expect(mat.version).toBe(initialVersion);
      setterSpy.mockRestore();
    });

    it('updates multiple meshes across a nested hierarchy without recompilation', () => {
      const childGroup = new THREE.Group();
      const mat2 = new THREE.MeshStandardMaterial({ roughness: 0.2 });
      const mesh2 = new THREE.Mesh(new THREE.SphereGeometry(0.5), mat2);
      childGroup.add(mesh2);
      model.add(childGroup);

      const mat1Version = mat.version;
      const mat2Version = mat2.version;
      const spy1 = vi.spyOn(mat, 'needsUpdate', 'set');
      const spy2 = vi.spyOn(mat2, 'needsUpdate', 'set');

      applyPbrUniforms(model, { roughness: 0.75 });

      expect(mat.roughness).toBe(0.75);
      expect(mat2.roughness).toBe(0.75);
      expect(spy1).not.toHaveBeenCalledWith(true);
      expect(spy2).not.toHaveBeenCalledWith(true);
      expect(mat.version).toBe(mat1Version);
      expect(mat2.version).toBe(mat2Version);

      spy1.mockRestore();
      spy2.mockRestore();
    });
  });

  describe('Texture slot and colorSpace changes (applyPbrTextures)', () => {
    it('sets needsUpdate = true and increments version when a new texture map is assigned to an empty slot', () => {
      const initialVersion = mat.version;
      const setterSpy = vi.spyOn(mat, 'needsUpdate', 'set');
      const tex = new THREE.Texture();

      applyPbrTextures(model, { map: tex });

      expect(mat.map).toBe(tex);
      expect(setterSpy).toHaveBeenCalledWith(true);
      expect(mat.version).toBe(initialVersion + 1);
      setterSpy.mockRestore();
    });

    it('sets needsUpdate = true when an assigned texture is removed/cleared', () => {
      const tex = new THREE.Texture();
      mat.map = tex;
      const initialVersion = mat.version;
      const setterSpy = vi.spyOn(mat, 'needsUpdate', 'set');

      applyPbrTextures(model, { map: null });

      expect(mat.map).toBeNull();
      expect(setterSpy).toHaveBeenCalledWith(true);
      expect(mat.version).toBe(initialVersion + 1);
      setterSpy.mockRestore();
    });

    it('sets needsUpdate = true when texture colorSpace changes', () => {
      const tex = new THREE.Texture();
      tex.colorSpace = THREE.NoColorSpace;
      mat.map = tex;

      const initialVersion = mat.version;
      const setterSpy = vi.spyOn(mat, 'needsUpdate', 'set');

      const newTex = tex.clone();
      newTex.colorSpace = THREE.SRGBColorSpace;

      applyPbrTextures(model, { map: newTex });

      expect(setterSpy).toHaveBeenCalledWith(true);
      expect(mat.version).toBe(initialVersion + 1);
      setterSpy.mockRestore();
    });

    it('sets needsUpdate = true when changing debugChannel', () => {
      const initialVersion = mat.version;
      const setterSpy = vi.spyOn(mat, 'needsUpdate', 'set');

      applyPbrTextures(model, { debugChannel: 'normal' }, 'lit');

      expect(setterSpy).toHaveBeenCalledWith(true);
      expect(mat.version).toBe(initialVersion + 1);
      setterSpy.mockRestore();
    });

    it('keeps needsUpdate = false when called with unchanged texture assignments', () => {
      const tex = new THREE.Texture();
      mat.map = tex;

      const initialVersion = mat.version;
      const setterSpy = vi.spyOn(mat, 'needsUpdate', 'set');

      // Passing identical texture reference
      applyPbrTextures(model, { map: tex });

      expect(setterSpy).not.toHaveBeenCalledWith(true);
      expect(mat.version).toBe(initialVersion);
      setterSpy.mockRestore();
    });
  });

  describe('Integrated applyPbrState & Edge cases', () => {
    it('applies uniforms via applyPbrState without setting needsUpdate when no textures change', async () => {
      const initialVersion = mat.version;
      const setterSpy = vi.spyOn(mat, 'needsUpdate', 'set');

      await applyPbrState({
        model,
        roughnessFactor: 0.35,
        metalnessFactor: 0.85,
        aoIntensity: 1.2
      });

      expect(mat.roughness).toBe(0.35);
      expect(mat.metalness).toBe(0.85);
      expect(mat.aoMapIntensity).toBe(1.2);
      expect(setterSpy).not.toHaveBeenCalledWith(true);
      expect(mat.version).toBe(initialVersion);
      setterSpy.mockRestore();
    });

    it('safely handles null/empty model in applyPbrUniforms without throwing', () => {
      expect(() => {
        applyPbrUniforms(null as any, { roughness: 0.5 });
      }).not.toThrow();
    });

    it('handles Vector2 and normalInvertY in applyPbrUniforms', () => {
      applyPbrUniforms(model, {
        normalScale: 1.5,
        normalInvertY: true
      });
      expect(mat.normalScale.x).toBe(1.5);
      expect(mat.normalScale.y).toBe(-1.5);

      applyPbrUniforms(model, {
        normalScale: new THREE.Vector2(2.5, 3.5)
      });
      expect(mat.normalScale.x).toBe(2.5);
      expect(mat.normalScale.y).toBe(3.5);
    });
  });

  describe('viewportBridge single context & preview sharing', () => {
    it('manages registration, initialization status, and teardown cleanly', async () => {
      const { viewportBridge } = await import('../utils/viewportBridge');

      viewportBridge.unregister();
      expect(viewportBridge.isInitialized()).toBe(false);

      const mockGl = {
        render: vi.fn(),
        domElement: { width: 512, height: 512 }
      } as any;
      const mockScene = new THREE.Scene();
      const mockCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
      mockCamera.position.set(0, 2, 4);

      let notified = 0;
      const unsub = viewportBridge.subscribe(() => {
        notified++;
      });

      viewportBridge.register(mockGl, mockScene, mockCamera);
      expect(viewportBridge.isInitialized()).toBe(true);
      expect(viewportBridge.gl).toBe(mockGl);
      expect(viewportBridge.scene).toBe(mockScene);
      expect(viewportBridge.camera).toBe(mockCamera);
      expect(notified).toBe(1);

      viewportBridge.registerModel(model);
      expect(viewportBridge.modelGroup).toBe(model);
      expect(notified).toBe(2);

      // Orbit camera on demand
      const prevX = mockCamera.position.x;
      const prevZ = mockCamera.position.z;
      viewportBridge.orbit(0.5, 0.1);
      expect(mockCamera.position.x).not.toBe(prevX);
      expect(notified).toBe(3);

      // Reset camera
      viewportBridge.resetCamera();
      expect(notified).toBe(4);

      unsub();
      viewportBridge.unregister();
      expect(viewportBridge.isInitialized()).toBe(false);
      expect(notified).toBe(4); // No notification after unsub
    });

    it('renderPreview returns false when bridge is uninitialized, and true when active', async () => {
      const { viewportBridge } = await import('../utils/viewportBridge');
      viewportBridge.unregister();

      const mockCanvas = {
        clientWidth: 260,
        clientHeight: 260,
        width: 260,
        height: 260,
        getContext: vi.fn().mockReturnValue({
          save: vi.fn(),
          clearRect: vi.fn(),
          drawImage: vi.fn(),
          restore: vi.fn()
        })
      } as any;

      expect(viewportBridge.renderPreview(mockCanvas)).toBe(false);

      const mockGl = {
        render: vi.fn(),
        domElement: mockCanvas
      } as any;
      viewportBridge.register(mockGl, new THREE.Scene(), new THREE.PerspectiveCamera());

      const success = viewportBridge.renderPreview(mockCanvas);
      expect(success).toBe(true);
      expect(mockGl.render).toHaveBeenCalled();

      viewportBridge.unregister();
    });
  });
});

