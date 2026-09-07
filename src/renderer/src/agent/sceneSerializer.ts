import { useWorkbenchStore, ALL_SLOT_NAMES } from '../store/workbenchStore';
import { useViewportStore } from '../store/viewportStore';
import { useAppStore } from '../store/appStore';

export interface SceneContextSnapshot {
  modelName: string;
  triangleCount: number;
  vertexCount: number;
  meshCount: number;
  dimensions: { width: number; height: number; depth: number } | null;
  unitType: string;
  activeVariantName: string;
  activeColorwayName: string | null;
  debugChannel: string;
  environmentPreset: string;
  activeMaps: string[];
  pbrValues: Record<string, any>;
}

export function extractSceneSnapshot(): SceneContextSnapshot {
  const wb = useWorkbenchStore.getState();
  const vp = useViewportStore.getState();

  const activeVariant = wb.variants.find((v) => v.id === wb.activeVariantId);
  const activeColorway = wb.colorways.find((c) => c.id === wb.activeColorwayId);

  const activeMaps: string[] = [];
  for (const slot of ALL_SLOT_NAMES) {
    const isEnabled = wb.slotEnabled[slot] ?? true;
    const map = (wb as any)[`${slot}Map`];
    if (isEnabled && (map?.url || map?.filePath)) {
      activeMaps.push(`${slot}: ${map.fileName || 'asignado'}`);
    }
  }

  return {
    modelName: wb.productName || wb.modelFilePath?.split('/').pop() || 'Sin modelo cargado',
    triangleCount: wb.modelStats?.triangleCount ?? 0,
    vertexCount: wb.modelStats?.vertexCount ?? 0,
    meshCount: wb.modelStats?.meshCount ?? 0,
    dimensions: wb.modelStats?.dimensions ?? null,
    unitType: wb.unitType,
    activeVariantName: activeVariant?.name || 'Default',
    activeColorwayName: activeColorway?.name || null,
    debugChannel: wb.debugChannel,
    environmentPreset: vp.environmentPreset,
    activeMaps,
    pbrValues: {
      roughnessFactor: wb.roughnessFactor,
      metalnessFactor: wb.metalnessFactor,
      normalScale: wb.normalScale,
      normalInvertY: wb.normalInvertY,
      aoIntensity: wb.aoIntensity,
      emissiveIntensity: wb.emissiveIntensity,
      emissiveColor: wb.emissiveColor,
      clearcoatFactor: wb.clearcoatFactor,
      clearcoatRoughness: wb.clearcoatRoughness,
      sheenColor: wb.sheenColor,
      sheenRoughness: wb.sheenRoughness,
      transmissionFactor: wb.transmissionFactor,
      ior: wb.ior,
      displacementScale: wb.displacementScale
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
