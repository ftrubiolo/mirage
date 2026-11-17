import { Product3DConfig, MaterialProfile, VariantTextureCombination, OptionGroup } from '../types/config';
import { ModelState } from './modelStore';
import { PbrMaterialState } from './pbrMaterialStore';
import { VariantState } from './variantStore';

export interface ExportConfigInputs {
  productId: string;
  productName: string;
  modelFilePath: string | null;
  dimensions?: { width: number; height: number; depth: number } | null;
  triangleCount?: number;
  slotEnabled: Record<string, boolean>;
  normalMapUrl?: string | null;
  ormMapUrl?: string | null;
  baseColorMapUrl?: string | null;
  baseColorMapFileName?: string | null;
  normalScale: number;
  roughnessFactor: number;
  metalnessFactor: number;
  aoIntensity: number;
  baseColorVariants?: { id: string; name: string; url: string }[];
}

/**
 * Pure generator function producing valid Product3DConfig for web embedding and distribution.
 */
export function buildExportConfig(inputs: ExportConfigInputs): Product3DConfig {
  const dims = inputs.dimensions || { width: 0.8, height: 0.85, depth: 0.8 };

  const isNormalEnabled = inputs.slotEnabled?.normal ?? true;
  const isOrmEnabled = inputs.slotEnabled?.orm ?? true;
  const isBaseColorEnabled = inputs.slotEnabled?.baseColor ?? true;

  const materialProfile: MaterialProfile = {
    id: 'default-profile',
    name: `${inputs.productName} Finish`,
    normalMapUrl: isNormalEnabled ? inputs.normalMapUrl || '' : '',
    ormMapUrl: isOrmEnabled ? inputs.ormMapUrl || '' : '',
    normalScale: inputs.normalScale,
    roughnessFactor: inputs.roughnessFactor,
    metalnessFactor: inputs.metalnessFactor,
    aoIntensity: inputs.aoIntensity
  };

  const combinations: Record<string, VariantTextureCombination> = {};
  const baseVariants = isBaseColorEnabled
    ? inputs.baseColorVariants && inputs.baseColorVariants.length > 0
      ? inputs.baseColorVariants
      : inputs.baseColorMapUrl
      ? [
          {
            id: 'baseColor-1',
            name: inputs.baseColorMapFileName || 'BaseColor',
            url: inputs.baseColorMapUrl
          }
        ]
      : []
    : [];

  const options = baseVariants.map((c) => {
    const optId = c.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    combinations[`variant:${optId}`] = {
      combinationKey: `variant:${optId}`,
      baseColorMapUrl: c.url,
      materialProfileId: 'default-profile',
      name: c.name
    };
    return {
      id: optId,
      name: c.name
    };
  });

  const optionGroups: OptionGroup[] = [
    {
      id: 'variant',
      name: 'Color Variant',
      options
    }
  ];

  const defaultKey = Object.keys(combinations)[0] || '';

  return {
    version: '1.0',
    productId: inputs.productId,
    productName: inputs.productName,
    modelUrl: inputs.modelFilePath
      ? inputs.modelFilePath.split(/[\\/]/).pop() || 'model.glb'
      : 'model.glb',
    dimensions: dims,
    materialProfiles: {
      'default-profile': materialProfile
    },
    optionGroups,
    combinations,
    defaultCombinationKey: defaultKey,
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      exportedBy: 'Mirage 3D Workbench',
      triangleCount: inputs.triangleCount,
      polycount: inputs.triangleCount
    }
  };
}

/**
 * Composes model, PBR, and variant store states into a Product3DConfig.
 */
export function generateExportConfigFromStores(
  model: Pick<ModelState, 'productId' | 'productName' | 'modelFilePath' | 'modelStats'>,
  pbr: Pick<
    PbrMaterialState,
    'slotEnabled' | 'normalMap' | 'ormMap' | 'baseColorMap' | 'normalScale' | 'roughnessFactor' | 'metalnessFactor' | 'aoIntensity'
  >,
  variant: Pick<VariantState, 'mapVariants'>
): Product3DConfig {
  const baseVariants = (variant.mapVariants?.baseColor || []).map((v) => ({
    id: v.id,
    name: v.name,
    url: v.url
  }));

  return buildExportConfig({
    productId: model.productId,
    productName: model.productName,
    modelFilePath: model.modelFilePath,
    dimensions: model.modelStats?.dimensions,
    triangleCount: model.modelStats?.triangleCount,
    slotEnabled: pbr.slotEnabled,
    normalMapUrl: pbr.normalMap?.url,
    ormMapUrl: pbr.ormMap?.url,
    baseColorMapUrl: pbr.baseColorMap?.url,
    baseColorMapFileName: pbr.baseColorMap?.fileName,
    normalScale: pbr.normalScale,
    roughnessFactor: pbr.roughnessFactor,
    metalnessFactor: pbr.metalnessFactor,
    aoIntensity: pbr.aoIntensity,
    baseColorVariants: baseVariants
  });
}
