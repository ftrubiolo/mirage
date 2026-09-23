import React from 'react';
import { Layers, Database, RotateCcw } from 'lucide-react';
import { usePbrMaterialStore, countActiveMaps, extractOrigSlotProps } from '../../store/pbrMaterialStore';
import { useModelStore } from '../../store/modelStore';
import { getOriginalMaterialData } from '../../utils/pbrController';
import { Switch } from '../UI';
import { getNextBaseColorTargetType, getNextSlotTargetType } from './MapSlotPicker';
import { SurfaceMapsSection } from './SurfaceMapsSection';
import { PbrMicroGeometrySection } from './PbrMicroGeometrySection';
import { EmissiveSection } from './EmissiveSection';
import { AdvancedPbrSection } from './AdvancedPbrSection';

export {
  getNextBaseColorTargetType,
  getNextSlotTargetType,
  SurfaceMapsSection,
  PbrMicroGeometrySection,
  EmissiveSection,
  AdvancedPbrSection
};

export const PbrMapsStudio: React.FC = React.memo(() => {
  const modelStats = useModelStore((s) => s.modelStats);
  const activeMaterialName = usePbrMaterialStore((s) => s.activeMaterialName);
  const setActiveMaterial = usePbrMaterialStore((s) => s.setActiveMaterial);
  const materialsState = usePbrMaterialStore((s) => s.materialsState);
  const currentBaseColor = usePbrMaterialStore((s) => s.baseColor);
  const activeMapsCount = usePbrMaterialStore((s) => s.activeMapsCount);
  const restoreActiveMaterialOriginal = usePbrMaterialStore((s) => s.restoreActiveMaterialOriginal);
  const loadFromCache = usePbrMaterialStore((s) => s.loadFromCache);
  const setLoadFromCache = usePbrMaterialStore((s) => s.setLoadFromCache);

  const hasMultipleMaterials = Boolean(modelStats?.materials && modelStats.materials.length > 1);

  return (
    <div className="space-y-4 text-ink-primary font-body select-none">
      {/* Multi-material selector tabs (shown only when model has >= 2 materials) */}
      {hasMultipleMaterials && modelStats?.materials && (
        <div className="p-3 rounded-xs bg-surface-lowest border border-hairline shadow-xs space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-ink-primary flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-action" />
              Material Activo
            </span>
            <span className="text-[10px] text-ink-muted">
              {modelStats.materials.length} materiales detectados
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {modelStats.materials.map((matName) => {
              const isActive = (activeMaterialName || modelStats.materials[0]) === matName;
              const slotData = materialsState[matName];
              const matColor = isActive
                ? (currentBaseColor || slotData?.baseColor || '#ffffff')
                : (slotData?.baseColor || '#ffffff');
              const mapCount = isActive
                ? activeMapsCount
                : (slotData ? countActiveMaps(slotData) : 0);

              return (
                <button
                  key={matName}
                  type="button"
                  onClick={() => setActiveMaterial(matName)}
                  className={`px-2.5 py-1.5 text-xs rounded-xs font-mono font-medium transition-all flex items-center gap-2 cursor-pointer ${
                    isActive
                      ? 'bg-action text-white shadow-xs'
                      : 'bg-surface-mid text-ink-secondary hover:text-ink-primary hover:bg-surface-highest'
                  }`}
                  title={`Material: ${matName} • Color: ${matColor}`}
                >
                  <span
                    className="w-3 h-3 rounded-full border border-black/20 shrink-0 shadow-xs"
                    style={{ backgroundColor: matColor }}
                  />
                  <span>{matName}</span>
                  {mapCount > 0 && (
                    <span
                      className={`px-1.5 py-0.2 text-[9px] rounded-full font-mono ${
                        isActive ? 'bg-white/25 text-white' : 'bg-surface-highest text-ink-primary'
                      }`}
                      title={`${mapCount} mapa(s) asignado(s)`}
                    >
                      {mapCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Material Action Bar */}
          <div className="flex items-center justify-between pt-1.5 border-t border-hairline/60 text-[11px]">
            <span className="text-ink-muted truncate">
              Editando: <strong className="text-ink-primary font-mono">{activeMaterialName || modelStats.materials[0]}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                const targetName = activeMaterialName || modelStats.materials[0];
                const orig = getOriginalMaterialData(targetName);
                const origDefaults = extractOrigSlotProps(orig);
                restoreActiveMaterialOriginal(origDefaults);
              }}
              className="flex items-center gap-1 text-ink-secondary hover:text-action transition-colors px-1.5 py-0.5 rounded-xs hover:bg-surface-low cursor-pointer"
              title="Restaurar color y configuración original del GLB para este material"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restaurar original del .glb</span>
            </button>
          </div>
        </div>
      )}

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
                : 'Inactivo: Comportamiento estándar'}
            </span>
          </div>
        </div>
        <Switch
          checked={loadFromCache}
          onChange={setLoadFromCache}
          title={loadFromCache ? 'Desactivar carga desde caché' : 'Activar carga desde caché'}
        />
      </div>

      {/* 1 & 2. Surface Maps (BaseColor + Normal) */}
      <SurfaceMapsSection />

      {/* 3. Micro-Geometry (ORM / Metal-Roughness / Separate maps) */}
      <PbrMicroGeometrySection />

      {/* 4. Emissive */}
      <EmissiveSection />

      {/* 5-9. Advanced PBR (Clearcoat, Sheen, Transmission, Alpha, Displacement) */}
      <AdvancedPbrSection />
    </div>
  );
});

export default PbrMapsStudio;
