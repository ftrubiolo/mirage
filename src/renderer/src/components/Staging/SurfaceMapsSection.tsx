import React from 'react';
import { Palette, Layers } from 'lucide-react';
import { usePbrMaterialStore } from '../../store/pbrMaterialStore';
import { setMaterialProperty } from '../../store/workbenchActions';
import { Checkbox, SliderControl } from '../UI';
import { MapSlotPicker } from './MapSlotPicker';

export const SurfaceMapsSection: React.FC = React.memo(() => {
  const normalScale = usePbrMaterialStore((s) => s.normalScale);
  const normalInvertY = usePbrMaterialStore((s) => s.normalInvertY);

  const setNormalScale = (v: number) => setMaterialProperty('normalScale', v);
  const setNormalInvertY = (v: boolean) => setMaterialProperty('normalInvertY', v);

  return (
    <>
      {/* 1. BaseColor / Albedo Slot & Colorways Manager */}
      <MapSlotPicker
        slot="baseColor"
        title="BaseColor"
        icon={<Palette className="w-4 h-4 text-action shrink-0" />}
        placeholderText="Sin mapa BaseColor (Arrastra imagen aquí)"
        subText="Color Difuso / Albedo • WebP / PNG / JPG"
        addVariantLabel="Añadir Colorway (Arrastra imagen aquí)"
        addVariantSubtext="Variante de Textura BaseColor • WebP / PNG / JPG"
        pickTitle="Seleccionar BaseColor"
      />

      {/* 2. Normal Map Slot */}
      <MapSlotPicker
        slot="normal"
        title="Mapa Normal"
        icon={<Layers className="w-4 h-4 text-action shrink-0" />}
        placeholderText="Sin mapa normal (Arrastra imagen aquí)"
        subText="Relieve de Superficie (Tangente OpenGL / DirectX) • WebP / PNG / JPG"
        addVariantLabel="Añadir Variante de Normal (Arrastra imagen aquí)"
        pickTitle="Seleccionar Mapa Normal"
      >
        <div className="grid grid-cols-2 gap-3 items-end pt-1">
          <SliderControl
            label="Profundidad Normal:"
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
              label="Invertir Canal Y (DirectX)"
            />
          </div>
        </div>
      </MapSlotPicker>
    </>
  );
});

export default SurfaceMapsSection;
