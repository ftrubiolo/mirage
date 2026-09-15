import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleCanvasDrop } from '../utils/canvasDropHandler';
import { useVariantStore } from '../store/variantStore';
import { usePbrMaterialStore } from '../store/pbrMaterialStore';
import { useModelStore } from '../store/modelStore';
import { useAppStore } from '../store/appStore';

describe('canvasDropHandler', () => {
  beforeEach(() => {
    // Reset stores
    useVariantStore.getState().resetVariants();
    usePbrMaterialStore.getState().resetPbrMaterials();
    useModelStore.getState().resetModel();
    useAppStore.getState().setActiveEntrySlug(null);

    // Mock electronAPI
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
      }))
    } as any;
  });

  it('assigns a single dropped map file based on _<map type>', async () => {
    const result = await handleCanvasDrop(['/path/to/chair_baseColor.png']);

    expect(result.assignedCount).toBe(1);
    expect(result.assignedSlots).toEqual(['baseColor']);
    expect(window.electronAPI.approveDroppedPath).toHaveBeenCalledWith('/path/to/chair_baseColor.png');

    const pbr = usePbrMaterialStore.getState();
    expect(pbr.baseColorMap.url).toContain('local-asset:///path/to/chair_baseColor.png');
    expect(pbr.slotEnabled.baseColor).toBe(true);

    const variants = useVariantStore.getState().mapVariants.baseColor;
    expect(variants.length).toBe(1);
    expect(variants[0].filePath).toBe('/path/to/chair_baseColor.png');
  });

  it('assigns multiple dropped map files and updates packing mode for ORM', async () => {
    const files = [
      '/path/to/chair_baseColor.png',
      '/path/to/chair_normal.png',
      '/path/to/chair_orm.png'
    ];

    const result = await handleCanvasDrop(files);

    expect(result.assignedCount).toBe(3);
    expect(result.assignedSlots).toEqual(expect.arrayContaining(['baseColor', 'normal', 'orm']));

    const pbr = usePbrMaterialStore.getState();
    expect(pbr.baseColorMap.url).toBeTruthy();
    expect(pbr.normalMap.url).toBeTruthy();
    expect(pbr.ormMap.url).toBeTruthy();
    expect(pbr.useOrmPack).toBe(true);
    expect(pbr.materialPackingMode).toBe('orm');
  });

  it('sets separate mode when separate roughness and metalness maps are dropped', async () => {
    const files = [
      '/path/to/table_roughness.webp',
      '/path/to/table_metalness.png'
    ];

    const result = await handleCanvasDrop(files);

    expect(result.assignedCount).toBe(2);
    expect(result.assignedSlots).toEqual(expect.arrayContaining(['roughness', 'metalness']));

    const pbr = usePbrMaterialStore.getState();
    expect(pbr.useOrmPack).toBe(false);
    expect(pbr.materialPackingMode).toBe('separate');
  });

  it('loads a dropped 3D model (.glb) into modelStore', async () => {
    const result = await handleCanvasDrop(['/assets/sofa.glb']);

    expect(result.loadedModel).toBe('/assets/sofa.glb');
    expect(result.assignedCount).toBe(0);

    const model = useModelStore.getState();
    expect(model.modelFilePath).toBe('/assets/sofa.glb');
    expect(model.modelUrl).toContain('local-asset:///assets/sofa.glb');
    expect(model.productName).toBe('sofa');
  });

  it('handles simultaneous drop of model + multiple texture maps', async () => {
    const files = [
      '/assets/lamp.glb',
      '/assets/lamp_baseColor.png',
      '/assets/lamp_normal.png',
      '/assets/lamp_emissive.png'
    ];

    const result = await handleCanvasDrop(files);

    expect(result.loadedModel).toBe('/assets/lamp.glb');
    expect(result.assignedCount).toBe(3);
    expect(result.assignedSlots).toEqual(expect.arrayContaining(['baseColor', 'normal', 'emissive']));

    const model = useModelStore.getState();
    expect(model.modelFilePath).toBe('/assets/lamp.glb');

    const pbr = usePbrMaterialStore.getState();
    expect(pbr.baseColorMap.url).toBeTruthy();
    expect(pbr.normalMap.url).toBeTruthy();
    expect(pbr.emissiveMap.url).toBeTruthy();
  });

  it('copies dropped files into active library entry if activeEntrySlug is set', async () => {
    useAppStore.getState().setActiveEntrySlug('sofa-lux');

    const result = await handleCanvasDrop(['/downloads/leather_baseColor.png']);

    expect(result.assignedCount).toBe(1);
    expect(window.electronAPI.copyFileToLibrary).toHaveBeenCalledWith(
      expect.objectContaining({
        entrySlug: 'sofa-lux',
        sourceFilePath: '/downloads/leather_baseColor.png',
        targetType: 'baseColor'
      })
    );

    const pbr = usePbrMaterialStore.getState();
    expect(pbr.baseColorMap.filePath).toContain('/library/sofa-lux/sofa-lux_baseColor');
  });

  it('skips unrecognized files gracefully', async () => {
    const files = [
      '/assets/readme.txt',
      '/assets/unknown_file.pdf',
      '/assets/chair_baseColor.png'
    ];

    const result = await handleCanvasDrop(files);

    expect(result.assignedCount).toBe(1);
    expect(result.skippedCount).toBe(2);
    expect(result.assignedSlots).toEqual(['baseColor']);
  });
});
