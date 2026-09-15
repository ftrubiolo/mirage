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
      {/* 5. Clearcoat (Laca / Barniz) */}
      <MapSlotPicker
        slot="clearcoat"
        title="Clearcoat"
        icon={<Shield className="w-4 h-4 text-action shrink-0" />}
        placeholderText="Sin mapa de clearcoat (Arrastra imagen aquí)"
        subText="Barniz / Laca Reflectante • WebP / PNG / JPG"
        addVariantLabel="Añadir Variante Clearcoat (Arrastra imagen aquí)"
        pickTitle="Seleccionar Mapa Clearcoat"
      >
        <div className="grid grid-cols-2 gap-3 pt-1">
          <SliderControl
            label="Factor Clearcoat:"
            value={clearcoatFactor}
            onChange={setClearcoatFactor}
            min={0.0}
            max={1.0}
            step={0.05}
            formatDecimals={2}
          />
          <SliderControl
            label="Rugosidad Capa:"
            value={clearcoatRoughness}
            onChange={setClearcoatRoughness}
            min={0.0}
            max={1.0}
            step={0.05}
            formatDecimals={2}
          />
        </div>
      </MapSlotPicker>

      {/* 6. Sheen (Microfibras / Terciopelo) */}
      <MapSlotPicker
        slot="sheen"
        title="Sheen"
        icon={<Feather className="w-4 h-4 text-action shrink-0" />}
        placeholderText="Sin mapa de sheen (Arrastra imagen aquí)"
        subText="Microfibras / Terciopelo • WebP / PNG / JPG"
        addVariantLabel="Añadir Variante Sheen (Arrastra imagen aquí)"
        pickTitle="Seleccionar Mapa Sheen"
      >
        <div className="grid grid-cols-2 gap-3 items-center pt-1 min-w-0">
          <SliderControl
            label="Rugosidad Sheen:"
            value={sheenRoughness}
            onChange={setSheenRoughness}
            min={0.0}
            max={1.0}
            step={0.05}
            formatDecimals={2}
          />
          <ColorPickerControl
            label="Color Sheen:"
            value={sheenColor}
            onChange={setSheenColor}
            placeholder="#000000"
          />
        </div>
      </MapSlotPicker>

      {/* 7. Transmission & IOR (Vidrio / Acrílico) */}
      <MapSlotPicker
        slot="transmission"
        title="Transmisión & Refracción"
        icon={<Droplets className="w-4 h-4 text-action shrink-0" />}
        placeholderText="Sin mapa de transmisión (Arrastra imagen aquí)"
        subText="Transmisión / Vidrio & Cristal • WebP / PNG / JPG"
        addVariantLabel="Añadir Variante Transmisión (Arrastra imagen aquí)"
        pickTitle="Seleccionar Mapa de Transmisión"
      >
        <div className="grid grid-cols-2 gap-3 pt-1">
          <SliderControl
            label="Transmisión:"
            value={transmissionFactor}
            onChange={setTransmissionFactor}
            min={0.0}
            max={1.0}
            step={0.05}
            formatDecimals={2}
          />
          <SliderControl
            label="Refracción (IOR):"
            value={ior}
            onChange={setIor}
            min={1.0}
            max={2.5}
            step={0.02}
            formatDecimals={2}
          />
        </div>
      </MapSlotPicker>

      {/* 8. Alpha Map (Transparencia / Recorte) */}
      <MapSlotPicker
        slot="alpha"
        title="Máscara Alpha"
        icon={<Eye className="w-4 h-4 text-action shrink-0" />}
        placeholderText="Sin máscara alpha (Arrastra imagen aquí)"
        subText="Máscara Alpha / Recorte • WebP / PNG / JPG"
        addVariantLabel="Añadir Variante Alpha (Arrastra imagen aquí)"
        pickTitle="Seleccionar Máscara Alpha"
      />

      {/* 9. Displacement Map (Altura real de vértices) */}
      <MapSlotPicker
        slot="displacement"
        title="Desplazamiento"
        icon={<Mountain className="w-4 h-4 text-action shrink-0" />}
        placeholderText="Sin mapa de desplazamiento (Arrastra imagen aquí)"
        subText="Altura Real de Vértices • WebP / PNG / JPG"
        addVariantLabel="Añadir Variante Desplazamiento (Arrastra imagen aquí)"
        pickTitle="Seleccionar Mapa de Desplazamiento"
      >
        <div className="pt-1">
          <SliderControl
            label="Escala de Desplazamiento:"
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
