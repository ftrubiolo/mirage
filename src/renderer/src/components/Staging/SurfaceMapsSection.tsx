import React from 'react';
import { Palette, Layers } from 'lucide-react';
import { usePbrMaterialStore } from '../../store/pbrMaterialStore';
import { useModelStore } from '../../store/modelStore';
import { setMaterialProperty } from '../../store/workbenchActions';
import { Checkbox, SliderControl, ColorPickerControl } from '../UI';
import { getOriginalMaterialData } from '../../utils/pbrController';
import { MapSlotPicker } from './MapSlotPicker';

export const SurfaceMapsSection: React.FC = React.memo(() => {
  const baseColor = usePbrMaterialStore((s) => s.baseColor);
  const activeMaterialName = usePbrMaterialStore((s) => s.activeMaterialName);
  const modelStats = useModelStore((s) => s.modelStats);
  const normalScale = usePbrMaterialStore((s) => s.normalScale);
  const normalInvertY = usePbrMaterialStore((s) => s.normalInvertY);

  const setBaseColor = (v: string) => setMaterialProperty('baseColor', v);
  const setNormalScale = (v: number) => setMaterialProperty('normalScale', v);
  const setNormalInvertY = (v: boolean) => setMaterialProperty('normalInvertY', v);

  const handleResetBaseColor = () => {
    let origHex = '#ffffff';
    const targetMatName = activeMaterialName || modelStats?.materials?.[0];
    const orig = getOriginalMaterialData(targetMatName);
    if (orig?.color) {
      origHex = `#${orig.color.getHexString()}`;
    }
    setBaseColor(origHex);
  };

  return (
    <>
      {/* 1. BaseColor / Albedo Slot & Colorways Manager */}
      <MapSlotPicker
        slot="baseColor"
        title="BaseColor"
        icon={<Palette className="w-4 h-4 text-action shrink-0" />}
        placeholderText="No BaseColor map (Drop image here)"
        subText="Diffuse / Albedo Color • WebP / PNG / JPG"
        addVariantLabel="Add Colorway (Drop image here)"
        addVariantSubtext="BaseColor Texture Variant • WebP / PNG / JPG"
        pickTitle="Select BaseColor"
      >
        <div className="pt-2 border-t border-hairline/60 flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <ColorPickerControl
              label="Base Color:"
              value={baseColor}
              onChange={setBaseColor}
            />
          </div>
          <button
            type="button"
            onClick={handleResetBaseColor}
            className="text-[10px] text-ink-muted hover:text-ink-primary self-end pb-1 underline decoration-dotted transition-colors cursor-pointer shrink-0"
            title="Reset color to .glb original or white"
          >
            Reset
          </button>
        </div>
      </MapSlotPicker>

      {/* 2. Normal Map Slot */}
      <MapSlotPicker
        slot="normal"
        title="Normal Map"
        icon={<Layers className="w-4 h-4 text-action shrink-0" />}
        placeholderText="No normal map (Drop image here)"
        subText="Surface Detail (OpenGL / DirectX Tangent) • WebP / PNG / JPG"
        addVariantLabel="Add Normal Variant (Drop image here)"
        pickTitle="Select Normal Map"
      >
        <div className="grid grid-cols-2 gap-3 items-end pt-1">
          <SliderControl
            label="Normal Depth:"
            value={normalScale}
            onChange={setNormalScale}
            min={0.0}
            max={2.5}
            step={0.05}
            unit="x"
            formatDecimals={2}
          />
          <div className="flex items-center h-6">
            <Checkbox
              checked={normalInvertY}
              onChange={setNormalInvertY}
              label="Invert Y Channel (DirectX)"
            />
          </div>
        </div>
      </MapSlotPicker>
    </>
  );
});

export default SurfaceMapsSection;
