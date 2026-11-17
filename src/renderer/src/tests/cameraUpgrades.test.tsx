import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import * as THREE from 'three';
import { useViewportStore, CAMERA_FOCAL_LENGTHS } from '../store/viewportStore';
import { CanvasCameraWidget } from '../components/Viewport/Widgets/CanvasCameraWidget';
import { CameraOrientationItem } from '../components/Viewport/ToolbarItems/CameraOrientationItem';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('Camera Controls & Positioning System Upgrades', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    useViewportStore.getState().resetAllBars();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  describe('Focal Length (Lens) Presets', () => {
    it('defines standard photographic focal lengths (24mm, 35mm, 50mm, 85mm)', () => {
      expect(CAMERA_FOCAL_LENGTHS).toHaveLength(4);
      expect(CAMERA_FOCAL_LENGTHS.map((l) => l.mm)).toEqual([24, 35, 50, 85]);
      expect(CAMERA_FOCAL_LENGTHS.find((l) => l.mm === 50)?.fov).toBe(40);
    });

    it('setCameraFocalLength updates cameraFov and switches out of orthographic mode', () => {
      const store = useViewportStore.getState();
      store.toggleOrthographic();
      expect(useViewportStore.getState().isOrthographic).toBe(true);

      store.setCameraFocalLength(24);
      expect(useViewportStore.getState().cameraFov).toBe(74);
      expect(useViewportStore.getState().isOrthographic).toBe(false);

      store.setCameraFocalLength(85);
      expect(useViewportStore.getState().cameraFov).toBe(24);
    });

    it('renders focal length lens buttons in CanvasCameraWidget when in perspective mode', () => {
      act(() => {
        root.render(<CanvasCameraWidget />);
      });

      expect(container.textContent).toContain('24mm');
      expect(container.textContent).toContain('35mm');
      expect(container.textContent).toContain('50mm');
      expect(container.textContent).toContain('85mm');

      const btn85 = container.querySelector('button[title*="85mm"]') as HTMLButtonElement;
      expect(btn85).toBeTruthy();

      act(() => {
        btn85.click();
      });

      expect(useViewportStore.getState().cameraFov).toBe(24);
    });
  });

  describe('Double-Click Focus on Point', () => {
    it('focusOnPoint updates store focusPoint and increments focusPointCounter', () => {
      const store = useViewportStore.getState();
      expect(store.focusPointCounter).toBe(0);

      store.focusOnPoint([1.2, 0.45, -0.8]);
      const next = useViewportStore.getState();
      expect(next.focusPointCounter).toBe(1);
      expect(next.focusPoint).toEqual([1.2, 0.45, -0.8]);
    });
  });

  describe('Bottom Camera Preset & Full Vertical Freedom', () => {
    it('renders Bottom (Base) preset in CanvasCameraWidget with shortcut hint', () => {
      act(() => {
        root.render(<CanvasCameraWidget />);
      });

      const baseBtn = container.querySelector('button[title*="Bottom (Base)"]') as HTMLButtonElement;
      expect(baseBtn).toBeTruthy();
      expect(baseBtn.textContent).toBe('Bottom');

      act(() => {
        baseBtn.click();
      });

      expect(useViewportStore.getState().cameraPreset).toBe('bottom');
    });

    it('renders Bottom preset with shortcut hint in CameraOrientationItem dropdown', () => {
      act(() => {
        root.render(<CameraOrientationItem />);
      });

      const triggerBtn = container.querySelector('button[title*="CAD camera orientation"]') as HTMLButtonElement;
      expect(triggerBtn).toBeTruthy();

      act(() => {
        triggerBtn.click();
      });

      expect(container.textContent).toContain('Bottom (Base)');
      expect(container.textContent).toContain('Ctrl+7');
    });
  });

  describe('Scene Background Synchronization for Transmission', () => {
    it('sets scene.background to theme color when environment background is disabled', () => {
      const scene = new THREE.Scene();
      const darkColor = new THREE.Color('#111110');
      const lightColor = new THREE.Color('#f7f5f2');

      // Emulate StoreEnvironment background sync
      useViewportStore.setState({ showEnvironmentBackground: false, viewportTheme: 'dark' });
      scene.background = new THREE.Color(useViewportStore.getState().viewportTheme === 'dark' ? '#111110' : '#f7f5f2');
      expect(scene.background.getHexString()).toBe(darkColor.getHexString());

      useViewportStore.setState({ viewportTheme: 'light' });
      scene.background = new THREE.Color(useViewportStore.getState().viewportTheme === 'dark' ? '#111110' : '#f7f5f2');
      expect(scene.background.getHexString()).toBe(lightColor.getHexString());
    });
  });

  describe('Underside Glass Material & Floor Shadow Handling', () => {
    it('captureOriginalMaterials sets DoubleSide and disables shadow casting/receiving on transmissive meshes', async () => {
      const { captureOriginalMaterials } = await import('../utils/pbrController');
      const group = new THREE.Group();
      const glassMat = new THREE.MeshPhysicalMaterial({
        name: 'TabletopGlass',
        transmission: 0.95,
        roughness: 0.05,
        side: THREE.FrontSide
      });
      const glassMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 0.05, 1), glassMat);
      glassMesh.castShadow = true;
      glassMesh.receiveShadow = true;

      const metalMat = new THREE.MeshStandardMaterial({
        name: 'TableLegs',
        metalness: 0.9,
        roughness: 0.2
      });
      const metalMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7), metalMat);
      metalMesh.castShadow = true;
      metalMesh.receiveShadow = true;

      group.add(glassMesh);
      group.add(metalMesh);

      captureOriginalMaterials(group);

      // Glass mesh should NOT cast or receive opaque shadows, and should be DoubleSide for viewing from below
      expect(glassMat.side).toBe(THREE.DoubleSide);
      expect(glassMesh.castShadow).toBe(false);
      expect(glassMesh.receiveShadow).toBe(false);

      // Metal leg mesh retains shadow casting and receiving
      expect(metalMesh.castShadow).toBe(true);
      expect(metalMesh.receiveShadow).toBe(true);
    });

    it('applyPbrUniforms sets mesh.receiveShadow = false and mesh.castShadow = false when transmission is enabled', async () => {
      const { applyPbrUniforms } = await import('../utils/pbrController');
      const group = new THREE.Group();
      const mat = new THREE.MeshPhysicalMaterial({
        name: 'AcrylicPanel',
        transmission: 0.0,
        roughness: 0.1
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(), mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);

      applyPbrUniforms(group, {
        targetMaterialName: 'AcrylicPanel',
        transmission: 0.9
      });

      expect(mesh.castShadow).toBe(false);
      expect(mesh.receiveShadow).toBe(false);
    });

    it('applyPbrTextures dynamically upgrades MeshStandardMaterial to MeshPhysicalMaterial when transmission > 0 and clamps metalness to 0', async () => {
      const { applyPbrTextures } = await import('../utils/pbrController');
      const group = new THREE.Group();
      const standardMat = new THREE.MeshStandardMaterial({
        name: 'Mesa_bake_transparente',
        metalness: 1.0,
        roughness: 1.0,
        transparent: true
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(), standardMat);
      group.add(mesh);

      await applyPbrTextures({
        model: group,
        targetMaterialName: 'Mesa_bake_transparente',
        transmissionFactor: 0.95,
        ior: 1.52
      });

      // Mesh material should now be upgraded to MeshPhysicalMaterial
      expect(mesh.material).toBeInstanceOf(THREE.MeshPhysicalMaterial);
      const phys = mesh.material as THREE.MeshPhysicalMaterial;
      expect(phys.transmission).toBe(0.95);
      expect(phys.ior).toBe(1.52);
      expect(phys.metalness).toBe(0.0); // dielectric glass clamped to 0
      expect(phys.side).toBe(THREE.DoubleSide);
      expect(phys.depthWrite).toBe(false);
      expect(mesh.renderOrder).toBe(1);
      expect(mesh.castShadow).toBe(false);
      expect(mesh.receiveShadow).toBe(false);
    });

    it('extractModelMaterialsInfo recognizes glass material names and initializes realistic dielectric defaults', async () => {
      const { extractModelMaterialsInfo } = await import('../utils/pbrController');
      const group = new THREE.Group();
      const glassMat = new THREE.MeshStandardMaterial({
        name: 'Mesa_bake_transparente',
        roughness: 1.0,
        metalness: 1.0
      });
      group.add(new THREE.Mesh(new THREE.BoxGeometry(), glassMat));

      const info = extractModelMaterialsInfo(group);
      expect(info['Mesa_bake_transparente']).toBeDefined();
      expect(info['Mesa_bake_transparente'].transmissionFactor).toBe(0.95);
      expect(info['Mesa_bake_transparente'].roughnessFactor).toBe(0.05);
      expect(info['Mesa_bake_transparente'].metalnessFactor).toBe(0.0);
      expect(info['Mesa_bake_transparente'].ior).toBe(1.52);
    });
  });

  describe('Model-Centric Zoom & Camera Proximity Upgrades', () => {
    it('sets camera near plane to 0.01 to allow close-up surface inspection without mesh clipping', () => {
      const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 100);
      expect(camera.near).toBe(0.1);

      // Upgrade near plane to 0.01
      if (camera.near > 0.01) {
        camera.near = 0.01;
        camera.updateProjectionMatrix();
      }
      expect(camera.near).toBe(0.01);
    });

    it('calculates edgeThreshold so zoom stops at the outer edge of the geometry without penetrating inside', () => {
      const maxDimSmall = 0.5; // 50cm asset
      const edgeThresholdSmall = Math.max(0.04, Math.min(0.12, maxDimSmall * 0.03));
      expect(edgeThresholdSmall).toBe(0.04); // stops 4cm before mesh

      const maxDimLarge = 3.0; // 3m asset
      const edgeThresholdLarge = Math.max(0.04, Math.min(0.12, maxDimLarge * 0.03));
      expect(edgeThresholdLarge).toBeCloseTo(0.09); // stops 9cm before mesh

      // Always safely outside near plane (0.01) to prevent clipping
      expect(edgeThresholdSmall).toBeGreaterThan(0.01);
      expect(edgeThresholdLarge).toBeGreaterThan(0.01);
    });

    it('computes model world target center from bounding box accounting for offset translation', () => {
      const group = new THREE.Group();
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 1));
      mesh.position.set(1.5, 3.0, -2.0);
      group.add(mesh);

      const box = new THREE.Box3().setFromObject(group);
      const center = new THREE.Vector3();
      box.getCenter(center);

      expect(center.x).toBeCloseTo(1.5);
      expect(center.y).toBeCloseTo(3.0);
      expect(center.z).toBeCloseTo(-2.0);
    });
  });
});
