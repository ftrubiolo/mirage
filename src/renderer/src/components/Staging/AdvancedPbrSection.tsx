import React from 'react';
import { Shield, Feather, Droplets, Eye, Mountain } from 'lucide-react';
import { usePbrMaterialStore } from '../../store/pbrMaterialStore';
import { setMaterialProperty } from '../../store/workbenchActions';
import { ColorPickerControl, SliderControl } from '../UI';
import { MapSlotPicker } from './MapSlotPicker';

export const AdvancedPbrSection: React.FC = React.memo(() => {
  const clearcoatFactor = usePbrMaterialStore((s) => s.clearcoatFactor);
  const clearcoatRoughness = usePbrMaterialStore((s) => s.clearcoatRoughness);
  const sheenColor = usePbrMaterialStore((s) => s.sheenColor);
  const sheenRoughness = usePbrMaterialStore((s) => s.sheenRoughness);
  const transmissionFactor = usePbrMaterialStore((s) => s.transmissionFactor);
  const ior = usePbrMaterialStore((s) => s.ior);
  const displacementScale = usePbrMaterialStore((s) => s.displacementScale);

  const setClearcoatFactor = (v: number) => setMaterialProperty('clearcoatFactor', v);
  const setClearcoatRoughness = (v: number) => setMaterialProperty('clearcoatRoughness', v);
  const setSheenColor = (v: string) => setMaterialProperty('sheenColor', v);
  const setSheenRoughness = (v: number) => setMaterialProperty('sheenRoughness', v);
  const setTransmissionFactor = (v: number) => setMaterialProperty('transmissionFactor', v);
  const setIor = (v: number) => setMaterialProperty('ior', v);
  const setDisplacementScale = (v: number) => setMaterialProperty('displacementScale', v);

  return (
    <>
      {/* 5. Clearcoat (Lacquer / Varnish) */}
      <MapSlotPicker
        slot="clearcoat"
        title="Clearcoat"
        icon={<Shield className="w-4 h-4 text-action shrink-0" />}
        placeholderText="No clearcoat map (Drop image here)"
        subText="Reflective Clearcoat / Lacquer • WebP / PNG / JPG"
        addVariantLabel="Add Clearcoat Variant (Drop image here)"
        pickTitle="Select Clearcoat Map"
      >
        <div className="grid grid-cols-2 gap-3 pt-1">
          <SliderControl
            label="Clearcoat Factor:"
            value={clearcoatFactor}
            onChange={setClearcoatFactor}
            min={0.0}
            max={1.0}
            step={0.05}
            formatDecimals={2}
          />
          <SliderControl
            label="Coat Roughness:"
            value={clearcoatRoughness}
            onChange={setClearcoatRoughness}
            min={0.0}
            max={1.0}
            step={0.05}
            formatDecimals={2}
          />
        </div>
      </MapSlotPicker>

      {/* 6. Sheen (Microfiber / Velvet) */}
      <MapSlotPicker
        slot="sheen"
        title="Sheen"
        icon={<Feather className="w-4 h-4 text-action shrink-0" />}
        placeholderText="No sheen map (Drop image here)"
        subText="Microfiber / Fabric Sheen • WebP / PNG / JPG"
        addVariantLabel="Add Sheen Variant (Drop image here)"
        pickTitle="Select Sheen Map"
      >
        <div className="grid grid-cols-2 gap-3 items-center pt-1 min-w-0">
          <SliderControl
            label="Sheen Roughness:"
            value={sheenRoughness}
            onChange={setSheenRoughness}
            min={0.0}
            max={1.0}
            step={0.05}
            formatDecimals={2}
          />
          <ColorPickerControl
            label="Sheen Color:"
            value={sheenColor}
            onChange={setSheenColor}
            placeholder="#000000"
          />
        </div>
      </MapSlotPicker>

      {/* 7. Transmission & IOR (Glass / Acrylic) */}
      <MapSlotPicker
        slot="transmission"
        title="Transmission & Refraction"
        icon={<Droplets className="w-4 h-4 text-action shrink-0" />}
        placeholderText="No transmission map (Drop image here)"
        subText="Transmission / Glass & Crystal • WebP / PNG / JPG"
        addVariantLabel="Add Transmission Variant (Drop image here)"
        pickTitle="Select Transmission Map"
      >
        <div className="grid grid-cols-2 gap-3 pt-1">
          <SliderControl
            label="Transmission:"
            value={transmissionFactor}
            onChange={setTransmissionFactor}
            min={0.0}
            max={1.0}
            step={0.05}
            formatDecimals={2}
          />
          <SliderControl
            label="Refraction (IOR):"
            value={ior}
            onChange={setIor}
            min={1.0}
            max={2.5}
            step={0.02}
            formatDecimals={2}
          />
        </div>
      </MapSlotPicker>

      {/* 8. Alpha Map (Transparency / Cutout) */}
      <MapSlotPicker
        slot="alpha"
        title="Alpha Mask"
        icon={<Eye className="w-4 h-4 text-action shrink-0" />}
        placeholderText="No alpha mask (Drop image here)"
        subText="Alpha Mask / Cutout • WebP / PNG / JPG"
        addVariantLabel="Add Alpha Variant (Drop image here)"
        pickTitle="Select Alpha Mask"
      />

      {/* 9. Displacement Map (Vertex height) */}
      <MapSlotPicker
        slot="displacement"
        title="Displacement"
        icon={<Mountain className="w-4 h-4 text-action shrink-0" />}
        placeholderText="No displacement map (Drop image here)"
        subText="Vertex Height Displacement • WebP / PNG / JPG"
        addVariantLabel="Add Displacement Variant (Drop image here)"
        pickTitle="Select Displacement Map"
      >
        <div className="pt-1">
          <SliderControl
            label="Displacement Scale:"
            value={displacementScale}
            onChange={setDisplacementScale}
            min={0.0}
            max={0.5}
            step={0.005}
            formatDecimals={3}
          />
        </div>
      </MapSlotPicker>
    </>
  );
});

export default AdvancedPbrSection;
