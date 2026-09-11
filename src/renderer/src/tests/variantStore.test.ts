import { describe, it, expect, beforeEach } from 'vitest';
import {
  useVariantStore,
  deriveAvailableTexturesForSlot,
  selectColorways,
  type MapVariantItem
} from '../store/variantStore';
import { usePbrMaterialStore } from '../store/pbrMaterialStore';
import { useModelStore } from '../store/modelStore';
import { setMaterialProperty } from '../store/workbenchActions';
import { EntryVariant } from '../types/library';

describe('variantStore & Unified Variant Model (F8)', () => {
  beforeEach(() => {
    useVariantStore.getState().resetVariants();
    usePbrMaterialStore.getState().resetPbrMaterials();
  });

  describe('Canonical Variant Lifecycle', () => {
    it('initializes with default canonical variant', () => {
      const state = useVariantStore.getState();
      expect(state.variants).toHaveLength(1);
      expect(state.variants[0].id).toBe('var-default');
      expect(state.variants[0].isDefault).toBe(true);
      expect(state.activeVariantId).toBe('var-default');
    });

    it('creates a new variant and switches to it', () => {
      const store = useVariantStore.getState();
      store.createVariant('Cuero Natural', false);

      const state = useVariantStore.getState();
      expect(state.variants).toHaveLength(2);
      expect(state.variants[1].name).toBe('Cuero Natural');
      expect(state.activeVariantId).toBe(state.variants[1].id);
    });

    it('renames variant without mutating other variants', () => {
      const store = useVariantStore.getState();
      store.createVariant('Original Name', false);
      const newVarId = useVariantStore.getState().activeVariantId!;

      store.renameVariant(newVarId, 'Renamed Name');

      const state = useVariantStore.getState();
      const target = state.variants.find((v) => v.id === newVarId);
      expect(target?.name).toBe('Renamed Name');
    });

    it('deletes active variant and reselects remaining variant gracefully', () => {
      const store = useVariantStore.getState();
      store.createVariant('Variant 2', false);
      const var2Id = useVariantStore.getState().activeVariantId!;

      expect(useVariantStore.getState().variants).toHaveLength(2);

      store.deleteVariant(var2Id);

      const state = useVariantStore.getState();
      expect(state.variants).toHaveLength(1);
      expect(state.activeVariantId).toBe('var-default');
    });
  });

  describe('Zombie Texture Prevention (F8)', () => {
    it('purges texture from ALL variants when removed, preventing zombie resurrection on switch', () => {
      const store = useVariantStore.getState();

      // Create Variant 2
      store.createVariant('Variant 2', false);
      const var2Id = useVariantStore.getState().activeVariantId!;

      // Add texture to slot 'baseColor' on Variant 2
      const textureItem: MapVariantItem = {
        id: 'tex-cuero-1',
        name: 'Cuero Negro',
        url: 'blob:cuero-negro',
        filePath: '/path/to/cuero_negro.webp',
        fileName: 'cuero_negro.webp',
        fileSize: 1024
      };
      store.addMapVariant('baseColor', textureItem);

      // Also attach this same texture to var-default
      store.selectVariant('var-default');
      store.selectMapVariant('baseColor', textureItem.id);

      // Verify both variants reference this texture
      const stateBefore = useVariantStore.getState();
      const varDefaultMaps = stateBefore.variants.find((v) => v.id === 'var-default')?.maps;
      const var2Maps = stateBefore.variants.find((v) => v.id === var2Id)?.maps;

      expect(varDefaultMaps?.baseColor?.filePath).toBe('/path/to/cuero_negro.webp');
      expect(var2Maps?.baseColor?.filePath).toBe('/path/to/cuero_negro.webp');

      // Now while on 'var-default', delete the texture via removeMapVariant
      store.removeMapVariant('baseColor', textureItem.id);

      // Verify texture is removed from var-default
      const stateAfter = useVariantStore.getState();
      expect(stateAfter.variants.find((v) => v.id === 'var-default')?.maps?.baseColor).toBeUndefined();

      // Crucial test: Texture MUST ALSO be removed from inactive Variant 2!
      expect(stateAfter.variants.find((v) => v.id === var2Id)?.maps?.baseColor).toBeUndefined();

      // Now switch to Variant 2
      store.selectVariant(var2Id);

      // Invalidation check: Deleted texture must NOT resurrect into mapVariants or colorways!
      const finalState = useVariantStore.getState();
      const resurrectedInPool = finalState.mapVariants.baseColor.some((m) => m.id === textureItem.id);
      const resurrectedInColorways = selectColorways(finalState).some((c) => c.id === textureItem.id);

      expect(resurrectedInPool).toBe(false);
      expect(resurrectedInColorways).toBe(false);
    });
  });

  describe('Divergent Synchronization Loop Elimination', () => {
    it('automatically keeps colorways in sync with baseColor mapVariants', () => {
      const store = useVariantStore.getState();

      const item1: MapVariantItem = {
        id: 'c1',
        name: 'Lino Blanco',
        url: 'blob:lino-blanco',
        filePath: '/textures/lino.png',
        fileName: 'lino.png'
      };
      store.addMapVariant('baseColor', item1);

      let state = useVariantStore.getState();
      expect(selectColorways(state)).toHaveLength(1);
      expect(selectColorways(state)[0].name).toBe('Lino Blanco');
      expect(selectColorways(state)[0].baseColorUrl).toBe('blob:lino-blanco');

      // Rename map variant
      store.renameMapVariant('baseColor', 'c1', 'Lino Marfil');
      state = useVariantStore.getState();
      expect(selectColorways(state)[0].name).toBe('Lino Marfil');

      // Remove map variant
      store.removeMapVariant('baseColor', 'c1');
      state = useVariantStore.getState();
      expect(selectColorways(state)).toHaveLength(0);
    });
  });

  describe('PBR Store Cross-Store Synchronization', () => {
    it('applies variant PBR parameters when selecting a variant', () => {
      const store = useVariantStore.getState();
      const pbr = usePbrMaterialStore.getState();

      // Create new variant
      store.createVariant('Metalizado', false);
      const metalId = useVariantStore.getState().activeVariantId!;

      // Set PBR parameters on this variant
      store.syncActiveVariantParameters({
        roughnessFactor: 0.15,
        metalnessFactor: 0.95
      });

      // Switch to default variant
      store.selectVariant('var-default');
      expect(usePbrMaterialStore.getState().roughnessFactor).toBe(1.0);

      // Switch back to Metalizado variant
      store.selectVariant(metalId);

      // PBR material store must reflect the variant's saved parameters
      const currentPbr = usePbrMaterialStore.getState();
      expect(currentPbr.roughnessFactor).toBe(0.15);
      expect(currentPbr.metalnessFactor).toBe(0.95);
    });
  });

  describe('Cross-store material property sync via workbenchActions', () => {
    it('writes model state to the model store and material properties to the PBR store and active variant', () => {
      useModelStore.getState().setModel('/models/armchair.glb', 'blob:armchair', 2048);
      expect(useModelStore.getState().modelFilePath).toBe('/models/armchair.glb');
      expect(useModelStore.getState().modelFileSize).toBe(2048);

      setMaterialProperty('roughnessFactor', 0.42);
      expect(usePbrMaterialStore.getState().roughnessFactor).toBe(0.42);

      const activeId = useVariantStore.getState().activeVariantId;
      const allVars = useVariantStore.getState().variants;
      const activeVar = allVars.find((v) => v.id === activeId);
      expect(activeVar?.settings?.roughnessFactor).toBe(0.42);
    });
  });
});
