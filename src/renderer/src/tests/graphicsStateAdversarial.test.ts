import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => `/mock/${name}`),
    commandLine: {
      appendSwitch: vi.fn()
    }
  }
}));

import {
  applyPbrUniforms,
  applyPbrTextures,
  applyPbrState,
  clearTextureCache,
  type PbrUniformValues,
  type PbrTextureValues
} from '../utils/pbrController';

import {
  useVariantStore,
  deriveAvailableTexturesForSlot,
  type MapVariantItem,
  selectColorways
} from '../store/variantStore';

import {
  usePbrMaterialStore,
  ALL_SLOT_NAMES,
  type SlotName
} from '../store/pbrMaterialStore';

import { useAppStore } from '../store/appStore';
import { viewportBridge } from '../utils/viewportBridge';

import {
  SettingsService,
  deepMerge,
  type DeepPartial,
  type MirageSettings,
  DEFAULT_SETTINGS
} from '../../../main/settingsService';

describe('Adversarial Graphics & State Stress Harness (M5 - R1 & R2)', () => {
  // =========================================================================
  // Requirement R1: PBR Material Uniform Updates Micro-Benchmark & Invalidation
  // =========================================================================
  describe('Requirement R1: PBR Material Uniform Updates', () => {
    let rootGroup: THREE.Group;
    let standardMat1: THREE.MeshStandardMaterial;
    let standardMat2: THREE.MeshStandardMaterial;
    let physicalMat1: THREE.MeshPhysicalMaterial;
    let physicalMat2: THREE.MeshPhysicalMaterial;
    let physicalMat3: THREE.MeshPhysicalMaterial;
    let allMaterials: (THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial)[];

    beforeEach(() => {
      clearTextureCache();

      // Construct a multi-tier hierarchy with varied materials and non-mesh nodes
      rootGroup = new THREE.Group();
      rootGroup.name = 'RootGroup';

      standardMat1 = new THREE.MeshStandardMaterial({
        roughness: 0.5,
        metalness: 0.1,
        color: new THREE.Color(0xffffff)
      });
      const mesh1 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), standardMat1);
      rootGroup.add(mesh1);

      physicalMat1 = new THREE.MeshPhysicalMaterial({
        roughness: 0.4,
        metalness: 0.2,
        clearcoat: 0.5,
        clearcoatRoughness: 0.1,
        color: new THREE.Color(0xaaaaaa)
      });
      const mesh2 = new THREE.Mesh(new THREE.SphereGeometry(0.5), physicalMat1);
      rootGroup.add(mesh2);

      // Sub-group with multi-material mesh
      const subGroup = new THREE.Group();
      standardMat2 = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.3 });
      physicalMat2 = new THREE.MeshPhysicalMaterial({ roughness: 0.7, metalness: 0.4, clearcoat: 0.8 });
      const multiMatMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1), [standardMat2, physicalMat2]);
      subGroup.add(multiMatMesh);

      // Nested deeper sub-group
      const deepGroup = new THREE.Group();
      physicalMat3 = new THREE.MeshPhysicalMaterial({ roughness: 0.3, metalness: 0.8, clearcoat: 0.2 });
      const deepMesh = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.1), physicalMat3);
      deepGroup.add(deepMesh);

      // Non-mesh node to test safe traversal
      const points = new THREE.Points(
        new THREE.BufferGeometry(),
        new THREE.PointsMaterial({ size: 1 })
      );
      deepGroup.add(points);

      subGroup.add(deepGroup);
      rootGroup.add(subGroup);

      allMaterials = [standardMat1, standardMat2, physicalMat1, physicalMat2, physicalMat3];
    });

    it('MICRO-BENCHMARK: 1000 simulated slider ticks strictly NEVER set mat.needsUpdate = true and DO NOT increment version', () => {
      const initialVersions = allMaterials.map((m) => m.version);
      const spies = allMaterials.map((m) => vi.spyOn(m, 'needsUpdate', 'set'));

      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        const factor = (i % 100) / 100;
        const aoFactor = (i % 50) / 25;
        // In physical materials, clearcoat slider operates across active range [0.01, 1.0]
        const ccFactor = 0.05 + ((i % 20) / 20) * 0.95;
        const normScale = i % 2 === 0 ? 1.5 : new THREE.Vector2(0.75, -0.75);
        const col = i % 2 === 0 ? '#4488cc' : new THREE.Color(0.25, 0.5, 0.75);
        const emissiveCol = i % 2 === 0 ? '#112233' : new THREE.Color(0.05, 0.1, 0.15);

        applyPbrUniforms(rootGroup, {
          roughness: factor,
          metalness: 1.0 - factor,
          aoMapIntensity: aoFactor,
          normalScale: normScale,
          clearcoat: ccFactor,
          clearcoatRoughness: 0.15,
          emissiveIntensity: 2.0,
          color: col,
          emissive: emissiveCol
        });

        // Strict assertion per tick: needsUpdate setter must NEVER have been called with true
        for (const spy of spies) {
          expect(spy).not.toHaveBeenCalledWith(true);
        }
      }

      const elapsed = performance.now() - startTime;
      console.log(`[CHALLENGER 1 BENCHMARK] 1000 uniform updates across 5 materials completed in ${elapsed.toFixed(2)}ms (${(elapsed / 1000).toFixed(4)}ms/tick)`);

      // NOTE: there is deliberately NO wall-clock ceiling here.
      //
      // An `expect(elapsed).toBeLessThan(500)` used to live at this point. It was
      // a flake source under parallel test load and it added nothing: if this
      // path regressed to forcing shader recompiles, the per-tick
      // `needsUpdate` spies and the `material.version` checks below fail
      // deterministically. `elapsed` is logged for humans instead.

      // Verify that version was strictly NOT incremented on any material
      for (let idx = 0; idx < allMaterials.length; idx++) {
        expect(allMaterials[idx].version).toBe(initialVersions[idx]);
      }

      // Verify final tick property values are accurately reflected on all meshes
      expect(standardMat1.roughness).toBe(0.99);
      expect(standardMat1.metalness).toBeCloseTo(0.01, 5);
      expect(standardMat1.aoMapIntensity).toBe(1.96);
      expect(standardMat1.emissiveIntensity).toBe(2.0);

      expect(physicalMat1.roughness).toBe(0.99);
      expect(physicalMat1.clearcoat).toBeCloseTo(0.05 + (19 / 20) * 0.95, 5);

      // Verify multi-material mesh child materials both updated
      expect(standardMat2.roughness).toBe(0.99);
      expect(physicalMat2.roughness).toBe(0.99);
      expect(physicalMat2.clearcoat).toBeCloseTo(0.05 + (19 / 20) * 0.95, 5);

      // Verify deep nested mesh updated
      expect(physicalMat3.roughness).toBe(0.99);
      expect(physicalMat3.metalness).toBeCloseTo(0.01, 5);
      expect(physicalMat3.clearcoat).toBeCloseTo(0.05 + (19 / 20) * 0.95, 5);

      for (const spy of spies) {
        spy.mockRestore();
      }
    });

    it('Strict gating: assigning a texture map DOES set needsUpdate = true and increments version', () => {
      const mat = standardMat1;
      const initialVersion = mat.version;
      const spy = vi.spyOn(mat, 'needsUpdate', 'set');

      const texture = new THREE.Texture();
      applyPbrTextures(rootGroup, { map: texture });

      expect(mat.map).toBe(texture);
      expect(spy).toHaveBeenCalledWith(true);
      expect(mat.version).toBe(initialVersion + 1);

      spy.mockRestore();
    });

    it('Strict gating: assigning the EXACT SAME texture map is a no-op (no needsUpdate, no version bump)', () => {
      const mat = standardMat1;
      const texture = new THREE.Texture();
      applyPbrTextures(rootGroup, { map: texture });

      const versionAfterFirst = mat.version;
      const spy = vi.spyOn(mat, 'needsUpdate', 'set');

      // Re-apply same texture reference
      applyPbrTextures(rootGroup, { map: texture });

      expect(spy).not.toHaveBeenCalledWith(true);
      expect(mat.version).toBe(versionAfterFirst);

      spy.mockRestore();
    });

    it('Strict gating: changing texture colorSpace DOES set needsUpdate = true and increments version', () => {
      const mat = standardMat1;
      const texture = new THREE.Texture();
      texture.colorSpace = THREE.NoColorSpace;
      applyPbrTextures(rootGroup, { map: texture });

      const versionBeforeChange = mat.version;
      const spy = vi.spyOn(mat, 'needsUpdate', 'set');

      const updatedTexture = texture.clone();
      updatedTexture.colorSpace = THREE.SRGBColorSpace;
      applyPbrTextures(rootGroup, { map: updatedTexture });

      expect(spy).toHaveBeenCalledWith(true);
      expect(mat.version).toBe(versionBeforeChange + 1);

      spy.mockRestore();
    });

    it('Strict gating: removing a texture map DOES set needsUpdate = true and increments version', () => {
      const mat = standardMat1;
      const texture = new THREE.Texture();
      applyPbrTextures(rootGroup, { map: texture });

      const versionBeforeRemove = mat.version;
      const spy = vi.spyOn(mat, 'needsUpdate', 'set');

      applyPbrTextures(rootGroup, { map: null });

      expect(mat.map).toBeNull();
      expect(spy).toHaveBeenCalledWith(true);
      expect(mat.version).toBe(versionBeforeRemove + 1);

      spy.mockRestore();
    });

    it('Strict gating: changing debugChannel DOES set needsUpdate = true and increments version', () => {
      const mat = standardMat1;
      const initialVersion = mat.version;
      const spy = vi.spyOn(mat, 'needsUpdate', 'set');

      applyPbrTextures(rootGroup, { debugChannel: 'wireframe' }, 'lit');

      expect(spy).toHaveBeenCalledWith(true);
      expect(mat.version).toBe(initialVersion + 1);

      spy.mockRestore();
    });
  });

  // =========================================================================
  // Requirement R1: Single Active WebGL Context & Render Loop Gating
  // =========================================================================
  describe('Requirement R1: Single Active WebGL Context', () => {
    it('exactly one <Canvas> exists in the whole renderer', async () => {
      // Walk the renderer source and count React Three Fiber <Canvas> mounts.
      // A second one would mean a second WebGL context and a duplicated GLB.
      const root = path.resolve(__dirname, '..');
      const offenders: string[] = [];

      const walk = (dir: string) => {
        for (const entry of fsSync.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (entry.name === 'tests') continue;
            walk(full);
            continue;
          }
          if (!entry.name.endsWith('.tsx') && !entry.name.endsWith('.ts')) continue;
          const content = fsSync.readFileSync(full, 'utf-8');
          if (/<Canvas[\s>]/.test(content)) {
            offenders.push(path.relative(root, full));
          }
        }
      };
      walk(root);

      expect(offenders).toEqual(['components/Viewport/Canvas3D.tsx']);
    });

    it('EmbeddedViewport renders a 2D canvas fed by the shared renderer, never its own context', async () => {
      const viewportPath = path.resolve(__dirname, '../components/Viewport/EmbeddedViewport.tsx');
      const viewportContent = await fs.readFile(viewportPath, 'utf-8');

      // Must NOT mount an R3F canvas or import the fiber renderer.
      expect(viewportContent).not.toMatch(/<Canvas[\s>]/);
      expect(viewportContent).not.toMatch(/from\s+['"]@react-three\/fiber['"]/);

      // Must draw into a plain HTML canvas by copying the shared WebGL output.
      expect(viewportContent).toMatch(/<canvas[\s\S]*?ref=\{canvasRef\}/);
      expect(viewportContent).toContain('viewportBridge.renderPreview');
    });

    it('Canvas3D pauses frameloop when view is not workbench (frameloop="never")', async () => {
      const canvas3DPath = path.resolve(__dirname, '../components/Viewport/Canvas3D.tsx');
      const canvas3DContent = await fs.readFile(canvas3DPath, 'utf-8');

      // Canvas3D must dynamically pause the render loop based on currentView
      expect(canvas3DContent).toMatch(/frameloop=\{currentView === 'workbench' \? 'always' : 'never'\}/);
    });

    it('viewportBridge.renderPreview draws to 2D context without mounting a secondary WebGL context', () => {
      const mockSrcCanvas = document.createElement('canvas');
      mockSrcCanvas.width = 800;
      mockSrcCanvas.height = 600;

      const mockGl = {
        render: vi.fn(),
        domElement: mockSrcCanvas
      } as unknown as THREE.WebGLRenderer;

      const mockScene = new THREE.Scene();
      const mockCamera = new THREE.PerspectiveCamera();

      viewportBridge.register(mockGl, mockScene, mockCamera);
      expect(viewportBridge.isInitialized()).toBe(true);

      const targetCanvas = document.createElement('canvas');
      const drawImageSpy = vi.fn();
      const clearRectSpy = vi.fn();
      const saveSpy = vi.fn();
      const restoreSpy = vi.fn();

      const mock2dCtx = {
        save: saveSpy,
        restore: restoreSpy,
        clearRect: clearRectSpy,
        drawImage: drawImageSpy
      };

      vi.spyOn(targetCanvas, 'getContext').mockImplementation((type: string) => {
        if (type === '2d') return mock2dCtx as any;
        return null;
      });

      const success = viewportBridge.renderPreview(targetCanvas);

      expect(success).toBe(true);
      expect(mockGl.render).toHaveBeenCalledWith(mockScene, mockCamera);
      expect(targetCanvas.getContext).toHaveBeenCalledWith('2d');
      expect(drawImageSpy).toHaveBeenCalledWith(mockSrcCanvas, 0, 0, targetCanvas.width, targetCanvas.height);

      viewportBridge.unregister();
      expect(viewportBridge.isInitialized()).toBe(false);
    });

    it('App navigation retains single WebGL canvas in DOM while hiding during other views', async () => {
      const appPath = path.resolve(__dirname, '../App.tsx');
      const appContent = await fs.readFile(appPath, 'utf-8');

      // App must retain WorkbenchView in DOM with visibility style to preserve WebGL context
      expect(appContent).toMatch(/visibility:\s*currentView === 'workbench' \? 'visible' : 'hidden'/);
      // And pause pointer events when inactive
      expect(appContent).toContain("currentView === 'workbench'");
    });
  });

  // =========================================================================
  // Requirement R2: Settings Persistence Race Conditions Stress Harness
  // =========================================================================
  describe('Requirement R2: Settings Persistence Race Conditions', () => {
    let testDir: string;
    let settingsFile: string;
    let tempFile: string;

    beforeEach(async () => {
      testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mirage-race-test-'));
      settingsFile = path.join(testDir, 'settings.json');
      tempFile = `${settingsFile}.tmp`;
    });

    afterEach(async () => {
      try {
        await fs.rm(testDir, { recursive: true, force: true });
      } catch {}
    });

    it('STRESS TEST: 20 concurrent store client updates to different slices persist cleanly without data loss or corruption', async () => {
      const service = new SettingsService(settingsFile, DEFAULT_SETTINGS, 0);

      // Define 20 concurrent updates targeting distinct slices and nested keys
      const concurrentUpdates: DeepPartial<MirageSettings>[] = [
        { viewport: { cameraFov: 42 } },
        { viewport: { sunAzimuth: 135 } },
        { viewport: { sunElevation: 60 } },
        { viewport: { keyLightIntensity: 2.8 } },
        { viewport: { ambientLightIntensity: 0.75 } },
        { viewport: { fillLightIntensity: 0.9 } },
        { viewport: { environmentIntensity: 1.5 } },
        { viewport: { environmentPreset: 'sunset' } },
        { viewport: { lightingPreset: 'dramatic' } },
        { viewport: { directionalShadows: false } },
        { viewport: { contactShadowOpacity: 0.85 } },
        { viewport: { isOrthographic: true } },
        { viewport: { showEnvironmentBackground: false } },
        { viewport: { showDimensions: true } },
        { viewport: { showWireframe: true } },
        { viewport: { showGrid: false } },
        { themeMode: 'light' },
        { fontDensity: 'dense' },
        { defaultContactShadows: false },
        { defaultAutoRotate: true }
      ];

      // Execute all 20 updates concurrently
      const results = await Promise.all(
        concurrentUpdates.map((update) => service.updateSettings(update))
      );

      // All updates should report success
      for (const res of results) {
        expect(res.success).toBe(true);
      }

      await service.flush();

      // a) Verify no file corruption or truncation to 0 bytes occurs
      const fileStats = await fs.stat(settingsFile);
      expect(fileStats.size).toBeGreaterThan(0);

      const rawContent = await fs.readFile(settingsFile, 'utf-8');
      let parsedDiskState: MirageSettings;
      expect(() => {
        parsedDiskState = JSON.parse(rawContent);
      }).not.toThrow();
      parsedDiskState = JSON.parse(rawContent);

      // b) Verify all 20 updates are deep-merged without clobbering sibling keys
      expect(parsedDiskState.viewport.cameraFov).toBe(42);
      expect(parsedDiskState.viewport.sunAzimuth).toBe(135);
      expect(parsedDiskState.viewport.sunElevation).toBe(60);
      expect(parsedDiskState.viewport.keyLightIntensity).toBe(2.8);
      expect(parsedDiskState.viewport.ambientLightIntensity).toBe(0.75);
      expect(parsedDiskState.viewport.fillLightIntensity).toBe(0.9);
      expect(parsedDiskState.viewport.environmentIntensity).toBe(1.5);
      expect(parsedDiskState.viewport.environmentPreset).toBe('sunset');
      expect(parsedDiskState.viewport.lightingPreset).toBe('dramatic');
      expect(parsedDiskState.viewport.directionalShadows).toBe(false);
      expect(parsedDiskState.viewport.contactShadowOpacity).toBe(0.85);
      expect(parsedDiskState.viewport.isOrthographic).toBe(true);
      expect(parsedDiskState.viewport.showEnvironmentBackground).toBe(false);
      expect(parsedDiskState.viewport.showDimensions).toBe(true);
      expect(parsedDiskState.viewport.showWireframe).toBe(true);
      expect(parsedDiskState.viewport.showGrid).toBe(false);

      expect(parsedDiskState.themeMode).toBe('light');
      expect(parsedDiskState.fontDensity).toBe('dense');
      expect(parsedDiskState.defaultContactShadows).toBe(false);
      expect(parsedDiskState.defaultAutoRotate).toBe(true);

      // Preserved default settings that were not updated
      expect(parsedDiskState.defaultExportFormat).toBe('webp');

      // c) Verify temporary file is cleanly renamed and no leftover lock files remain
      const dirFiles = await fs.readdir(testDir);
      expect(dirFiles).toEqual(['settings.json']);
      expect(dirFiles).not.toContain('settings.json.tmp');
    });

    it('HIGH CONCURRENCY BURST: 50 sequential rapid updates coalesce and finalize cleanly on disk', async () => {
      const service = new SettingsService(settingsFile, DEFAULT_SETTINGS, 10, 100);

      for (let i = 0; i < 50; i++) {
        service.updateSettings({
          viewport: { cameraFov: 20 + i, sunAzimuth: i * 5 }
        } as any);
      }

      await service.flush();

      const raw = await fs.readFile(settingsFile, 'utf-8');
      const parsed = JSON.parse(raw);

      expect(parsed.viewport.cameraFov).toBe(69); // 20 + 49
      expect(parsed.viewport.sunAzimuth).toBe(245); // 49 * 5

      const dirFiles = await fs.readdir(testDir);
      expect(dirFiles).toContain('settings.json');
      expect(dirFiles).not.toContain('settings.json.tmp');
    });
  });

  // =========================================================================
  // Requirement R2: Variant Synchronization & Zombie Texture Prevention
  // =========================================================================
  describe('Requirement R2: Variant Synchronization & Zombie Prevention', () => {
    beforeEach(() => {
      useVariantStore.getState().resetVariants();
      usePbrMaterialStore.getState().resetPbrMaterials();
    });

    it('STRESS TEST: Delete texture from Variant A, switch to Variant B and back -> Zombie resurrection NEVER occurs', () => {
      const store = useVariantStore.getState();

      // 1. Create Variant A and Variant B
      store.createVariant('Variant A', false);
      const varAId = useVariantStore.getState().activeVariantId!;
      expect(varAId).not.toBe('var-default');

      store.createVariant('Variant B', false);
      const varBId = useVariantStore.getState().activeVariantId!;
      expect(varBId).not.toBe(varAId);

      // 2. Add shared baseColor texture
      const sharedBaseTexture: MapVariantItem = {
        id: 'tex-shared-marble-1',
        name: 'Marmol Carrara',
        url: 'blob:marmol-carrara',
        filePath: '/textures/marmol_carrara_base.webp',
        fileName: 'marmol_carrara_base.webp',
        fileSize: 4096
      };
      store.addMapVariant('baseColor', sharedBaseTexture);

      // Add unique roughness textures
      const varARoughness: MapVariantItem = {
        id: 'tex-a-rough',
        name: 'Roughness A',
        url: 'blob:rough-a',
        filePath: '/textures/rough_a.webp',
        fileName: 'rough_a.webp',
        fileSize: 1024
      };
      store.addMapVariant('roughness', varARoughness);

      const varBRoughness: MapVariantItem = {
        id: 'tex-b-rough',
        name: 'Roughness B',
        url: 'blob:rough-b',
        filePath: '/textures/rough_b.webp',
        fileName: 'rough_b.webp',
        fileSize: 1024
      };
      store.addMapVariant('roughness', varBRoughness);

      // Assign shared baseColor and varARoughness to Variant A
      store.selectVariant(varAId);
      store.selectMapVariant('baseColor', sharedBaseTexture.id);
      store.selectMapVariant('roughness', varARoughness.id);

      // Assign shared baseColor and varBRoughness to Variant B
      store.selectVariant(varBId);
      store.selectMapVariant('baseColor', sharedBaseTexture.id);
      store.selectMapVariant('roughness', varBRoughness.id);

      // Verify initial setup: both variants reference sharedBaseTexture
      const stateSetup = useVariantStore.getState();
      const varAState = stateSetup.variants.find((v) => v.id === varAId);
      const varBState = stateSetup.variants.find((v) => v.id === varBId);

      expect(varAState?.maps?.baseColor?.id).toBe(sharedBaseTexture.id);
      expect(varBState?.maps?.baseColor?.id).toBe(sharedBaseTexture.id);
      expect(varAState?.maps?.roughness?.id).toBe(varARoughness.id);
      expect(varBState?.maps?.roughness?.id).toBe(varBRoughness.id);

      // 3. Select Variant A and permanently remove the shared baseColor texture
      store.selectVariant(varAId);
      store.removeMapVariant('baseColor', sharedBaseTexture.id);

      // 4. Verification a: Permanently eliminated from all variants
      const stateAfterDelete = useVariantStore.getState();
      const varAPost = stateAfterDelete.variants.find((v) => v.id === varAId);
      const varBPost = stateAfterDelete.variants.find((v) => v.id === varBId);

      expect(varAPost?.maps?.baseColor).toBeUndefined();
      expect(varBPost?.maps?.baseColor).toBeUndefined(); // Inactive variant also cleansed!

      // Eliminated from mapVariants pool and derived colorways
      expect(stateAfterDelete.mapVariants.baseColor.some((m) => m.id === sharedBaseTexture.id)).toBe(false);
      expect(selectColorways(stateAfterDelete).some((c) => c.id === sharedBaseTexture.id)).toBe(false);

      // Active pbrMaterialStore map slot is cleared (filePath & url are null/falsy)
      const currentBaseMap = usePbrMaterialStore.getState().baseColorMap;
      expect(Boolean(currentBaseMap?.filePath || currentBaseMap?.url)).toBe(false);

      // 5. Verification b: Switch to Variant B -> Zombie texture resurrection NEVER occurs
      store.selectVariant(varBId);

      const stateInB = useVariantStore.getState();
      expect(stateInB.activeVariantId).toBe(varBId);
      expect(stateInB.activeVariantIds.baseColor).toBeNull();
      expect(stateInB.mapVariants.baseColor.some((m) => m.id === sharedBaseTexture.id)).toBe(false);
      const bBaseMap = usePbrMaterialStore.getState().baseColorMap;
      expect(Boolean(bBaseMap?.filePath || bBaseMap?.url)).toBe(false);

      // Variant B's other texture remains intact
      expect(stateInB.activeVariantIds.roughness).toBe(varBRoughness.id);
      expect(usePbrMaterialStore.getState().roughnessMap?.filePath).toBe(varBRoughness.filePath);

      // 6. Switch back to Variant A
      store.selectVariant(varAId);

      const stateBackInA = useVariantStore.getState();
      expect(stateBackInA.activeVariantId).toBe(varAId);
      expect(stateBackInA.activeVariantIds.baseColor).toBeNull();
      const aBaseMap = usePbrMaterialStore.getState().baseColorMap;
      expect(Boolean(aBaseMap?.filePath || aBaseMap?.url)).toBe(false);
      expect(stateBackInA.activeVariantIds.roughness).toBe(varARoughness.id);
      expect(usePbrMaterialStore.getState().roughnessMap?.filePath).toBe(varARoughness.filePath);

      // 7. Multiple round-trip variant switches to guarantee zero resurrection
      for (const vId of [varBId, 'var-default', varAId, varBId, varAId]) {
        store.selectVariant(vId);
        const map = usePbrMaterialStore.getState().baseColorMap;
        expect(Boolean(map?.filePath || map?.url)).toBe(false);
        expect(useVariantStore.getState().mapVariants.baseColor.some((m) => m.id === sharedBaseTexture.id)).toBe(false);
      }
    });

    it('Multi-slot purge stress test across 3 variants with 12 PBR slots', () => {
      const store = useVariantStore.getState();

      store.createVariant('V1', false);
      const v1Id = useVariantStore.getState().activeVariantId!;
      store.createVariant('V2', false);
      const v2Id = useVariantStore.getState().activeVariantId!;
      store.createVariant('V3', false);
      const v3Id = useVariantStore.getState().activeVariantId!;

      // Add a test texture to each of the 12 PBR slots
      ALL_SLOT_NAMES.forEach((slot) => {
        const item: MapVariantItem = {
          id: `tex-slot-${slot}`,
          name: `Texture ${slot}`,
          url: `blob:${slot}`,
          filePath: `/textures/${slot}.png`,
          fileName: `${slot}.png`
        };
        store.addMapVariant(slot, item);
      });

      // Attach all 12 slots to V1, V2, and V3
      for (const id of [v1Id, v2Id, v3Id]) {
        store.selectVariant(id);
        ALL_SLOT_NAMES.forEach((slot) => {
          store.selectMapVariant(slot, `tex-slot-${slot}`);
        });
      }

      // Now on V1, delete textures from 6 slots: baseColor, normal, roughness, metalness, ao, clearcoat
      store.selectVariant(v1Id);
      const slotsToDelete: SlotName[] = ['baseColor', 'normal', 'roughness', 'metalness', 'ao', 'clearcoat'];

      for (const slot of slotsToDelete) {
        store.removeMapVariant(slot, `tex-slot-${slot}`);
      }

      // Cycle through V1, V2, V3 and check that deleted slots are nowhere to be found
      for (const id of [v1Id, v2Id, v3Id]) {
        store.selectVariant(id);
        const st = useVariantStore.getState();
        const curVar = st.variants.find((v) => v.id === id);

        for (const slot of slotsToDelete) {
          expect(curVar?.maps?.[slot]).toBeUndefined();
          expect(st.mapVariants[slot].some((m) => m.id === `tex-slot-${slot}`)).toBe(false);
          const pbrSlotMap = (usePbrMaterialStore.getState() as any)[`${slot}Map`];
          expect(Boolean(pbrSlotMap?.filePath || pbrSlotMap?.url)).toBe(false);
        }

        // Remaining 6 slots must still be intact
        const remainingSlots: SlotName[] = ['emissive', 'sheen', 'transmission', 'alpha', 'displacement'];
        for (const slot of remainingSlots) {
          expect(curVar?.maps?.[slot]?.id).toBe(`tex-slot-${slot}`);
          expect((usePbrMaterialStore.getState() as any)[`${slot}Map`]?.filePath).toBe(`/textures/${slot}.png`);
        }
      }
    });
  });
});
