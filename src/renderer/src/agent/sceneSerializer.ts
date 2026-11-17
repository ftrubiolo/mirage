import { ALL_SLOT_NAMES, usePbrMaterialStore } from '../store/pbrMaterialStore';
import { useModelStore } from '../store/modelStore';
import {
  selectActiveColorwayId,
  selectColorways,
  useVariantStore
} from '../store/variantStore';
import { useViewportStore } from '../store/viewportStore';
import { useAppStore } from '../store/appStore';

export interface SceneContextSnapshot {
  modelName: string;
  triangleCount: number;
  vertexCount: number;
  meshCount: number;
  dimensions: { width: number; height: number; depth: number } | null;
  unitType: string;
  modelRotation: { x: number; y: number; z: number };
  activeVariantName: string;
  activeColorwayName: string | null;
  debugChannel: string;
  environmentPreset: string;
  activeMaps: string[];
  pbrValues: Record<string, any>;
}

export function extractSceneSnapshot(): SceneContextSnapshot {
  const model = useModelStore.getState();
  const pbr = usePbrMaterialStore.getState();
  const variant = useVariantStore.getState();
  const vp = useViewportStore.getState();

  const activeVariant = variant.variants.find((v) => v.id === variant.activeVariantId);
  const activeColorway = selectColorways(variant).find(
    (c) => c.id === selectActiveColorwayId(variant)
  );

  const activeMaps: string[] = [];
  for (const slot of ALL_SLOT_NAMES) {
    const isEnabled = pbr.slotEnabled[slot] ?? true;
    const map = (pbr as any)[`${slot}Map`];
    if (isEnabled && (map?.url || map?.filePath)) {
      activeMaps.push(`${slot}: ${map.fileName || 'assigned'}`);
    }
  }

  return {
    modelName: model.productName || model.modelFilePath?.split('/').pop() || 'No model loaded',
    triangleCount: model.modelStats?.triangleCount ?? 0,
    vertexCount: model.modelStats?.vertexCount ?? 0,
    meshCount: model.modelStats?.meshCount ?? 0,
    dimensions: model.modelStats?.dimensions ?? null,
    unitType: model.unitType,
    modelRotation: model.modelRotation,
    activeVariantName: activeVariant?.name || 'Default',
    activeColorwayName: activeColorway?.name || null,
    debugChannel: pbr.debugChannel,
    environmentPreset: vp.environmentPreset,
    activeMaps,
    pbrValues: {
      roughnessFactor: pbr.roughnessFactor,
      metalnessFactor: pbr.metalnessFactor,
      normalScale: pbr.normalScale,
      normalInvertY: pbr.normalInvertY,
      aoIntensity: pbr.aoIntensity,
      emissiveIntensity: pbr.emissiveIntensity,
      emissiveColor: pbr.emissiveColor,
      clearcoatFactor: pbr.clearcoatFactor,
      clearcoatRoughness: pbr.clearcoatRoughness,
      sheenColor: pbr.sheenColor,
      sheenRoughness: pbr.sheenRoughness,
      transmissionFactor: pbr.transmissionFactor,
      ior: pbr.ior,
      displacementScale: pbr.displacementScale
    }
  };
}

export function serializeSceneForPrompt(): string {
  const s = extractSceneSnapshot();

  const dimStr = s.dimensions
    ? `${s.dimensions.width.toFixed(2)} × ${s.dimensions.height.toFixed(2)} × ${s.dimensions.depth.toFixed(2)} ${s.unitType}`
    : 'Not computed';

  const mapsStr = s.activeMaps.length > 0 ? s.activeMaps.join(', ') : 'None (using embedded .glb maps)';

  return `
[CURRENT 3D WORKBENCH STATE (MIRAGE STUDIO)]
- Active Model: "${s.modelName}" | Active Variant: "${s.activeVariantName}"
- 3D Orientation: [X: ${s.modelRotation.x}°, Y: ${s.modelRotation.y}°, Z: ${s.modelRotation.z}°]
- Metrology: ${s.triangleCount.toLocaleString()} triangles, ${s.vertexCount.toLocaleString()} vertices, ${s.meshCount} meshes.
- Real-World Dimensions: ${dimStr}
- Render / Debug Pass: ${s.debugChannel.toUpperCase()} | HDR Environment: ${s.environmentPreset}
- Active PBR Maps: [${mapsStr}]
- Current PBR Parameters:
  * Roughness: ${s.pbrValues.roughnessFactor.toFixed(2)}
  * Metalness: ${s.pbrValues.metalnessFactor.toFixed(2)}
  * Normal Scale: ${s.pbrValues.normalScale.toFixed(2)} (Invert DirectX Y: ${s.pbrValues.normalInvertY ? 'Yes' : 'No'})
  * Ambient Occlusion: ${s.pbrValues.aoIntensity.toFixed(2)}
  * Clearcoat: factor ${s.pbrValues.clearcoatFactor.toFixed(2)}, roughness ${s.pbrValues.clearcoatRoughness.toFixed(2)}
  * Sheen: color ${s.pbrValues.sheenColor}, roughness ${s.pbrValues.sheenRoughness.toFixed(2)}
  * Transmission / Glass: ${s.pbrValues.transmissionFactor.toFixed(2)}, IOR: ${s.pbrValues.ior.toFixed(2)}
  * Emissive: intensity ${s.pbrValues.emissiveIntensity.toFixed(2)}, color ${s.pbrValues.emissiveColor}
`.trim();
}
