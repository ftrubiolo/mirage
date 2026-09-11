import React, { useState, useEffect } from 'react';
import {
  Palette,
  Compass,
  Keyboard,
  HardDrive,
  Cpu,
  Info,
  Sun,
  Moon,
  Laptop,
  FolderOpen
} from 'lucide-react';
import { useAppStore, ThemeMode, FontDensity } from '../store/appStore';
import { Switch } from '../components/UI/Switch';
import { InfoTooltip } from '../components/UI/InfoTooltip';
import { Button } from '../components/UI/Button';
import { SegmentedControl } from '../components/UI/SegmentedControl';
import { AiProvidersSection } from '../components/Settings/AiProvidersSection';
import { KeybindsSection } from '../components/Settings/KeybindsSection';

type SettingsTab = 'appearance' | 'viewport' | 'keybinds' | 'storage' | 'ai' | 'system';

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');

  const {
    settings,
    setThemeMode,
    setFontDensity,
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

  const densityOptions: { id: FontDensity; label: string; desc: string }[] = [
    { id: 'standard', label: 'Estándar', desc: 'Espaciado amplio para pantallas de alta resolución' },
    { id: 'compact', label: 'Compacto', desc: 'Mayor densidad de datos y controles optimizados' },
    { id: 'dense', label: 'Denso', desc: 'Máxima compresión de métricas e inspección técnica' }
  ];

  const navItems: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'appearance', label: 'Apariencia & Tema', icon: Palette },
    { id: 'viewport', label: 'Visor 3D & Parámetros', icon: Compass },
    { id: 'keybinds', label: 'Atajos de Teclado', icon: Keyboard },
    { id: 'storage', label: 'Almacenamiento Local', icon: HardDrive },
    { id: 'ai', label: 'Modelos IA & Agentes', icon: Cpu },
    { id: 'system', label: 'Información del Sistema', icon: Info }
  ];

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-canvas text-ink-primary select-none font-body">
      {/* Navigation Sidebar */}
      <aside className="w-64 border-r border-hairline bg-surface-low/50 flex flex-col p-4 shrink-0 overflow-y-auto space-y-1">
        <div className="px-3 py-2 mb-2">
          <h2 className="font-primary font-bold text-xs uppercase tracking-wider text-ink-primary">
            Configuración
          </h2>
          <p className="text-[11px] text-ink-tertiary">
            Mirage Atelier 3D Workbench
          </p>
        </div>

        <nav className="space-y-0.5 flex-1">
          {navItems.map((item) => {
            const isSelected = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full px-3 py-2.5 rounded-xs text-xs font-medium flex items-center gap-2.5 transition-colors text-left cursor-pointer ${
                  isSelected
                    ? 'bg-surface-container text-action font-semibold border-l-2 border-action shadow-xs'
                    : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-container/50 border-l-2 border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-action' : 'text-ink-tertiary'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-hairline px-3 text-[11px] text-ink-tertiary font-mono">
          Mirage v1.0.0
        </div>
      </aside>

      {/* Main Settings Content Area */}
      <main className="flex-1 overflow-y-auto p-8 min-w-0">
        <div className="max-w-4xl space-y-8">
          {/* TAB 1: Appearance */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 animate-in fade-in duration-100">
              <div>
                <h1 className="font-primary font-bold text-base tracking-tight uppercase text-ink-primary">
                  Apariencia & Cromatismo
                </h1>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Personaliza el entorno cromático de trabajo y la densidad de información en pantalla.
                </p>
              </div>

              {/* Theme Palette */}
              <section className="space-y-3">
                <h2 className="font-primary font-semibold text-xs uppercase tracking-wider text-ink-secondary">
                  Tema Visual
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {themeOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = settings.themeMode === opt.mode;

                    return (
                      <button
                        key={opt.mode}
                        onClick={() => setThemeMode(opt.mode)}
                        className={`p-4 rounded-xs border text-left flex flex-col justify-between transition-colors cursor-pointer ${
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
                          <p className="text-[11px] text-ink-secondary mt-1 leading-relaxed">
                            {opt.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Font Density */}
              <section className="space-y-3 pt-4 border-t border-hairline">
                <h2 className="font-primary font-semibold text-xs uppercase tracking-wider text-ink-secondary">
                  Densidad de Interfaz
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {densityOptions.map((opt) => {
                    const isSelected = settings.fontDensity === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setFontDensity(opt.id)}
                        className={`p-3.5 rounded-xs border text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-surface-lowest border-action ring-1 ring-action/50 shadow-xs'
                            : 'bg-surface-lowest border-hairline hover:border-hairline-strong'
                        }`}
                      >
                        <h3 className="font-primary font-bold text-xs uppercase text-ink-primary">
                          {opt.label}
                        </h3>
                        <p className="text-[11px] text-ink-secondary mt-1">
                          {opt.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: Viewport Defaults */}
          {activeTab === 'viewport' && (
            <div className="space-y-6 animate-in fade-in duration-100">
              <div>
                <h1 className="font-primary font-bold text-base tracking-tight uppercase text-ink-primary">
                  Parámetros por Defecto del Visor 3D
                </h1>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Define el comportamiento inicial y las ayudas visuales activadas al abrir nuevas piezas.
                </p>
              </div>

              <div className="bg-surface-lowest border border-hairline rounded-xs p-4 shadow-xs divide-y divide-hairline space-y-3">
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-primary font-bold text-xs uppercase text-ink-primary">
                      Sombras de Contacto en el Suelo
                    </span>
                    <InfoTooltip content="Genera sombra volumétrica suave bajo la base del mobiliario." />
                  </div>
                  <Switch
                    checked={settings.defaultContactShadows}
                    onChange={(val) => updateSettings({ defaultContactShadows: val })}
                  />
                </div>

                <div className="flex items-center justify-between pt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-primary font-bold text-xs uppercase text-ink-primary">
                      Grilla Milimétrica de Referencia
                    </span>
                    <InfoTooltip content="Proyecta la cuadrícula métrica en el plano cero para verificar escala de fabricación." />
                  </div>
                  <Switch
                    checked={settings.defaultGroundGrid}
                    onChange={(val) => updateSettings({ defaultGroundGrid: val })}
                  />
                </div>

                <div className="flex items-center justify-between pt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-primary font-bold text-xs uppercase text-ink-primary">
                      Rotación Automática Suave
                    </span>
                    <InfoTooltip content="Inicia la cámara en giro continuo suave al cargar una pieza." />
                  </div>
                  <Switch
                    checked={settings.defaultAutoRotate}
                    onChange={(val) => updateSettings({ defaultAutoRotate: val })}
                  />
                </div>

                <div className="flex items-center justify-between pt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-primary font-bold text-xs uppercase text-ink-primary">
                      Formato de Instantáneas por Defecto
                    </span>
                    <InfoTooltip content="Formato predeterminado para pósters y capturas descargadas." />
                  </div>
                  <SegmentedControl
                    options={[
                      { value: 'webp', label: 'WebP' },
                      { value: 'png', label: 'PNG' }
                    ]}
                    value={settings.defaultExportFormat}
                    onChange={(val) => updateSettings({ defaultExportFormat: val as any })}
                    size="xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Keybinds Section */}
          {activeTab === 'keybinds' && (
            <div className="animate-in fade-in duration-100">
              <KeybindsSection />
            </div>
          )}

          {/* TAB 4: Storage */}
          {activeTab === 'storage' && (
            <div className="space-y-6 animate-in fade-in duration-100">
              <div>
                <h1 className="font-primary font-bold text-base tracking-tight uppercase text-ink-primary">
                  Almacenamiento Local de la Biblioteca
                </h1>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Ubicación física en el disco duro donde se guardan modelos GLB, texturas y metadatos.
                </p>
              </div>

              <div className="bg-surface-lowest border border-hairline rounded-xs p-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-primary font-semibold uppercase tracking-wider text-ink-secondary mb-1 flex items-center gap-1.5">
                      <span>Directorio Base de la Biblioteca</span>
                      <InfoTooltip
                        content={
                          <div className="space-y-1">
                            <div className="font-semibold text-ink-primary">Estructura de Archivos Estandarizada:</div>
                            <div className="font-mono text-[10px] space-y-0.5 text-ink-secondary">
                              <div>• [slug]_model.glb: Geometría optimizada</div>
                              <div>• [slug]_[slot].[ext]: Mapas PBR (baseColor, orm, normal)</div>
                              <div>• [slug]_poster.webp: Instantánea 3D</div>
                              <div>• entry.json: Configuración y metrología</div>
                            </div>
                          </div>
                        }
                        position="top"
                        align="start"
                        size="md"
                      />
                    </div>
                    <div className="px-3 py-2 bg-surface-low border border-hairline rounded-xs font-mono text-xs text-ink-primary truncate select-all">
                      {libraryPath || 'Cargando ruta del sistema...'}
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleOpenFolder}
                    icon={<FolderOpen className="w-4 h-4 text-action" />}
                  >
                    Revelar en Explorador
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: AI Providers */}
          {activeTab === 'ai' && (
            <div className="animate-in fade-in duration-100">
              <AiProvidersSection />
            </div>
          )}

          {/* TAB 6: System Info */}
          {activeTab === 'system' && (
            <div className="space-y-6 animate-in fade-in duration-100">
              <div>
                <h1 className="font-primary font-bold text-base tracking-tight uppercase text-ink-primary">
                  Información del Sistema
                </h1>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Detalles del motor de renderizado, entorno de ejecución y metrología.
                </p>
              </div>

              <div className="bg-surface-lowest border border-hairline rounded-xs p-5 shadow-xs space-y-4">
                <div className="space-y-1 border-b border-hairline pb-4">
                  <div className="font-primary font-bold uppercase tracking-wider text-ink-primary text-sm">
                    Mirage Atelier 3D Workbench
                  </div>
                  <div className="text-xs text-ink-secondary font-mono">
                    Versión 1.0.0 • Build de Producción
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-primary font-semibold text-ink-secondary uppercase text-[10px] block">
                      Pipeline Gráfico 3D
                    </span>
                    <span className="font-mono text-ink-primary">
                      Three.js r184 • WebGL2 • React Three Fiber
                    </span>
                  </div>

                  <div>
                    <span className="font-primary font-semibold text-ink-secondary uppercase text-[10px] block">
                      Procesamiento de Texturas
                    </span>
                    <span className="font-mono text-ink-primary">
                      Sharp ORM Packer 0.33 • Canvas 2D Fallback
                    </span>
                  </div>

                  <div>
                    <span className="font-primary font-semibold text-ink-secondary uppercase text-[10px] block">
                      Entorno de Ejecución
                    </span>
                    <span className="font-mono text-ink-primary">
                      Electron 34 • Node 22 • Chromium 132
                    </span>
                  </div>

                  <div>
                    <span className="font-primary font-semibold text-ink-secondary uppercase text-[10px] block">
                      Directorio de Datos
                    </span>
                    <span className="font-mono text-ink-primary truncate block" title={libraryPath}>
                      ~/.local/share/mirage/
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-hairline text-xs text-ink-tertiary">
                  Diseñado para manufactura de mobiliario de alta gama, verificación dimensional y calibración de acabados PBR.
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
