import React from 'react';
import { Package, Mountain, Droplets, Shield } from 'lucide-react';
import { usePbrMaterialStore } from '../../store/pbrMaterialStore';
import { useAppStore } from '../../store/appStore';
import { setMaterialProperty } from '../../store/workbenchActions';
import { Button, SegmentedControl, SliderControl } from '../UI';
import { MapSlotPicker } from './MapSlotPicker';

export const PbrMicroGeometrySection: React.FC = React.memo(() => {
  const materialPackingMode = usePbrMaterialStore((s) => s.materialPackingMode);
  const setMaterialPackingMode = usePbrMaterialStore((s) => s.setMaterialPackingMode);
  const roughnessFactor = usePbrMaterialStore((s) => s.roughnessFactor);
  const metalnessFactor = usePbrMaterialStore((s) => s.metalnessFactor);
  const aoIntensity = usePbrMaterialStore((s) => s.aoIntensity);
  const openOrmPacker = useAppStore((s) => s.openOrmPacker);

  const setRoughnessFactor = (v: number) => setMaterialProperty('roughnessFactor', v);
  const setMetalnessFactor = (v: number) => setMaterialProperty('metalnessFactor', v);
  const setAoIntensity = (v: number) => setMaterialProperty('aoIntensity', v);

  return (
    <div className="p-3.5 rounded-xs bg-surface-lowest border border-hairline space-y-3 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Package className="w-4 h-4 text-action shrink-0" />
          <h3 className="text-xs font-semibold text-ink-primary uppercase tracking-wider font-primary truncate">
            Material PBR
          </h3>
        </div>
        {/* Mode Switcher */}
        <SegmentedControl
          value={materialPackingMode}
          onChange={(val) => {
            const mode = val as 'orm' | 'metalRoughness' | 'separate';
            setMaterialPackingMode(mode);
            setMaterialProperty('materialPackingMode' as any, mode);
          }}
          options={[
            { value: 'orm', label: 'ORM Único' },
            { value: 'metalRoughness', label: 'glTF Metal-Rough' },
            { value: 'separate', label: '3 Mapas Separados' }
          ]}
          size="xs"
        />
      </div>

      {materialPackingMode === 'orm' && (
        /* Mode A: ORM Combined */
        <div className="space-y-3">
          <MapSlotPicker
            slot="orm"
            embeddedInSection={false}
            title="Mapa ORM"
            icon={<Package className="w-5 h-5 text-action shrink-0" />}
            placeholderText="Sin mapa ORM (Arrastra imagen aquí)"
            subText="Empaquetado PBR (R=AO, G=Rough, B=Metal) • WebP / PNG / JPG"
            addVariantLabel="Añadir Variante ORM (Arrastra imagen aquí)"
            pickTitle="Seleccionar Mapa ORM"
          />
          <Button
            variant="secondary"
            icon={<Package className="w-3.5 h-3.5" />}
            className="w-full"
            onClick={openOrmPacker}
          >
            Abrir Empaquetador ORM con Sharp
          </Button>
        </div>
      )}

      {materialPackingMode === 'metalRoughness' && (
        /* Mode B: glTF Metal-Roughness (combined G=Rough, B=Metal) + Optional AO */
        <div className="space-y-3">
          <MapSlotPicker
            slot="metalRoughness"
            embeddedInSection={false}
            title="Mapa Metal-Rugosidad"
            icon={<Package className="w-5 h-5 text-action shrink-0" />}
            placeholderText="Sin mapa glTF Metal-Roughness (Arrastra imagen aquí)"
            subText="Estándar glTF (G=Rugosidad, B=Metalicidad) • WebP / PNG / JPG"
            addVariantLabel="Añadir Variante Metal-Roughness (Arrastra imagen aquí)"
            pickTitle="Seleccionar Mapa Metal-Roughness"
          />

          <MapSlotPicker
            slot="ao"
            embeddedInSection={false}
            title="Mapa de Oclusión (Opcional)"
            icon={<Mountain className="w-5 h-5 text-action shrink-0" />}
            placeholderText="Sin mapa de oclusión (Opcional)"
            subText="Oclusión Ambiental (AO) • WebP / PNG / JPG"
            addVariantLabel="Añadir Variante AO (Arrastra imagen aquí)"
            pickTitle="Seleccionar Mapa AO"
          />

          <Button
            variant="secondary"
            icon={<Package className="w-3.5 h-3.5" />}
            className="w-full"
            onClick={openOrmPacker}
          >
            Empaquetar Metal-Roughness + AO en ORM.webp con Sharp
          </Button>
        </div>
      )}

      {materialPackingMode === 'separate' && (
        /* Mode C: 3 Separate Maps */
        <div className="space-y-3">
          {/* AO Slot */}
          <MapSlotPicker
            slot="ao"
            embeddedInSection={false}
            title="Mapa de Oclusión"
            icon={<Mountain className="w-5 h-5 text-action shrink-0" />}
            placeholderText="Sin mapa de oclusión (Arrastra imagen aquí)"
            subText="Oclusión Ambiental (AO) • WebP / PNG / JPG"
            addVariantLabel="Añadir Variante AO (Arrastra imagen aquí)"
            pickTitle="Seleccionar Mapa AO"
          />

          {/* Roughness Slot */}
          <MapSlotPicker
            slot="roughness"
            embeddedInSection={false}
            title="Mapa de Rugosidad"
            icon={<Droplets className="w-5 h-5 text-action shrink-0" />}
            placeholderText="Sin mapa de rugosidad (Arrastra imagen aquí)"
            subText="Rugosidad / Micro-superficie • WebP / PNG / JPG"
            addVariantLabel="Añadir Variante Rugosidad (Arrastra imagen aquí)"
            pickTitle="Seleccionar Mapa de Rugosidad"
          />

          {/* Metalness Slot */}
          <MapSlotPicker
            slot="metalness"
            embeddedInSection={false}
            title="Mapa Metálico"
            icon={<Shield className="w-5 h-5 text-action shrink-0" />}
            placeholderText="Sin mapa metálico (Arrastra imagen aquí)"
            subText="Metálico / Conductividad • WebP / PNG / JPG"
            addVariantLabel="Añadir Variante Metálica (Arrastra imagen aquí)"
            pickTitle="Seleccionar Mapa Metálico"
          />

          {/* Action to pack these 3 */}
          <Button
            variant="secondary"
            icon={<Package className="w-3.5 h-3.5" />}
            className="w-full"
            onClick={openOrmPacker}
          >
            Empaquetar estos canales en ORM.webp con Sharp
          </Button>
        </div>
      )}

      {/* Live Material Multipliers */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-hairline">
        <SliderControl
          label="Rugosidad:"
          value={roughnessFactor}
          onChange={setRoughnessFactor}
          min={0.0}
          max={1.5}
          step={0.05}
          formatDecimals={2}
          compact
        />
        <SliderControl
          label="Metalicidad:"
          value={metalnessFactor}
          onChange={setMetalnessFactor}
          min={0.0}
          max={1.0}
          step={0.05}
          formatDecimals={2}
          compact
        />
        <SliderControl
          label="Oclusión:"
          value={aoIntensity}
          onChange={setAoIntensity}
          min={0.0}
          max={2.0}
          step={0.05}
          formatDecimals={2}
          compact
        />
      </div>
    </div>
  );
});

export default PbrMicroGeometrySection;
