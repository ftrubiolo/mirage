import { describe, it, expect, beforeEach } from 'vitest';
import { usePbrMaterialStore } from '../store/pbrMaterialStore';
import { useModelStore } from '../store/modelStore';
import { buildModel3dJson } from '../utils/seraPackageExporter';

describe('Multi-Material Support in Mirage', () => {
  beforeEach(() => {
    useModelStore.getState().resetModel();
    usePbrMaterialStore.getState().resetPbrMaterials();
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
  });

  describe('seraPackageExporter multi-material manifest', () => {
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
});
