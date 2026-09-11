import { describe, it, expect, beforeEach } from 'vitest';
import { useModelStore } from '../store/modelStore';
import { loadWorkbenchState } from '../store/workbenchActions';

describe('modelStore & Model Replacement Cache Busting', () => {
  beforeEach(() => {
    useModelStore.getState().resetModel();
  });

  it('sets initial model with cache-busting timestamp', () => {
    const store = useModelStore.getState();
    store.setModel('/path/to/sofa.glb', 'local-asset:///path/to/sofa.glb', 1048576);

    const state = useModelStore.getState();
    expect(state.modelFilePath).toBe('/path/to/sofa.glb');
    expect(state.modelFileSize).toBe(1048576);
    expect(state.isModelLoading).toBe(true);
    expect(state.modelUrl).toMatch(/^local-asset:\/\/\/path\/to\/sofa\.glb\?t=/);
  });

  it('generates a new unique modelUrl when replacing model with the exact same path', () => {
    const store = useModelStore.getState();
    store.setModel('/path/to/sofa.glb', 'local-asset:///path/to/sofa.glb', 1000);
    const firstUrl = useModelStore.getState().modelUrl;

    // Simulate replacing the file on disk and calling setModel again with the same path
    store.setModel('/path/to/sofa.glb', 'local-asset:///path/to/sofa.glb', 2000);
    const secondUrl = useModelStore.getState().modelUrl;

    expect(firstUrl).toBeDefined();
    expect(secondUrl).toBeDefined();
    expect(secondUrl).not.toBe(firstUrl);
    expect(useModelStore.getState().modelFileSize).toBe(2000);
    expect(useModelStore.getState().isModelLoading).toBe(true);
  });

  it('preserves blob: and data: URLs without appending query string parameters', () => {
    const store = useModelStore.getState();
    store.setModel('/path/to/blob.glb', 'blob:http://localhost:5173/uuid-1234', 500);

    let state = useModelStore.getState();
    expect(state.modelUrl).toBe('blob:http://localhost:5173/uuid-1234');

    store.setModel('/path/to/data.glb', 'data:application/octet-stream;base64,AAAA', 200);
    state = useModelStore.getState();
    expect(state.modelUrl).toBe('data:application/octet-stream;base64,AAAA');
  });

  it('clears modelUrl and sets isModelLoading to false when model is reset or null', () => {
    const store = useModelStore.getState();
    store.setModel('/path/to/sofa.glb', 'local-asset:///path/to/sofa.glb', 1000);
    expect(useModelStore.getState().modelUrl).not.toBeNull();

    store.setModel(null, null, 0);
    expect(useModelStore.getState().modelUrl).toBeNull();
    expect(useModelStore.getState().modelFilePath).toBeNull();
    expect(useModelStore.getState().isModelLoading).toBe(false);

    store.setModel('/path/to/sofa.glb', 'local-asset:///path/to/sofa.glb', 1000);
    store.resetModel();
    expect(useModelStore.getState().modelUrl).toBeNull();
    expect(useModelStore.getState().modelFilePath).toBeNull();
    expect(useModelStore.getState().isModelLoading).toBe(false);
  });

  it('accurately calculates dimensions and updates when unit scale changes', () => {
    const store = useModelStore.getState();
    store.setModelStats({
      triangleCount: 5000,
      vertexCount: 2500,
      meshCount: 3,
      materials: ['Mat1'],
      dimensions: { width: 1.0, height: 2.0, depth: 0.5 }
    });

    let state = useModelStore.getState();
    expect(state.modelStats?.dimensions).toEqual({ width: 1.0, height: 2.0, depth: 0.5 });

    // Change unit scale to 10.0
    store.setUnitScale(10.0, 'cm');
    state = useModelStore.getState();
    expect(state.unitScale).toBe(10.0);
    expect(state.unitType).toBe('cm');
    expect(state.modelStats?.dimensions).toEqual({ width: 10.0, height: 20.0, depth: 5.0 });
  });

  it('loadWorkbenchState handles switching between different entries and preserves current model when same', () => {
    // 1. Load entry A
    loadWorkbenchState({
      productId: 'chair',
      productSlug: 'chair',
      productName: 'Office Chair',
      modelFilePath: '/library/chair/chair_model.glb',
      modelUrl: 'local-asset:///library/chair/chair_model.glb',
      modelFileSize: 12000
    });

    const chairUrl = useModelStore.getState().modelUrl;
    expect(chairUrl).toMatch(/^local-asset:\/\/\/library\/chair\/chair_model\.glb\?t=/);
    expect(useModelStore.getState().isModelLoading).toBe(true);

    // Turn off loading once loaded
    useModelStore.getState().setIsModelLoading(false);

    // 2. Re-hydrate entry A with same clean URL (e.g. updating metadata)
    loadWorkbenchState({
      productId: 'chair',
      productSlug: 'chair',
      productName: 'Office Chair Renamed',
      modelFilePath: '/library/chair/chair_model.glb',
      modelUrl: 'local-asset:///library/chair/chair_model.glb',
      modelFileSize: 12000
    });

    // Should retain identical URL reference and NOT trigger isModelLoading
    expect(useModelStore.getState().modelUrl).toBe(chairUrl);
    expect(useModelStore.getState().isModelLoading).toBe(false);

    // 3. Switch to entry B
    loadWorkbenchState({
      productId: 'table',
      productSlug: 'table',
      productName: 'Dining Table',
      modelFilePath: '/library/table/table_model.glb',
      modelUrl: 'local-asset:///library/table/table_model.glb',
      modelFileSize: 24000
    });

    const tableUrl = useModelStore.getState().modelUrl;
    expect(tableUrl).toMatch(/^local-asset:\/\/\/library\/table\/table_model\.glb\?t=/);
    expect(tableUrl).not.toBe(chairUrl);
    expect(useModelStore.getState().isModelLoading).toBe(true);
  });
});
