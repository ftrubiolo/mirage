import React from 'react';
import { Layers, Database } from 'lucide-react';
import { usePbrMaterialStore } from '../../store/pbrMaterialStore';
import { useModelStore } from '../../store/modelStore';
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
  const loadFromCache = usePbrMaterialStore((s) => s.loadFromCache);
  const setLoadFromCache = usePbrMaterialStore((s) => s.setLoadFromCache);

  const hasMultipleMaterials = Boolean(modelStats?.materials && modelStats.materials.length > 1);

  return (
    <div className="space-y-4 text-ink-primary font-body select-none">
      {/* Multi-material selector tabs (shown only when model has >= 2 materials) */}
      {hasMultipleMaterials && modelStats?.materials && (
        <div className="p-3 rounded-xs bg-surface-lowest border border-hairline shadow-xs space-y-2">
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
              return (
                <button
                  key={matName}
                  type="button"
                  onClick={() => setActiveMaterial(matName)}
                  className={`px-3 py-1.5 text-xs rounded font-mono font-medium transition-all ${
                    isActive
                      ? 'bg-action text-white shadow-xs'
                      : 'bg-surface-mid text-ink-secondary hover:text-ink-primary hover:bg-surface-highest'
                  }`}
                >
                  {matName}
                </button>
              );
            })}
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
