import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import * as THREE from 'three';
import { useModelStore } from '../store/modelStore';
import { useViewportStore } from '../store/viewportStore';
import {
  commandManager,
  SetModelPositionCommand,
  SetModelRotationCommand
} from '../utils/commandManager';
import { DEFAULT_KEYBINDS } from '../utils/keybindsManager';
import { bakeModelTransforms } from '../utils/viewportBridge';
import { ModelTransformControls } from '../components/Staging/ModelTransformControls';
import { ViewportToolbar } from '../components/Viewport/ViewportToolbar';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('3D Transform Gizmo & Viewport Staging', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    useModelStore.getState().resetModel();
    useViewportStore.getState().setTransformGizmoMode('none');

    // Drain commandManager stack
    while (commandManager.canUndo()) {
      commandManager.undo();
    }
    while (commandManager.canRedo()) {
      commandManager.redo();
    }
    while (commandManager.canUndo()) {
      commandManager.undo();
    }
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  describe('modelStore position state & actions', () => {
    it('initializes modelPosition to { x: 0, y: 0, z: 0 }', () => {
      const state = useModelStore.getState();
      expect(state.modelPosition).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('updates position coordinates via setPosition', () => {
      const store = useModelStore.getState();
      act(() => {
        store.setPosition({ x: 1.25, z: -0.8 });
      });

      expect(useModelStore.getState().modelPosition).toEqual({
        x: 1.25,
        y: 0,
        z: -0.8
      });
    });

    it('resets position to zero via resetPosition', () => {
      const store = useModelStore.getState();
      act(() => {
        store.setPosition({ x: 2.0, y: 1.5, z: 3.2 });
      });
      expect(useModelStore.getState().modelPosition.x).toBe(2.0);

      act(() => {
        store.resetPosition();
      });
      expect(useModelStore.getState().modelPosition).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('resets modelPosition when resetModel or setModel is called', () => {
      const store = useModelStore.getState();
      act(() => {
        store.setPosition({ x: 5, y: 2, z: 1 });
      });

      act(() => {
        store.resetModel();
      });
      expect(useModelStore.getState().modelPosition).toEqual({ x: 0, y: 0, z: 0 });

      act(() => {
        store.setPosition({ x: 3, y: 4, z: 5 });
      });
      act(() => {
        store.setModel('test.glb', 'blob:test', 100);
      });
      expect(useModelStore.getState().modelPosition).toEqual({ x: 0, y: 0, z: 0 });
    });
  });

  describe('viewportStore gizmo mode state & actions', () => {
    it('initializes transformGizmoMode to "none"', () => {
      const state = useViewportStore.getState();
      expect(state.transformGizmoMode).toBe('none');
    });

    it('toggles transformGizmoMode between none, translate, and rotate', () => {
      const store = useViewportStore.getState();

      act(() => {
        store.setTransformGizmoMode('translate');
      });
      expect(useViewportStore.getState().transformGizmoMode).toBe('translate');

      act(() => {
        store.setTransformGizmoMode('rotate');
      });
      expect(useViewportStore.getState().transformGizmoMode).toBe('rotate');

      act(() => {
        store.setTransformGizmoMode('none');
      });
      expect(useViewportStore.getState().transformGizmoMode).toBe('none');
    });
  });

  describe('CommandManager undo/redo for transforms', () => {
    it('executes and undoes SetModelPositionCommand', async () => {
      expect(useModelStore.getState().modelPosition).toEqual({ x: 0, y: 0, z: 0 });

      await commandManager.execute(new SetModelPositionCommand({ x: 1.5, y: 0.5, z: -2.0 }));
      expect(useModelStore.getState().modelPosition).toEqual({ x: 1.5, y: 0.5, z: -2.0 });

      await commandManager.undo();
      expect(useModelStore.getState().modelPosition).toEqual({ x: 0, y: 0, z: 0 });

      await commandManager.redo();
      expect(useModelStore.getState().modelPosition).toEqual({ x: 1.5, y: 0.5, z: -2.0 });
    });

    it('executes and undoes SetModelRotationCommand', async () => {
      expect(useModelStore.getState().modelRotation).toEqual({ x: 0, y: 0, z: 0 });

      await commandManager.execute(new SetModelRotationCommand({ x: 90, y: 45, z: 0 }));
      expect(useModelStore.getState().modelRotation).toEqual({ x: 90, y: 45, z: 0 });

      await commandManager.undo();
      expect(useModelStore.getState().modelRotation).toEqual({ x: 0, y: 0, z: 0 });

      await commandManager.redo();
      expect(useModelStore.getState().modelRotation).toEqual({ x: 90, y: 45, z: 0 });
    });
  });

  describe('Keybinds configuration', () => {
    it('defines Q, W, E as default shortcuts for 3D transform tools', () => {
      expect(DEFAULT_KEYBINDS['gizmo.select']).toBe('Q');
      expect(DEFAULT_KEYBINDS['gizmo.translate']).toBe('W');
      expect(DEFAULT_KEYBINDS['gizmo.rotate']).toBe('E');
    });
  });

  describe('Export centering invariance', () => {
    it('bakes only rotation and grounding into mesh geometry, ignoring staging translation', () => {
      // Simulate a box mesh representing a piece of furniture
      const geom = new THREE.BoxGeometry(1, 1, 1);
      const mesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial());
      const scene = new THREE.Group();
      scene.add(mesh);

      // Centered and grounded at base (Y=0)
      mesh.position.set(0, 0.5, 0);

      // Apply rotation (e.g. 90 deg around Y)
      scene.rotation.set(0, Math.PI / 2, 0);
      scene.updateMatrixWorld(true);

      // Simulate placing the scene inside a translated pivot group (modelPosition)
      const pivotGroup = new THREE.Group();
      pivotGroup.position.set(10.0, 5.0, -8.0); // Large staging translation
      pivotGroup.add(scene);
      pivotGroup.updateMatrixWorld(true);

      // When exporting, bakeModelTransforms is called on the registered scene object
      const baked = bakeModelTransforms(scene);
      const bakedBbox = new THREE.Box3().setFromObject(baked);
      const bakedCenter = new THREE.Vector3();
      bakedBbox.getCenter(bakedCenter);

      // The baked object must remain centered around X=0 and Z=0, not shifted by (10, 5, -8)
      expect(Math.abs(bakedCenter.x)).toBeLessThan(0.01);
      expect(Math.abs(bakedCenter.z)).toBeLessThan(0.01);
      // And the bottom rests at Y=0
      expect(Math.abs(bakedBbox.min.y)).toBeLessThan(0.01);
    });
  });

  describe('UI Component integration', () => {
    it('renders ModelTransformControls with position inputs', () => {
      // Mock stats so the component renders
      useModelStore.getState().setModelStats({
        triangleCount: 500,
        vertexCount: 300,
        meshCount: 1,
        materials: ['Material_1'],
        dimensions: { width: 1.0, height: 1.2, depth: 0.8 }
      });

      act(() => {
        root.render(<ModelTransformControls />);
      });

      // Verify Position labels
      expect(container.textContent).toContain('Scene Position');
      expect(container.textContent).toContain('X Axis');
      expect(container.textContent).toContain('Y Axis');
      expect(container.textContent).toContain('Z Axis');
    });

    it('renders 3D Transform Gizmo mode selector in ViewportToolbar', () => {
      act(() => {
        root.render(<ViewportToolbar />);
      });

      const gizmoGroup = container.querySelector('[aria-label="3D transform tools"]');
      expect(gizmoGroup).toBeTruthy();

      const gizmoButtons = gizmoGroup?.querySelectorAll('button');
      expect(gizmoButtons?.length).toBe(3);

      // Click "Move" button
      act(() => {
        gizmoButtons?.[1]?.click();
      });
      expect(useViewportStore.getState().transformGizmoMode).toBe('translate');

      // Click "Rotar" button
      act(() => {
        gizmoButtons?.[2]?.click();
      });
      expect(useViewportStore.getState().transformGizmoMode).toBe('rotate');

      // Click "Cursor" button
      act(() => {
        gizmoButtons?.[0]?.click();
      });
      expect(useViewportStore.getState().transformGizmoMode).toBe('none');
    });
  });
});
