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
      activeMaps.push(`${slot}: ${map.fileName || 'asignado'}`);
    }
  }

  return {
    modelName: model.productName || model.modelFilePath?.split('/').pop() || 'Sin modelo cargado',
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
    : 'No calculado';

  const mapsStr = s.activeMaps.length > 0 ? s.activeMaps.join(', ') : 'Ninguno (usando mapas embebidos del .glb)';

  return `
[ESTADO ACTUAL DEL TALLER 3D (MIRAGE ATELIER)]
- Pieza Activa: "${s.modelName}" | Variante Activa: "${s.activeVariantName}"
- Orientación 3D: [X: ${s.modelRotation.x}°, Y: ${s.modelRotation.y}°, Z: ${s.modelRotation.z}°]
- Metrología: ${s.triangleCount.toLocaleString()} triángulos, ${s.vertexCount.toLocaleString()} vértices, ${s.meshCount} mallas.
- Dimensiones Reales: ${dimStr}
- Pase de Render / Depuración: ${s.debugChannel.toUpperCase()} | Entorno HDR: ${s.environmentPreset}
- Mapas PBR Activos: [${mapsStr}]
- Parámetros PBR Actuales:
  * Rugosidad (Roughness): ${s.pbrValues.roughnessFactor.toFixed(2)}
  * Metalicidad (Metalness): ${s.pbrValues.metalnessFactor.toFixed(2)}
  * Escala Normal: ${s.pbrValues.normalScale.toFixed(2)} (Invertir Y DirectX: ${s.pbrValues.normalInvertY ? 'Sí' : 'No'})
  * Oclusión Ambiental: ${s.pbrValues.aoIntensity.toFixed(2)}
  * Barniz (Clearcoat): factor ${s.pbrValues.clearcoatFactor.toFixed(2)}, rugosidad ${s.pbrValues.clearcoatRoughness.toFixed(2)}
  * Brillo Aterciopelado (Sheen): color ${s.pbrValues.sheenColor}, rugosidad ${s.pbrValues.sheenRoughness.toFixed(2)}
  * Refracción/Vidrio (Transmission): ${s.pbrValues.transmissionFactor.toFixed(2)}, IOR: ${s.pbrValues.ior.toFixed(2)}
  * Emisión: factor ${s.pbrValues.emissiveIntensity.toFixed(2)}, color ${s.pbrValues.emissiveColor}
`.trim();
}
