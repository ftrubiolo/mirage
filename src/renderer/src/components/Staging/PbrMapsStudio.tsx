import React from 'react';
import {
  Palette,
  Layers,
  Lightbulb,
  Shield,
  Feather,
  Droplets,
  Eye,
  Mountain,
  Database,
  Package
} from 'lucide-react';
import { usePbrMaterialStore } from '../../store/pbrMaterialStore';
import { useAppStore } from '../../store/appStore';
import { setMaterialProperty } from '../../store/workbenchActions';
import { Checkbox } from '../UI/Checkbox';
import { Switch } from '../UI/Switch';
import { SliderControl } from '../UI/SliderControl';
import { ColorPickerControl } from '../UI/ColorPickerControl';
import { MapSlotPicker, getNextBaseColorTargetType, getNextSlotTargetType } from './MapSlotPicker';

export { getNextBaseColorTargetType, getNextSlotTargetType };

export const PbrMapsStudio: React.FC = React.memo(() => {
  const useOrmPack = usePbrMaterialStore((s) => s.useOrmPack);
  const setUseOrmPack = usePbrMaterialStore((s) => s.setUseOrmPack);
  const normalScale = usePbrMaterialStore((s) => s.normalScale);
  const normalInvertY = usePbrMaterialStore((s) => s.normalInvertY);
  const roughnessFactor = usePbrMaterialStore((s) => s.roughnessFactor);
  const metalnessFactor = usePbrMaterialStore((s) => s.metalnessFactor);
  const aoIntensity = usePbrMaterialStore((s) => s.aoIntensity);
  const emissiveIntensity = usePbrMaterialStore((s) => s.emissiveIntensity);
  const emissiveColor = usePbrMaterialStore((s) => s.emissiveColor);
  const emissiveFullGlow = usePbrMaterialStore((s) => s.emissiveFullGlow);
  const clearcoatFactor = usePbrMaterialStore((s) => s.clearcoatFactor);
  const clearcoatRoughness = usePbrMaterialStore((s) => s.clearcoatRoughness);
  const sheenColor = usePbrMaterialStore((s) => s.sheenColor);
  const sheenRoughness = usePbrMaterialStore((s) => s.sheenRoughness);
  const transmissionFactor = usePbrMaterialStore((s) => s.transmissionFactor);
  const ior = usePbrMaterialStore((s) => s.ior);
  const displacementScale = usePbrMaterialStore((s) => s.displacementScale);

  // Material edits go through one orchestrating action so the active variant
  // records the value too. The 15 near-identical per-parameter setters these
  // replace no longer exist.
  const setNormalScale = (v: number) => setMaterialProperty('normalScale', v);
  const setNormalInvertY = (v: boolean) => setMaterialProperty('normalInvertY', v);
  const setRoughnessFactor = (v: number) => setMaterialProperty('roughnessFactor', v);
  const setMetalnessFactor = (v: number) => setMaterialProperty('metalnessFactor', v);
  const setAoIntensity = (v: number) => setMaterialProperty('aoIntensity', v);
  const setEmissiveIntensity = (v: number) => setMaterialProperty('emissiveIntensity', v);
  const setEmissiveColor = (v: string) => setMaterialProperty('emissiveColor', v);
  const setEmissiveFullGlow = (v: boolean) => setMaterialProperty('emissiveFullGlow', v);
  const setClearcoatFactor = (v: number) => setMaterialProperty('clearcoatFactor', v);
  const setClearcoatRoughness = (v: number) => setMaterialProperty('clearcoatRoughness', v);
  const setSheenColor = (v: string) => setMaterialProperty('sheenColor', v);
  const setSheenRoughness = (v: number) => setMaterialProperty('sheenRoughness', v);
  const setTransmissionFactor = (v: number) => setMaterialProperty('transmissionFactor', v);
  const setIor = (v: number) => setMaterialProperty('ior', v);
  const setDisplacementScale = (v: number) => setMaterialProperty('displacementScale', v);
  const openOrmPacker = useAppStore((s) => s.openOrmPacker);
  const loadFromCache = usePbrMaterialStore((s) => s.loadFromCache);
  const setLoadFromCache = usePbrMaterialStore((s) => s.setLoadFromCache);

  return (
    <div className="space-y-4 text-ink-primary font-body select-none">
      {/* Switch: Cargar desde Caché (.glb) */}
      <div className="p-3 rounded-xs bg-surface-lowest border border-hairline flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <Database className="w-4 h-4 text-action shrink-0" />
          <div className="min-w-0">
            <span className="text-xs font-semibold text-ink-primary block truncate">
              Cargar desde Caché
            </span>
            <span className="text-[10px] text-ink-secondary block truncate">
              {loadFromCache
                ? 'Activo: Usa texturas nativas del binario en slots vacíos'
                : 'Inactivo: Comportamiento estándar (solo mapas en slots)'}
            </span>
          </div>
        </div>
        <Switch
          checked={loadFromCache}
          onChange={setLoadFromCache}
          title={loadFromCache ? 'Desactivar carga desde caché' : 'Activar carga desde caché'}
        />
      </div>

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

      {/* 3. Material Micro-Geometry (ORM vs Individual Maps) */}
      <div className="p-3.5 rounded-xs bg-surface-lowest border border-hairline space-y-3 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Package className="w-4 h-4 text-action shrink-0" />
            <h3 className="text-xs font-semibold text-ink-primary uppercase tracking-wider font-primary truncate">
              Material PBR
            </h3>
          </div>
          {/* Mode Switcher */}
          <div className="flex rounded-xs bg-surface-low p-0.5 border border-hairline text-[10px] shrink-0">
            <button
              onClick={() => setUseOrmPack(true)}
              className={`px-2 py-0.5 rounded-xs font-medium transition-colors cursor-pointer ${
                useOrmPack
                  ? 'bg-action text-white font-semibold shadow-xs'
                  : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              ORM Único
            </button>
            <button
              onClick={() => setUseOrmPack(false)}
              className={`px-2 py-0.5 rounded-xs font-medium transition-colors cursor-pointer ${
                !useOrmPack
                  ? 'bg-action text-white font-semibold shadow-xs'
                  : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              3 Mapas Separados
            </button>
          </div>
        </div>

        {useOrmPack ? (
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
            <button
              onClick={openOrmPacker}
              className="w-full py-2 px-3 rounded-xs border border-action/30 bg-action/10 hover:bg-action/20 text-action text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors uppercase tracking-wider cursor-pointer"
            >
              <Package className="w-3.5 h-3.5" />
              Abrir Empaquetador ORM con Sharp
            </button>
          </div>
        ) : (
          /* Mode B: 3 Separate Maps */
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
            <button
              onClick={openOrmPacker}
              className="w-full py-2 px-3 rounded-xs border border-action/30 bg-action/10 hover:bg-action/20 text-action text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors uppercase tracking-wider cursor-pointer"
            >
              <Package className="w-3.5 h-3.5" />
              Empaquetar estos canales en ORM.webp con Sharp
            </button>
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

      {/* 4. Emissive Map Slot */}
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
    </div>
  );
});
