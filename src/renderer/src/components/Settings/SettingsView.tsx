import React, { useEffect } from 'react';
import {
  Sun,
  Moon,
  Laptop,
  FolderOpen,
  Info
} from 'lucide-react';
import { useAppStore, ThemeMode } from '../../store/appStore';
import { Switch } from '../UI/Switch';

export const SettingsView: React.FC = () => {
  const {
    settings,
    setThemeMode,
    updateSettings,
    libraryPath,
    setLibraryPath
  } = useAppStore();

  useEffect(() => {
    if (window.electronAPI && !libraryPath) {
      window.electronAPI.getLibraryPath().then(setLibraryPath).catch(console.error);
    }
  }, [libraryPath, setLibraryPath]);

  const handleOpenFolder = () => {
    if (window.electronAPI && libraryPath) {
      window.electronAPI.openPathInExplorer(libraryPath);
    }
  };

  const themeOptions: { mode: ThemeMode; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
    {
      mode: 'dark',
      label: 'Basalto (Oscuro)',
      desc: 'Carbón volcánico y roble quemado. Ideal para talleres y baja luminosidad.',
      icon: Moon
    },
    {
      mode: 'light',
      label: 'Mineral (Claro)',
      desc: 'Piedra caliza y lino natural. Diseñado para luz diurna de estudio.',
      icon: Sun
    },
    {
      mode: 'system',
      label: 'Automático (Sistema)',
      desc: 'Se adapta a las preferencias visuales del sistema operativo.',
      icon: Laptop
    }
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-canvas text-ink-primary overflow-y-auto select-none">
      {/* Settings Header */}
      <div className="border-b border-hairline bg-surface-low px-8 py-4 shrink-0">
        <h1 className="font-primary font-bold text-lg tracking-tight uppercase text-ink-primary">
          Configuración del Atelier
        </h1>
        <p className="text-xs text-ink-secondary font-body mt-0.5">
          Parámetros del sistema operativo, almacenamiento local y preferencias del visor 3D.
        </p>
      </div>

      <div className="p-8 max-w-4xl space-y-8">
        {/* Section 1: Visual Theme */}
        <section className="space-y-3">
          <div>
            <h2 className="font-primary font-semibold text-xs uppercase tracking-wider text-ink-secondary">
              Apariencia & Cromatismo
            </h2>
            <p className="text-xs text-ink-tertiary">
              Selecciona el entorno de color del taller. Basalto está optimizado contra la fatiga visual.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = settings.themeMode === opt.mode;

              return (
                <button
                  key={opt.mode}
                  onClick={() => setThemeMode(opt.mode)}
                  className={`p-4 rounded-xs border text-left flex flex-col justify-between transition-colors ${
                    isSelected
                      ? 'bg-surface-lowest border-action ring-1 ring-action/50 shadow-xs'
                      : 'bg-surface-lowest border-hairline hover:border-hairline-strong'
                  }`}
                >
                  <div className="mb-3">
                    <div className="w-fit p-2 rounded-xs bg-surface-container border border-hairline text-action">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-primary font-bold text-xs uppercase tracking-wide text-ink-primary">
                      {opt.label}
                    </h3>
                    <p className="text-[11px] text-ink-secondary font-body mt-1 leading-relaxed">
                      {opt.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 2: Local Storage */}
        <section className="space-y-3">
          <div>
            <h2 className="font-primary font-semibold text-xs uppercase tracking-wider text-ink-secondary">
              Almacenamiento Local de la Biblioteca
            </h2>
            <p className="text-xs text-ink-tertiary">
              Ubicación física en el disco duro donde se almacenan los modelos GLB, mapas PBR y metadata.
            </p>
          </div>

          <div className="bg-surface-lowest border border-hairline rounded-xs p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-primary font-semibold uppercase tracking-wider text-ink-secondary mb-1">
                  Ruta Absoluta del Directorio
                </div>
                <div className="px-3 py-2 bg-surface-low border border-hairline rounded-xs font-mono text-xs text-ink-primary truncate select-all">
                  {libraryPath || 'Cargando ruta del sistema...'}
                </div>
              </div>

              <button
                onClick={handleOpenFolder}
                className="px-4 py-2 bg-surface-container hover:bg-surface-high text-ink-primary border border-hairline rounded-xs text-xs font-medium uppercase tracking-wider transition-colors flex items-center gap-2 shrink-0 self-start sm:self-end"
              >
                <FolderOpen className="w-4 h-4 text-action" />
                <span>Revelar en Explorador</span>
              </button>
            </div>

            <div className="p-3 bg-surface-container/30 border border-hairline rounded-xs text-xs text-ink-secondary font-body space-y-1">
              <div className="font-semibold text-ink-primary flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-action" />
                <span>Estructura de Archivos Estandarizada:</span>
              </div>
              <ul className="list-disc list-inside font-mono text-[11px] text-ink-tertiary space-y-0.5">
                <li><span className="text-ink-secondary">[slug]_model.glb</span>: Geometría optimizada</li>
                <li><span className="text-ink-secondary">[slug]_[slot].[ext]</span>: Mapas PBR (baseColor, orm, normal, etc.)</li>
                <li><span className="text-ink-secondary">[slug]_poster.webp</span>: Instantánea 3D en alta resolución</li>
                <li><span className="text-ink-secondary">entry.json</span>: Configuración, metrología y valores numéricos</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 3: 3D Viewport Defaults */}
        <section className="space-y-3">
          <div>
            <h2 className="font-primary font-semibold text-xs uppercase tracking-wider text-ink-secondary">
              Parámetros por Defecto del Visor 3D
            </h2>
            <p className="text-xs text-ink-tertiary">
              Configura los valores iniciales de visualización y exportación técnica para nuevas sesiones.
            </p>
          </div>

          <div className="bg-surface-lowest border border-hairline rounded-xs p-4 shadow-xs divide-y divide-hairline space-y-3">
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="font-primary font-bold text-xs uppercase text-ink-primary">
                  Sombras de Contacto en el Suelo
                </span>
                <p className="text-[11px] text-ink-secondary">
                  Genera una sombra volumétrica suave bajo la base de la pieza de mobiliario.
                </p>
              </div>
              <Switch
                checked={settings.defaultContactShadows}
                onChange={(val) => updateSettings({ defaultContactShadows: val })}
              />
            </div>

            <div className="flex items-center justify-between pt-3">
              <div>
                <span className="font-primary font-bold text-xs uppercase text-ink-primary">
                  Grilla Milimétrica de Referencia
                </span>
                <p className="text-[11px] text-ink-secondary">
                  Proyecta la cuadrícula métrica en el plano cero para verificar escala de fabricación.
                </p>
              </div>
              <Switch
                checked={settings.defaultGroundGrid}
                onChange={(val) => updateSettings({ defaultGroundGrid: val })}
              />
            </div>

            <div className="flex items-center justify-between pt-3">
              <div>
                <span className="font-primary font-bold text-xs uppercase text-ink-primary">
                  Rotación Automática Suave
                </span>
                <p className="text-[11px] text-ink-secondary">
                  Inicia la cámara en giro continuo suave al cargar una pieza.
                </p>
              </div>
              <Switch
                checked={settings.defaultAutoRotate}
                onChange={(val) => updateSettings({ defaultAutoRotate: val })}
              />
            </div>

            <div className="flex items-center justify-between pt-3">
              <div>
                <span className="font-primary font-bold text-xs uppercase text-ink-primary">
                  Formato de Instantáneas por Defecto
                </span>
                <p className="text-[11px] text-ink-secondary">
                  Formato para pósters y capturas técnicas descargadas.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateSettings({ defaultExportFormat: 'webp' })}
                  className={`px-2.5 py-1 text-xs font-mono font-bold rounded-xs border transition-colors ${
                    settings.defaultExportFormat === 'webp'
                      ? 'bg-action text-white border-action'
                      : 'bg-surface-low text-ink-secondary border-hairline'
                  }`}
                >
                  WebP
                </button>
                <button
                  onClick={() => updateSettings({ defaultExportFormat: 'png' })}
                  className={`px-2.5 py-1 text-xs font-mono font-bold rounded-xs border transition-colors ${
                    settings.defaultExportFormat === 'png'
                      ? 'bg-action text-white border-action'
                      : 'bg-surface-low text-ink-secondary border-hairline'
                  }`}
                >
                  PNG
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Atelier System Info */}
        <section className="pt-4 border-t border-hairline text-ink-tertiary text-xs font-body space-y-1">
          <div className="font-primary font-bold uppercase tracking-wider text-ink-secondary text-[11px]">
            Sera Atelier 3D Workbench • Versión 2.0 (Arquitectura Mirage)
          </div>
          <div>
            Motor de Render: Three.js WebGL2 PBR Pipeline • Sharp ORM Packer 0.33
          </div>
          <div>
            Diseñado para manufactura de precisión, carpintería técnica y tapicería de alto estándar.
          </div>
        </section>
      </div>
    </div>
  );
};
