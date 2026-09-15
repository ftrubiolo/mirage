import React from 'react';
import { Lightbulb } from 'lucide-react';
import { usePbrMaterialStore } from '../../store/pbrMaterialStore';
import { setMaterialProperty } from '../../store/workbenchActions';
import { ColorPickerControl, SliderControl, Switch } from '../UI';
import { MapSlotPicker } from './MapSlotPicker';

export const EmissiveSection: React.FC = React.memo(() => {
  const emissiveIntensity = usePbrMaterialStore((s) => s.emissiveIntensity);
  const emissiveColor = usePbrMaterialStore((s) => s.emissiveColor);
  const emissiveFullGlow = usePbrMaterialStore((s) => s.emissiveFullGlow);

  const setEmissiveIntensity = (v: number) => setMaterialProperty('emissiveIntensity', v);
  const setEmissiveColor = (v: string) => setMaterialProperty('emissiveColor', v);
  const setEmissiveFullGlow = (v: boolean) => setMaterialProperty('emissiveFullGlow', v);

  return (
    <MapSlotPicker
      slot="emissive"
      title="Mapa Emisivo"
      icon={<Lightbulb className="w-4 h-4 text-action shrink-0" />}
      placeholderText="Sin mapa emisivo (Arrastra imagen aquí)"
      subText="Auto-iluminación & Brillo (RGB) • WebP / PNG / JPG"
      addVariantLabel="Añadir Variante Emisiva (Arrastra imagen aquí)"
      pickTitle="Seleccionar Mapa Emisivo"
    >
      <div className="space-y-3 pt-1 min-w-0">
        <div className="grid grid-cols-2 gap-3 items-center min-w-0">
          <SliderControl
            label="Intensidad Emisiva:"
            value={emissiveIntensity}
            onChange={setEmissiveIntensity}
            min={0.0}
            max={10.0}
            step={0.1}
            unit="x"
            formatDecimals={1}
          />
          <ColorPickerControl
            label="Color Emisivo:"
            value={emissiveColor}
            onChange={setEmissiveColor}
            placeholder="#ffffff"
          />
        </div>

        {/* Switch: Brillo uniforme sin mapa */}
        <div className="p-2.5 rounded-xs bg-surface-lowest border border-hairline flex items-center justify-between gap-3 shadow-xs">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-ink-primary block truncate">
              Brillo uniforme sin mapa
            </span>
            <span className="text-[10px] text-ink-secondary block truncate">
              {emissiveFullGlow
                ? 'Activo: Aplica emisión a toda la superficie aunque no haya mapa'
                : 'Inactivo: Solo emite luz con mapa de emisión asignado o embebido'}
            </span>
          </div>
          <Switch
            checked={emissiveFullGlow}
            onChange={setEmissiveFullGlow}
            title={emissiveFullGlow ? 'Desactivar brillo uniforme' : 'Activar brillo uniforme'}
          />
        </div>
      </div>
    </MapSlotPicker>
  );
});

export default EmissiveSection;
