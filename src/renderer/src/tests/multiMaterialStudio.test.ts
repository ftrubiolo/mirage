import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { usePbrMaterialStore, extractOrigSlotProps } from '../store/pbrMaterialStore';
import { useModelStore } from '../store/modelStore';
import { useVariantStore } from '../store/variantStore';
import { useAppStore } from '../store/appStore';
import { loadWorkbenchState } from '../store/workbenchActions';
import { saveWorkbenchToLibrary, loadEntryIntoWorkbench } from '../utils/libraryBridge';
import { buildModel3dJson } from '../utils/webPackageExporter';
import {
  extractModelMaterialsInfo,
  captureOriginalMaterials,
  getOriginalMaterialData,
  applyPbrTextures,
  applyPbrUniforms,
  clearTextureCache
} from '../utils/pbrController';

describe('Multi-Material Support in Mirage', () => {
  beforeEach(() => {
    useModelStore.getState().resetModel();
    usePbrMaterialStore.getState().resetPbrMaterials();
    useVariantStore.getState().resetVariants();
    clearTextureCache();
  });

  describe('pbrMaterialStore multi-material lifecycle', () => {
    it('initializes with activeMaterialName: null and empty materialsState for 0 or 1 materials', () => {
      const pbr = usePbrMaterialStore.getState();
      expect(pbr.activeMaterialName).toBeNull();
      expect(pbr.materialsState).toEqual({});

      pbr.syncMaterialSlots(['OnlyOneMat']);
      const updated = usePbrMaterialStore.getState();
      expect(updated.activeMaterialName).toBeNull();
      expect(updated.materialsState).toEqual({});
    });

    it('populates material slots and selects the first one when model has >= 2 materials', () => {
      const pbr = usePbrMaterialStore.getState();
      pbr.syncMaterialSlots(['Estructura_Metal', 'Vidrio_Tapa']);

      const state = usePbrMaterialStore.getState();
      expect(state.activeMaterialName).toBe('Estructura_Metal');
      expect(Object.keys(state.materialsState)).toEqual(['Estructura_Metal', 'Vidrio_Tapa']);
      expect(state.materialsState['Estructura_Metal']).toBeDefined();
      expect(state.materialsState['Vidrio_Tapa']).toBeDefined();
    });

    it('preserves and isolates parameters when switching between active materials', () => {
      const pbr = usePbrMaterialStore.getState();
      pbr.syncMaterialSlots(['Estructura_Metal', 'Vidrio_Tapa']);

      // 1. Configure metal material
      pbr.setPbrProperty('roughnessFactor', 0.25);
      pbr.setPbrProperty('metalnessFactor', 0.95);
      pbr.setMapSlot('baseColor', {
        url: 'blob:metal-albedo',
        filePath: '/textures/metal.jpg',
        fileName: 'metal.jpg',
        fileSize: 1024
      });

      expect(usePbrMaterialStore.getState().roughnessFactor).toBe(0.25);
      expect(usePbrMaterialStore.getState().metalnessFactor).toBe(0.95);
      expect(usePbrMaterialStore.getState().baseColorMap.url).toBe('blob:metal-albedo');

      // 2. Switch to glass material
      pbr.setActiveMaterial('Vidrio_Tapa');
      const glassState = usePbrMaterialStore.getState();
      expect(glassState.activeMaterialName).toBe('Vidrio_Tapa');
      // Glass should have default parameters initially
      expect(glassState.roughnessFactor).toBe(1.0); // default
      expect(glassState.baseColorMap.url).toBeNull(); // empty

      // 3. Configure glass material
      pbr.setPbrProperty('transmissionFactor', 0.98);
      pbr.setPbrProperty('ior', 1.52);
      pbr.setPbrProperty('roughnessFactor', 0.05);

      expect(usePbrMaterialStore.getState().transmissionFactor).toBe(0.98);
      expect(usePbrMaterialStore.getState().ior).toBe(1.52);
      expect(usePbrMaterialStore.getState().roughnessFactor).toBe(0.05);

      // 4. Switch back to metal material
      pbr.setActiveMaterial('Estructura_Metal');
      const metalRestored = usePbrMaterialStore.getState();
      expect(metalRestored.activeMaterialName).toBe('Estructura_Metal');
      expect(metalRestored.roughnessFactor).toBe(0.25);
      expect(metalRestored.metalnessFactor).toBe(0.95);
      expect(metalRestored.baseColorMap.url).toBe('blob:metal-albedo');
      expect(metalRestored.transmissionFactor).toBe(0); // metal default
    });

    it('syncMaterialSlots seamlessly integrates with modelStore.setModelStats', () => {
      useModelStore.getState().setModelStats({
        triangleCount: 12000,
        vertexCount: 6500,
        meshCount: 2,
        materials: ['Madera_Roble', 'Hierro_Negro'],
        dimensions: { width: 1.2, height: 0.75, depth: 0.8 }
      });

      const pbr = usePbrMaterialStore.getState();
      expect(pbr.activeMaterialName).toBe('Madera_Roble');
      expect(Object.keys(pbr.materialsState)).toEqual(['Madera_Roble', 'Hierro_Negro']);
    });

    it('preserves and isolates baseColor per material when switching active materials', () => {
      const pbr = usePbrMaterialStore.getState();
      pbr.syncMaterialSlots(['RedCube', 'BlueCube']);

      // RedCube active initially, change its baseColor
      pbr.setPbrProperty('baseColor', '#ff2233');
      expect(usePbrMaterialStore.getState().baseColor).toBe('#ff2233');
      expect(usePbrMaterialStore.getState().materialsState['RedCube'].baseColor).toBe('#ff2233');

      // Switch to BlueCube
      pbr.setActiveMaterial('BlueCube');
      expect(usePbrMaterialStore.getState().activeMaterialName).toBe('BlueCube');
      expect(usePbrMaterialStore.getState().baseColor).toBe('#ffffff'); // default
      pbr.setPbrProperty('baseColor', '#0033cc');
      expect(usePbrMaterialStore.getState().baseColor).toBe('#0033cc');

      // Switch back to RedCube
      pbr.setActiveMaterial('RedCube');
      expect(usePbrMaterialStore.getState().activeMaterialName).toBe('RedCube');
      expect(usePbrMaterialStore.getState().baseColor).toBe('#ff2233');

      // Switch back to BlueCube
      pbr.setActiveMaterial('BlueCube');
      expect(usePbrMaterialStore.getState().baseColor).toBe('#0033cc');
    });

    it('populates native GLB baseColor and parameters via syncMaterialSlots with initialDefaults', () => {
      const pbr = usePbrMaterialStore.getState();
      pbr.syncMaterialSlots(['Red', 'Green', 'Blue'], {
        Red: { baseColor: '#ff0000', roughnessFactor: 0.2 },
        Green: { baseColor: '#00ff00', roughnessFactor: 0.5 },
        Blue: { baseColor: '#0000ff', roughnessFactor: 0.8 }
      });

      const state = usePbrMaterialStore.getState();
      expect(state.activeMaterialName).toBe('Red');
      expect(state.baseColor).toBe('#ff0000');
      expect(state.roughnessFactor).toBe(0.2);
      expect(state.materialsState['Green'].baseColor).toBe('#00ff00');
      expect(state.materialsState['Green'].roughnessFactor).toBe(0.5);
      expect(state.materialsState['Blue'].baseColor).toBe('#0000ff');
      expect(state.materialsState['Blue'].roughnessFactor).toBe(0.8);
    });

    it('restoreActiveMaterialOriginal restores native color and resets material slots', () => {
      const pbr = usePbrMaterialStore.getState();
      pbr.syncMaterialSlots(['Red', 'Blue'], {
        Red: { baseColor: '#ff0000' }
      });

      pbr.setPbrProperty('baseColor', '#123456');
      pbr.setMapSlot('baseColor', {
        url: 'blob:custom-tex',
        filePath: '/custom.png',
        fileName: 'custom.png',
        fileSize: 100
      });
      expect(usePbrMaterialStore.getState().baseColor).toBe('#123456');
      expect(usePbrMaterialStore.getState().baseColorMap.url).toBe('blob:custom-tex');

      pbr.restoreActiveMaterialOriginal({ baseColor: '#ff0000' });
      const restored = usePbrMaterialStore.getState();
      expect(restored.baseColor).toBe('#ff0000');
      expect(restored.baseColorMap.url).toBeNull();
    });
  });

  describe('Per-Material Map Variant Isolation (F8 Multi-Material)', () => {
    it('isolates map variants between materials in variantStore so materials do not share maps', () => {
      const variantStore = useVariantStore.getState();
      const pbrStore = usePbrMaterialStore.getState();

      // Initialize 2 materials
      variantStore.syncMaterialSlots(['AnimatedColorMaterial', 'Red']);
      pbrStore.syncMaterialSlots(['AnimatedColorMaterial', 'Red']);

      // On AnimatedColorMaterial, add a baseColor map variant
      variantStore.addMapVariant('baseColor', {
        id: 'var-animated-map',
        name: 'Animated Texture',
        url: 'blob:animated-tex',
        filePath: '/textures/animated.png',
        fileName: 'animated.png',
        fileSize: 512
      });

      expect(useVariantStore.getState().mapVariants.baseColor).toHaveLength(1);
      expect(useVariantStore.getState().mapVariants.baseColor[0].id).toBe('var-animated-map');
      expect(usePbrMaterialStore.getState().baseColorMap.url).toBe('blob:animated-tex');

      // Switch to Red material via pbrStore (which invokes registered sync handler)
      pbrStore.setActiveMaterial('Red');

      // CRUCIAL: Red material must have its OWN empty map pool, NOT sharing AnimatedColorMaterial's maps!
      const redVariants = useVariantStore.getState().mapVariants.baseColor;
      expect(redVariants).toHaveLength(0);
      expect(usePbrMaterialStore.getState().baseColorMap.url).toBeNull();

      // Add a distinct normal map on Red
      variantStore.addMapVariant('normal', {
        id: 'var-red-normal',
        name: 'Red Normal',
        url: 'blob:red-normal',
        filePath: '/textures/red-normal.png',
        fileName: 'red-normal.png',
        fileSize: 1024
      });

      expect(useVariantStore.getState().mapVariants.normal).toHaveLength(1);

      // Switch back to AnimatedColorMaterial
      pbrStore.setActiveMaterial('AnimatedColorMaterial');

      // AnimatedColorMaterial should have its baseColor variant restored and NOT have Red's normal map!
      const animatedBase = useVariantStore.getState().mapVariants.baseColor;
      const animatedNormal = useVariantStore.getState().mapVariants.normal;

      expect(animatedBase).toHaveLength(1);
      expect(animatedBase[0].id).toBe('var-animated-map');
      expect(animatedNormal).toHaveLength(0); // isolated!
    });

    it('variantStore createVariant and selectVariant preserve and clone baseColor across variants', () => {
      const variantStore = useVariantStore.getState();
      const pbrStore = usePbrMaterialStore.getState();

      // Configure initial baseColor on default variant
      pbrStore.setPbrProperty('baseColor', '#ff3344');
      expect(usePbrMaterialStore.getState().baseColor).toBe('#ff3344');

      // Create new variant cloned from current
      variantStore.createVariant('Dark Wood', true);
      expect(useVariantStore.getState().variants).toHaveLength(2);
      const darkVar = useVariantStore.getState().variants[1];
      expect(darkVar.settings?.baseColor).toBe('#ff3344');

      // In the new variant, change baseColor
      variantStore.selectVariant(darkVar.id);
      pbrStore.setPbrProperty('baseColor', '#112233');
      expect(usePbrMaterialStore.getState().baseColor).toBe('#112233');

      // Switch back to default variant
      variantStore.selectVariant('var-default');
      expect(usePbrMaterialStore.getState().baseColor).toBe('#ff3344');

      // Switch back to Dark Wood variant
      variantStore.selectVariant(darkVar.id);
      expect(usePbrMaterialStore.getState().baseColor).toBe('#112233');
    });

    it('variantStore.syncMaterialSlots correctly resets materialMapVariants when switching to <= 1 material', () => {
      const variantStore = useVariantStore.getState();
      variantStore.syncMaterialSlots(['MatA', 'MatB']);
      expect(useVariantStore.getState().activeMaterialName).toBe('MatA');
      expect(Object.keys(useVariantStore.getState().materialMapVariants)).toEqual(['MatA', 'MatB']);

      // Switch to a single material model
      variantStore.syncMaterialSlots(['SingleMat']);
      expect(useVariantStore.getState().activeMaterialName).toBeNull();
      expect(useVariantStore.getState().materialMapVariants).toEqual({});
      expect(useVariantStore.getState().materialActiveVariantIds).toEqual({});
    });

    it('modelStore.setModelStats automatically synchronizes variantStore material slots', () => {
      useModelStore.getState().setModelStats({
        triangleCount: 100,
        vertexCount: 100,
        meshCount: 1,
        materials: ['MaterialX', 'MaterialY'],
        dimensions: { width: 1, height: 1, depth: 1 }
      });

      expect(useVariantStore.getState().activeMaterialName).toBe('MaterialX');
      expect(Object.keys(useVariantStore.getState().materialMapVariants)).toEqual(['MaterialX', 'MaterialY']);
    });
  });

  describe('Three.js PBR Controller BaseColor & Native GLB Preservation', () => {
    it('extractModelMaterialsInfo accurately parses materials and colors from 3D hierarchy', () => {
      const group = new THREE.Group();
      const redMat = new THREE.MeshStandardMaterial({ name: 'RedMat', color: new THREE.Color('#ff0000'), roughness: 0.3, metalness: 0.1 });
      const blueMat = new THREE.MeshStandardMaterial({ name: 'BlueMat', color: new THREE.Color('#0000ff'), roughness: 0.7, metalness: 0.9 });

      const mesh1 = new THREE.Mesh(new THREE.BoxGeometry(), redMat);
      const mesh2 = new THREE.Mesh(new THREE.SphereGeometry(), blueMat);
      group.add(mesh1);
      group.add(mesh2);

      const info = extractModelMaterialsInfo(group);
      expect(info['RedMat']).toBeDefined();
      expect(info['RedMat'].baseColor.toLowerCase()).toBe('#ff0000');
      expect(info['RedMat'].roughnessFactor).toBe(0.3);
      expect(info['RedMat'].metalnessFactor).toBe(0.1);

      expect(info['BlueMat']).toBeDefined();
      expect(info['BlueMat'].baseColor.toLowerCase()).toBe('#0000ff');
      expect(info['BlueMat'].roughnessFactor).toBe(0.7);
      expect(info['BlueMat'].metalnessFactor).toBe(0.9);
    });

    it('captureOriginalMaterials assigns synthetic names to unnamed materials and records roughness/metalness', () => {
      const group = new THREE.Group();
      const unnamedMat = new THREE.MeshStandardMaterial({
        name: '',
        color: new THREE.Color('#123456'),
        roughness: 0.42,
        metalness: 0.84
      });
      group.add(new THREE.Mesh(new THREE.BoxGeometry(), unnamedMat));

      captureOriginalMaterials(group);

      expect(unnamedMat.name).toBe('Material_1');
      const orig = getOriginalMaterialData('Material_1');
      expect(orig).toBeDefined();
      expect(orig?.color.getHexString().toLowerCase()).toBe('123456');
      expect(orig?.roughness).toBe(0.42);
      expect(orig?.metalness).toBe(0.84);

      // Single-material lookup without name argument should also resolve
      const singleOrig = getOriginalMaterialData();
      expect(singleOrig).toBe(orig);
    });

    it('applyPbrTextures preserves original color and does NOT turn untextured materials gray (0xd0ceca)', async () => {
      const group = new THREE.Group();
      const redMat = new THREE.MeshStandardMaterial({ name: 'RedCube', color: new THREE.Color('#ff0000') });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(), redMat);
      group.add(mesh);

      captureOriginalMaterials(group);

      // Apply PBR textures without a baseColor texture (untextured material)
      await applyPbrTextures({
        model: group,
        targetMaterialName: 'RedCube'
      });

      // It must NOT be 0xd0ceca (gray bug)!
      expect(redMat.color.getHexString().toLowerCase()).not.toBe('d0ceca');
      expect(redMat.color.getHexString().toLowerCase()).toBe('ff0000');

      // Now apply explicit color override
      await applyPbrTextures({
        model: group,
        targetMaterialName: 'RedCube',
        color: '#ffff00'
      });
      expect(redMat.color.getHexString().toLowerCase()).toBe('ffff00');

      // Now toggle loadFromCache: true
      await applyPbrTextures({
        model: group,
        targetMaterialName: 'RedCube',
        loadFromCache: true
      });
      // Should restore original GLB red color!
      expect(redMat.color.getHexString().toLowerCase()).toBe('ff0000');
    });

    it('applyPbrTextures preserves orig.color when material has a map and no explicit color is set', async () => {
      const group = new THREE.Group();
      const dummyTex = new THREE.Texture();
      const tintedMat = new THREE.MeshStandardMaterial({
        name: 'TintedMat',
        color: new THREE.Color('#336699'),
        map: dummyTex
      });
      group.add(new THREE.Mesh(new THREE.BoxGeometry(), tintedMat));
      captureOriginalMaterials(group);

      await applyPbrTextures({
        model: group,
        targetMaterialName: 'TintedMat'
      });

      expect(tintedMat.color.getHexString().toLowerCase()).toBe('336699');
    });

    it('applyPbrUniforms respects loadFromCache and does not overwrite native color when adjusting sliders', () => {
      const group = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ name: 'RedMat', color: new THREE.Color('#ff0000') });
      group.add(new THREE.Mesh(new THREE.BoxGeometry(), mat));
      captureOriginalMaterials(group);

      // Uniform update with loadFromCache: true and default baseColor (#ffffff)
      applyPbrUniforms(group, {
        targetMaterialName: 'RedMat',
        loadFromCache: true,
        baseColor: '#ffffff',
        roughness: 0.75
      });

      // Material color must NOT be overwritten with white; it should remain native red!
      expect(mat.color.getHexString().toLowerCase()).toBe('ff0000');
      expect(mat.roughness).toBe(0.75);
    });

    it('pbrMaterialStore setLoadFromCache synchronizes baseColor with native GLB color', () => {
      const group = new THREE.Group();
      const redMat = new THREE.MeshStandardMaterial({ name: 'RedCube', color: new THREE.Color('#ff0000') });
      group.add(new THREE.Mesh(new THREE.BoxGeometry(), redMat));
      captureOriginalMaterials(group);

      const pbr = usePbrMaterialStore.getState();
      pbr.syncMaterialSlots(['RedCube', 'Other']);
      pbr.setPbrProperty('baseColor', '#00ff00'); // changed by user to green
      expect(usePbrMaterialStore.getState().baseColor).toBe('#00ff00');

      // User toggles loadFromCache: true
      pbr.setLoadFromCache(true);
      expect(usePbrMaterialStore.getState().baseColor.toLowerCase()).toBe('#ff0000');
      expect(usePbrMaterialStore.getState().materialsState['RedCube'].baseColor.toLowerCase()).toBe('#ff0000');
    });

    it('applyPbrUniforms dynamically updates baseColor without shader recompilation', () => {
      const group = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ name: 'Cube', color: new THREE.Color('#ffffff') });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(), mat);
      group.add(mesh);

      const initialVersion = mat.version;

      applyPbrUniforms(group, {
        targetMaterialName: 'Cube',
        baseColor: '#ab12cd'
      });

      expect(mat.color.getHexString().toLowerCase()).toBe('ab12cd');
      expect(mat.version).toBe(initialVersion); // zero shader recompilation!
    });
  });

  describe('Glass and Transparent Material Preservation (MeshPhysicalMaterial & Alpha)', () => {
    it('extractModelMaterialsInfo captures MeshPhysicalMaterial transmission, ior, clearcoat, and sheen', () => {
      const group = new THREE.Group();
      const glassMat = new THREE.MeshPhysicalMaterial({
        name: 'GlassTransmission',
        color: new THREE.Color('#ffffff'),
        roughness: 0.05,
        metalness: 0.0,
        transmission: 0.95,
        ior: 1.52,
        clearcoat: 0.8,
        clearcoatRoughness: 0.1,
        sheenRoughness: 0.4
      });
      glassMat.sheenColor = new THREE.Color('#ff00aa');

      group.add(new THREE.Mesh(new THREE.BoxGeometry(), glassMat));

      const info = extractModelMaterialsInfo(group);
      expect(info['GlassTransmission']).toBeDefined();
      expect(info['GlassTransmission'].transmissionFactor).toBe(0.95);
      expect(info['GlassTransmission'].ior).toBe(1.52);
      expect(info['GlassTransmission'].roughnessFactor).toBe(0.05);
      expect(info['GlassTransmission'].metalnessFactor).toBe(0.0);
      expect(info['GlassTransmission'].clearcoatFactor).toBe(0.8);
      expect(info['GlassTransmission'].clearcoatRoughness).toBe(0.1);
      expect(info['GlassTransmission'].sheenColor?.toLowerCase()).toBe('#ff00aa');
      expect(info['GlassTransmission'].sheenRoughness).toBe(0.4);
    });

    it('syncMaterialSlots initializes glass materials with their native transmission and roughness', () => {
      const pbr = usePbrMaterialStore.getState();
      const initialDefaults = {
        GlassTransmission: {
          baseColor: '#ffffff',
          roughnessFactor: 0.05,
          metalnessFactor: 0.0,
          transmissionFactor: 0.95,
          ior: 1.52
        },
        OpaqueMetal: {
          baseColor: '#888888',
          roughnessFactor: 0.3,
          metalnessFactor: 0.9,
          transmissionFactor: 0.0,
          ior: 1.5
        }
      };

      pbr.syncMaterialSlots(['GlassTransmission', 'OpaqueMetal'], initialDefaults);

      const state = usePbrMaterialStore.getState();
      expect(state.activeMaterialName).toBe('GlassTransmission');
      expect(state.transmissionFactor).toBe(0.95);
      expect(state.ior).toBe(1.52);
      expect(state.roughnessFactor).toBe(0.05);

      // Verify slot in materialsState
      expect(state.materialsState['GlassTransmission'].transmissionFactor).toBe(0.95);
      expect(state.materialsState['GlassTransmission'].ior).toBe(1.52);
      expect(state.materialsState['GlassTransmission'].roughnessFactor).toBe(0.05);

      // Switch to OpaqueMetal and back to GlassTransmission
      pbr.setActiveMaterial('OpaqueMetal');
      expect(usePbrMaterialStore.getState().transmissionFactor).toBe(0.0);
      expect(usePbrMaterialStore.getState().metalnessFactor).toBe(0.9);

      pbr.setActiveMaterial('GlassTransmission');
      const restoredGlass = usePbrMaterialStore.getState();
      expect(restoredGlass.transmissionFactor).toBe(0.95);
      expect(restoredGlass.ior).toBe(1.52);
      expect(restoredGlass.roughnessFactor).toBe(0.05);
    });

    it('applyPbrTextures preserves transmission and does not turn glass materials opaque', async () => {
      const group = new THREE.Group();
      const glassMat = new THREE.MeshPhysicalMaterial({
        name: 'GlassTransmission',
        color: new THREE.Color('#ffffff'),
        roughness: 0.05,
        transmission: 0.95,
        ior: 1.52
      });
      group.add(new THREE.Mesh(new THREE.BoxGeometry(), glassMat));
      captureOriginalMaterials(group);

      // Apply PBR textures with transmissionFactor preserved
      await applyPbrTextures({
        model: group,
        targetMaterialName: 'GlassTransmission',
        transmissionFactor: 0.95,
        ior: 1.52,
        roughnessFactor: 0.05
      });

      expect(glassMat.transmission).toBe(0.95);
      expect(glassMat.ior).toBe(1.52);
      expect(glassMat.roughness).toBe(0.05);

      // Test loadFromCache restores original transmission
      glassMat.transmission = 0.0;
      await applyPbrTextures({
        model: group,
        targetMaterialName: 'GlassTransmission',
        loadFromCache: true
      });

      expect(glassMat.transmission).toBe(0.95);
      expect(glassMat.ior).toBe(1.52);
    });

    it('applyPbrTextures preserves native alpha transparency without turning materials opaque', async () => {
      const group = new THREE.Group();
      const alphaMat = new THREE.MeshStandardMaterial({
        name: 'GlassAlpha',
        color: new THREE.Color('#ffffff'),
        transparent: true,
        opacity: 0.35,
        alphaTest: 0.08
      });
      group.add(new THREE.Mesh(new THREE.BoxGeometry(), alphaMat));
      captureOriginalMaterials(group);

      // Apply PBR textures without any alphaMap URL
      await applyPbrTextures({
        model: group,
        targetMaterialName: 'GlassAlpha'
      });

      // Must NOT destroy native transparent / opacity!
      expect(alphaMat.transparent).toBe(true);
      expect(alphaMat.opacity).toBe(0.35);
      expect(alphaMat.alphaTest).toBe(0.08);
    });

    it('applyPbrUniforms restores transmission, ior, and alpha transparency when loadFromCache is active', () => {
      const group = new THREE.Group();
      const glassMat = new THREE.MeshPhysicalMaterial({
        name: 'GlassPhysical',
        color: new THREE.Color('#ffffff'),
        roughness: 0.04,
        metalness: 0.01,
        transmission: 0.96,
        ior: 1.54,
        transparent: true,
        opacity: 0.9
      });
      group.add(new THREE.Mesh(new THREE.BoxGeometry(), glassMat));
      captureOriginalMaterials(group);

      // Intentionally overwrite material properties
      glassMat.transmission = 0.0;
      glassMat.roughness = 1.0;
      glassMat.metalness = 0.5;
      glassMat.transparent = false;
      glassMat.opacity = 1.0;

      applyPbrUniforms(group, {
        targetMaterialName: 'GlassPhysical',
        loadFromCache: true
      });

      expect(glassMat.transmission).toBe(0.96);
      expect(glassMat.ior).toBe(1.54);
      expect(glassMat.roughness).toBe(0.04);
      expect(glassMat.metalness).toBe(0.01);
      expect(glassMat.transparent).toBe(true);
      expect(glassMat.opacity).toBe(0.9);
    });

    it('pbrMaterialStore setLoadFromCache and restoreActiveMaterialOriginal restore transmission and physical parameters', () => {
      const group = new THREE.Group();
      const glassMat = new THREE.MeshPhysicalMaterial({
        name: 'GlassVase',
        color: new THREE.Color('#ffffff'),
        roughness: 0.02,
        metalness: 0.0,
        transmission: 0.98,
        ior: 1.55
      });
      group.add(new THREE.Mesh(new THREE.BoxGeometry(), glassMat));
      captureOriginalMaterials(group);

      const pbr = usePbrMaterialStore.getState();
      pbr.syncMaterialSlots(['GlassVase', 'WoodBase'], {
        GlassVase: {
          baseColor: '#ffffff',
          roughnessFactor: 0.02,
          metalnessFactor: 0.0,
          transmissionFactor: 0.98,
          ior: 1.55
        }
      });

      // User alters transmissionFactor to 0 (opaque porcelain)
      pbr.setPbrProperty('transmissionFactor', 0.0);
      pbr.setPbrProperty('roughnessFactor', 1.0);
      expect(usePbrMaterialStore.getState().transmissionFactor).toBe(0.0);
      expect(usePbrMaterialStore.getState().roughnessFactor).toBe(1.0);

      // User enables loadFromCache
      pbr.setLoadFromCache(true);
      expect(usePbrMaterialStore.getState().transmissionFactor).toBe(0.98);
      expect(usePbrMaterialStore.getState().ior).toBe(1.55);
      expect(usePbrMaterialStore.getState().roughnessFactor).toBe(0.02);

      // User alters properties again, then clicks "Restaurar original del .glb"
      pbr.setPbrProperty('transmissionFactor', 0.1);
      const orig = getOriginalMaterialData('GlassVase');
      const origDefaults = extractOrigSlotProps(orig);
      pbr.restoreActiveMaterialOriginal(origDefaults);

      expect(usePbrMaterialStore.getState().transmissionFactor).toBe(0.98);
      expect(usePbrMaterialStore.getState().ior).toBe(1.55);
      expect(usePbrMaterialStore.getState().roughnessFactor).toBe(0.02);
    });

    it('syncMaterialSlots cleanly resets physical properties when loading a single-material opaque model', () => {
      const pbr = usePbrMaterialStore.getState();
      // Suppose state previously had glass transmission
      pbr.setPbrProperty('transmissionFactor', 0.95);
      pbr.setPbrProperty('ior', 1.52);
      expect(usePbrMaterialStore.getState().transmissionFactor).toBe(0.95);

      // Now load a single-material opaque model
      pbr.syncMaterialSlots(['OpaqueWood'], {
        OpaqueWood: {
          baseColor: '#885522',
          roughnessFactor: 0.8,
          metalnessFactor: 0.1
        }
      });

      const state = usePbrMaterialStore.getState();
      expect(state.activeMaterialName).toBeNull();
      expect(state.baseColor).toBe('#885522');
      expect(state.roughnessFactor).toBe(0.8);
      expect(state.metalnessFactor).toBe(0.1);
      // transmissionFactor MUST be cleanly reset to default 0.0, NOT left at 0.95!
      expect(state.transmissionFactor).toBe(0.0);
    });

    it('syncMaterialSlots prioritizes new initialDefaults over existing stale materialsState for multi-material models', () => {
      const pbr = usePbrMaterialStore.getState();
      // Initialize with Model A
      pbr.syncMaterialSlots(['Slot1', 'Slot2'], {
        Slot1: { baseColor: '#111111', roughnessFactor: 0.9, transmissionFactor: 0.0 },
        Slot2: { baseColor: '#222222', roughnessFactor: 0.8, transmissionFactor: 0.0 }
      });

      // User modified Slot1
      pbr.setPbrProperty('transmissionFactor', 0.5);

      // Now load Model B which shares the slot name 'Slot1' but is glass
      pbr.syncMaterialSlots(['Slot1', 'Slot3'], {
        Slot1: { baseColor: '#ffffff', roughnessFactor: 0.05, transmissionFactor: 0.98 },
        Slot3: { baseColor: '#333333', roughnessFactor: 0.7, transmissionFactor: 0.0 }
      });

      const nextState = usePbrMaterialStore.getState();
      expect(nextState.materialsState['Slot1'].transmissionFactor).toBe(0.98);
      expect(nextState.materialsState['Slot1'].roughnessFactor).toBe(0.05);
      expect(nextState.transmissionFactor).toBe(0.98);
    });

    it('applyPbrTextures restores native sheen factor when loadFromCache is active', async () => {
      const group = new THREE.Group();
      const sheenMat = new THREE.MeshPhysicalMaterial({
        name: 'VelvetMat',
        roughness: 0.7,
        sheen: 0.85,
        sheenRoughness: 0.3
      });
      group.add(new THREE.Mesh(new THREE.BoxGeometry(), sheenMat));
      captureOriginalMaterials(group);

      sheenMat.sheen = 0.0;
      await applyPbrTextures({
        model: group,
        targetMaterialName: 'VelvetMat',
        loadFromCache: true
      });

      expect(sheenMat.sheen).toBe(0.85);
    });

    it('extractModelMaterialsInfo safely handles string sheenColor', () => {
      const group = new THREE.Group();
      const mat = new THREE.MeshPhysicalMaterial({ name: 'CustomSheen' });
      (mat as any).sheenColor = '#00ffcc';
      group.add(new THREE.Mesh(new THREE.BoxGeometry(), mat));

      const info = extractModelMaterialsInfo(group);
      expect(info['CustomSheen'].sheenColor).toBe('#00ffcc');
    });
  });

  describe('webPackageExporter multi-material manifest', () => {
    it('declares materials array and variant slots in buildModel3dJson', () => {
      const variants = [
        {
          code: 'mesa-estandar',
          label: 'Mesa Estándar',
          baseColor: 'maps/mesa-estandar_base.webp',
          slots: [
            {
              targetMaterial: 'Estructura_Metal',
              baseColor: 'maps/mesa-estandar_estructura-metal_base.webp',
              roughnessFactor: 0.25,
              metalnessFactor: 0.9
            },
            {
              targetMaterial: 'Vidrio_Tapa',
              transmissionFactor: 0.95,
              ior: 1.5,
              roughnessFactor: 0.05
            }
          ]
        }
      ];

      const json = buildModel3dJson('Mesa de Centro', variants, false, ['Estructura_Metal', 'Vidrio_Tapa']);

      expect(json.materials).toEqual(['Estructura_Metal', 'Vidrio_Tapa']);
      expect(json.variants[0].slots).toHaveLength(2);
      expect(json.variants[0].slots![0].targetMaterial).toBe('Estructura_Metal');
      expect(json.variants[0].slots![0].roughnessFactor).toBe(0.25);
      expect(json.variants[0].slots![1].targetMaterial).toBe('Vidrio_Tapa');
      expect(json.variants[0].slots![1].transmissionFactor).toBe(0.95);
    });

    it('omits materials array when model has only 1 material', () => {
      const json = buildModel3dJson('Silla Simple', [], false, ['UnicoMaterial']);
      expect(json.materials).toBeUndefined();
    });
  });

  describe('Multi-Material Persistence & Legacy Flat-Map Migration', () => {
    beforeEach(() => {
      window.electronAPI = {
        approveDroppedPath: vi.fn().mockResolvedValue(true),
        getFileInfo: vi.fn().mockResolvedValue({ name: 'file.png', size: 1024 }),
        toAssetUrl: vi.fn().mockImplementation((p: string) => `local-asset://${p}`),
        getPathForFile: vi.fn().mockImplementation((f: any) => f.path || f.name),
        saveLibraryEntry: vi.fn().mockResolvedValue(true),
        copyFileToLibrary: vi.fn().mockImplementation((opts: any) => ({
          filePath: `/library/${opts.entrySlug}/${opts.entrySlug}_${opts.targetType}.${opts.ext}`,
          fileName: `${opts.entrySlug}_${opts.targetType}.${opts.ext}`,
          fileSize: 2048
        })),
        writeBinaryToLibrary: vi.fn().mockImplementation((opts: any) => ({
          filePath: `/library/${opts.entrySlug}/poster.webp`,
          fileName: 'poster.webp'
        }))
      } as any;
    });

    it('migrates legacy flat maps to primary material slot on multi-material model load without losing maps', () => {
      const pbr = usePbrMaterialStore.getState();

      // Simulate legacy load: flat maps are set on the root PBR store
      pbr.setMapSlot('baseColor', {
        url: 'local-asset:///textures/mesa_baseColor.png',
        filePath: '/textures/mesa_baseColor.png',
        fileName: 'mesa_baseColor.png',
        fileSize: 1000
      });
      pbr.setMapSlot('normal', {
        url: 'local-asset:///textures/mesa_normal.png',
        filePath: '/textures/mesa_normal.png',
        fileName: 'mesa_normal.png',
        fileSize: 2000
      });
      pbr.setMapSlot('roughness', {
        url: 'local-asset:///textures/mesa_roughness.png',
        filePath: '/textures/mesa_roughness.png',
        fileName: 'mesa_roughness.png',
        fileSize: 3000
      });

      expect(usePbrMaterialStore.getState().activeMapsCount).toBe(3);

      // Now 3D viewer loads GLB and detects 2 materials (like mesa)
      useModelStore.getState().setModelStats({
        triangleCount: 15000,
        vertexCount: 8000,
        meshCount: 2,
        materials: ['Mesa_bake_opaco', 'Mesa_bake_transparente'],
        dimensions: { width: 1, height: 1, depth: 1 }
      });

      const stateAfter = usePbrMaterialStore.getState();
      expect(stateAfter.activeMaterialName).toBe('Mesa_bake_opaco');
      expect(stateAfter.materialsState['Mesa_bake_opaco']).toBeDefined();
      expect(stateAfter.materialsState['Mesa_bake_opaco'].baseColorMap.filePath).toBe('/textures/mesa_baseColor.png');
      expect(stateAfter.materialsState['Mesa_bake_opaco'].normalMap.filePath).toBe('/textures/mesa_normal.png');
      expect(stateAfter.materialsState['Mesa_bake_opaco'].roughnessMap.filePath).toBe('/textures/mesa_roughness.png');
      // Root state should match active material
      expect(stateAfter.baseColorMap.filePath).toBe('/textures/mesa_baseColor.png');
      expect(stateAfter.activeMapsCount).toBe(3);

      // The other material slot is present and clean
      expect(stateAfter.materialsState['Mesa_bake_transparente']).toBeDefined();
      expect(stateAfter.materialsState['Mesa_bake_transparente'].baseColorMap.url).toBeNull();
    });

    it('hydrates multi-material states cleanly from loadWorkbenchState', () => {
      loadWorkbenchState({
        productId: 'mesa-test',
        productSlug: 'mesa-test',
        productName: 'Mesa Test',
        modelFilePath: '/models/mesa.glb',
        modelUrl: 'local-asset:///models/mesa.glb',
        materials: {
          Madera: {
            maps: {
              baseColor: {
                filePath: '/textures/wood.png',
                fileName: 'wood.png',
                fileSize: 500,
                url: 'local-asset:///textures/wood.png'
              }
            },
            settings: { roughnessFactor: 0.45 }
          },
          Metal: {
            maps: {
              normal: {
                filePath: '/textures/metal_n.png',
                fileName: 'metal_n.png',
                fileSize: 600,
                url: 'local-asset:///textures/metal_n.png'
              }
            },
            settings: { metalnessFactor: 0.9 }
          }
        },
        activeMaterialName: 'Madera'
      });

      const pbr = usePbrMaterialStore.getState();
      expect(pbr.activeMaterialName).toBe('Madera');
      expect(pbr.materialsState['Madera'].baseColorMap.filePath).toBe('/textures/wood.png');
      expect(pbr.materialsState['Madera'].roughnessFactor).toBe(0.45);
      expect(pbr.materialsState['Metal'].normalMap.filePath).toBe('/textures/metal_n.png');
      expect(pbr.materialsState['Metal'].metalnessFactor).toBe(0.9);
      expect(pbr.baseColorMap.filePath).toBe('/textures/wood.png');
      expect(pbr.roughnessFactor).toBe(0.45);
    });

    it('snapshots and restores multi-material states across variants', () => {
      const pbr = usePbrMaterialStore.getState();
      const variant = useVariantStore.getState();

      pbr.syncMaterialSlots(['SlotA', 'SlotB']);

      // Configure default variant
      pbr.setActiveMaterial('SlotA');
      pbr.setPbrProperty('baseColor', '#ff0000');
      pbr.setPbrProperty('roughnessFactor', 0.2);

      pbr.setActiveMaterial('SlotB');
      pbr.setPbrProperty('baseColor', '#0000ff');
      pbr.setPbrProperty('roughnessFactor', 0.8);

      // Create new variant
      variant.createVariant('Dark Version');
      const darkVarId = useVariantStore.getState().activeVariantId!;
      expect(darkVarId).not.toBe('var-default');

      // Edit new variant
      pbr.setActiveMaterial('SlotA');
      pbr.setPbrProperty('baseColor', '#111111');
      pbr.setPbrProperty('roughnessFactor', 0.9);

      pbr.setActiveMaterial('SlotB');
      pbr.setPbrProperty('baseColor', '#222222');
      pbr.setPbrProperty('roughnessFactor', 0.1);

      // Switch back to default variant
      variant.selectVariant('var-default');
      const defState = usePbrMaterialStore.getState();
      expect(defState.materialsState['SlotA'].baseColor).toBe('#ff0000');
      expect(defState.materialsState['SlotA'].roughnessFactor).toBe(0.2);
      expect(defState.materialsState['SlotB'].baseColor).toBe('#0000ff');
      expect(defState.materialsState['SlotB'].roughnessFactor).toBe(0.8);

      // Switch to dark variant
      variant.selectVariant(darkVarId);
      const darkState = usePbrMaterialStore.getState();
      expect(darkState.materialsState['SlotA'].baseColor).toBe('#111111');
      expect(darkState.materialsState['SlotA'].roughnessFactor).toBe(0.9);
      expect(darkState.materialsState['SlotB'].baseColor).toBe('#222222');
      expect(darkState.materialsState['SlotB'].roughnessFactor).toBe(0.1);
    });

    it('persists and restores multi-material data through saveWorkbenchToLibrary and loadEntryIntoWorkbench', async () => {
      let savedEntryData: any = null;
      window.electronAPI.saveLibraryEntry = vi.fn().mockImplementation(async (entry: any) => {
        savedEntryData = entry;
        return true;
      });

      useAppStore.getState().setActiveEntrySlug('multi-mat-table');
      useModelStore.getState().setProductMeta('multi-mat-table', 'Mesa Multi Material');
      useModelStore.getState().setModel('/library/multi-mat-table/model.glb', 'local-asset:///library/multi-mat-table/model.glb', 5000);
      useModelStore.getState().setModelStats({
        triangleCount: 1000,
        vertexCount: 500,
        meshCount: 2,
        materials: ['Madera_Base', 'Vidrio_Top'],
        dimensions: { width: 1, height: 1, depth: 1 }
      });

      const pbr = usePbrMaterialStore.getState();
      pbr.setActiveMaterial('Madera_Base');
      pbr.setMapSlot('baseColor', {
        url: 'local-asset:///textures/madera.png',
        filePath: '/textures/madera.png',
        fileName: 'madera.png',
        fileSize: 1234
      });
      pbr.setPbrProperty('roughnessFactor', 0.6);

      pbr.setActiveMaterial('Vidrio_Top');
      pbr.setPbrProperty('transmissionFactor', 0.95);
      pbr.setPbrProperty('roughnessFactor', 0.05);

      // Save workbench
      const saved = await saveWorkbenchToLibrary({
        title: 'Mesa Multi Material',
        slug: 'multi-mat-table',
        skipPoster: true
      });

      expect(saved.texturePool).toBeDefined();
      expect(saved.texturePool!['Madera_Base']).toBeDefined();
      expect(saved.texturePool!['Madera_Base']!['baseColor']!.length).toBeGreaterThan(0);
      expect(saved.texturePool!['Madera_Base']!['baseColor']![0].filePath).toBe('/textures/madera.png');
      expect(saved.variants![0].materials).toBeDefined();
      const maderaAssigned = saved.variants![0].materials!['Madera_Base'].assignedMapIds?.['baseColor'];
      expect(maderaAssigned).toBe(saved.texturePool!['Madera_Base']!['baseColor']![0].id);
      expect(saved.variants![0].materials!['Madera_Base'].settings?.roughnessFactor).toBe(0.6);
      expect(saved.variants![0].materials!['Madera_Base'].settings?.loadFromCache).toBe(false);
      expect(saved.variants![0].materials!['Vidrio_Top'].settings?.transmissionFactor).toBe(0.95);
      expect(saved.variants![0].materials!['Vidrio_Top'].settings?.loadFromCache).toBe(true);
      expect(saved.stats?.materials).toEqual(['Madera_Base', 'Vidrio_Top']);
      expect((saved as any).materials).toBeUndefined();
      expect((saved as any).maps).toBeUndefined();

      // Reset and reload into workbench
      useModelStore.getState().resetModel();
      usePbrMaterialStore.getState().resetPbrMaterials();
      useVariantStore.getState().resetVariants();
      useAppStore.getState().setActiveEntry(null);
      useAppStore.getState().setActiveEntrySlug(null);

      await loadEntryIntoWorkbench(savedEntryData);

      const restoredPbr = usePbrMaterialStore.getState();
      expect(restoredPbr.materialsState['Madera_Base']).toBeDefined();
      expect(restoredPbr.materialsState['Madera_Base'].baseColorMap.filePath).toBe('/textures/madera.png');
      expect(restoredPbr.materialsState['Madera_Base'].roughnessFactor).toBe(0.6);
      expect(restoredPbr.materialsState['Madera_Base'].loadFromCache).toBe(false);
      expect(restoredPbr.materialsState['Vidrio_Top'].transmissionFactor).toBe(0.95);
      expect(restoredPbr.materialsState['Vidrio_Top'].roughnessFactor).toBe(0.05);
      expect(restoredPbr.materialsState['Vidrio_Top'].loadFromCache).toBe(true);
    });

    it('migrates legacy entry schema seamlessly on loadEntryIntoWorkbench', async () => {
      const legacyEntry: any = {
        id: 'legacy-entry',
        title: 'Legacy Mesa',
        slug: 'legacy-mesa',
        modelFilePath: '/models/mesa.glb',
        stats: {
          triangleCount: 500,
          vertexCount: 250,
          meshCount: 2,
          materials: ['Mesa_Madera', 'Mesa_Vidrio']
        },
        materials: {
          Mesa_Madera: {
            maps: {
              baseColor: {
                fileName: 'wood.png',
                filePath: '/textures/wood.png',
                fileSize: 500
              }
            },
            settings: {
              roughnessFactor: 0.7
            }
          }
        },
        variants: [
          {
            id: 'var-1',
            name: 'Default',
            isDefault: true,
            maps: {},
            settings: {}
          }
        ]
      };

      useModelStore.getState().resetModel();
      usePbrMaterialStore.getState().resetPbrMaterials();
      useVariantStore.getState().resetVariants();
      useAppStore.getState().setActiveEntry(null);
      useAppStore.getState().setActiveEntrySlug(null);

      await loadEntryIntoWorkbench(legacyEntry);

      const pbr = usePbrMaterialStore.getState();
      expect(pbr.materialsState['Mesa_Madera']).toBeDefined();
      expect(pbr.materialsState['Mesa_Madera'].baseColorMap.filePath).toBe('/textures/wood.png');
      expect(pbr.materialsState['Mesa_Madera'].roughnessFactor).toBe(0.7);
      expect(pbr.materialsState['Mesa_Madera'].loadFromCache).toBe(false);
      // Mesa_Vidrio has no assigned maps, so its loadFromCache defaults to true to preserve native glass
      expect(pbr.materialsState['Mesa_Vidrio'].loadFromCache).toBe(true);
    });
  });

  describe('Multi-material texture disk storage and targetType isolation', () => {
    beforeEach(() => {
      window.electronAPI = {
        approveDroppedPath: vi.fn().mockResolvedValue(true),
        getFileInfo: vi.fn().mockResolvedValue({ name: 'file.png', size: 1024 }),
        toAssetUrl: vi.fn().mockImplementation((p: string) => `local-asset://${p}`),
        getPathForFile: vi.fn().mockImplementation((f: any) => f.path || f.name),
        saveLibraryEntry: vi.fn().mockResolvedValue(true),
        copyFileToLibrary: vi.fn().mockImplementation((opts: any) => ({
          filePath: `/library/${opts.entrySlug}/${opts.entrySlug}_${opts.targetType}.${opts.ext}`,
          fileName: `${opts.entrySlug}_${opts.targetType}.${opts.ext}`,
          fileSize: 2048
        })),
        writeBinaryToLibrary: vi.fn().mockImplementation((opts: any) => ({
          filePath: `/library/${opts.entrySlug}/${opts.entrySlug}_${opts.targetType}.${opts.ext}`,
          fileName: `${opts.entrySlug}_${opts.targetType}.${opts.ext}`,
          fileSize: 2048
        }))
      } as any;
    });

    it('isolates textures on disk by material name so maps for different materials do not overwrite each other', () => {
      useAppStore.getState().setActiveEntrySlug('mesa-estudio');
      useModelStore.getState().setModelStats({
        triangleCount: 1000,
        vertexCount: 500,
        meshCount: 2,
        materials: ['Mesa_bake_opaco', 'Mesa_bake_transparente'],
        dimensions: { width: 1, height: 1, depth: 1 }
      });

      const variantStore = useVariantStore.getState();

      // Material 1: Mesa_bake_opaco
      variantStore.addMapVariant(
        'baseColor',
        {
          id: 'map-opaco-1',
          name: 'Opaco BaseColor',
          url: 'blob:opaco-albedo',
          filePath: '/library/mesa-estudio/mesa-estudio_Mesa_bake_opaco_baseColor.webp',
          fileName: 'mesa-estudio_Mesa_bake_opaco_baseColor.webp',
          fileSize: 5000
        },
        'Mesa_bake_opaco'
      );

      // Material 2: Mesa_bake_transparente
      variantStore.addMapVariant(
        'baseColor',
        {
          id: 'map-trans-1',
          name: 'Transparente BaseColor',
          url: 'blob:trans-albedo',
          filePath: '/library/mesa-estudio/mesa-estudio_Mesa_bake_transparente_baseColor.webp',
          fileName: 'mesa-estudio_Mesa_bake_transparente_baseColor.webp',
          fileSize: 3000
        },
        'Mesa_bake_transparente'
      );

      const state = useVariantStore.getState();

      // Check texture pool contains both without overwriting
      expect(state.texturePool['Mesa_bake_opaco']?.baseColor?.[0].fileName).toBe(
        'mesa-estudio_Mesa_bake_opaco_baseColor.webp'
      );
      expect(state.texturePool['Mesa_bake_transparente']?.baseColor?.[0].fileName).toBe(
        'mesa-estudio_Mesa_bake_transparente_baseColor.webp'
      );

      // Check materialMapVariants separates by material
      expect(state.materialMapVariants['Mesa_bake_opaco']?.baseColor).toHaveLength(1);
      expect(state.materialMapVariants['Mesa_bake_transparente']?.baseColor).toHaveLength(1);
      expect(state.materialMapVariants['Mesa_bake_opaco']?.baseColor?.[0].id).toBe('map-opaco-1');
      expect(state.materialMapVariants['Mesa_bake_transparente']?.baseColor?.[0].id).toBe('map-trans-1');

      // Check active variant has materials mapped correctly
      const defaultVariant = state.variants[0];
      expect(defaultVariant.materials?.['Mesa_bake_opaco']?.maps?.baseColor?.id).toBe('map-opaco-1');
      expect(defaultVariant.materials?.['Mesa_bake_transparente']?.maps?.baseColor?.id).toBe('map-trans-1');
      expect(defaultVariant.materials?.['Mesa_bake_opaco']?.assignedMapIds?.baseColor).toBe('map-opaco-1');
      expect(defaultVariant.materials?.['Mesa_bake_transparente']?.assignedMapIds?.baseColor).toBe('map-trans-1');
    });
  });
});

