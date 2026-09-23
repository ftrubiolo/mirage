import React, { useEffect } from 'react';
import { Compass, Layout } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useViewportStore } from '../../store/viewportStore';
import { Card, CardBody } from '../UI/Card';
import { Switch } from '../UI/Switch';
import { InfoTooltip } from '../UI/InfoTooltip';
import { SegmentedControl } from '../UI/SegmentedControl';
import { SectionHeader } from '../UI/SectionHeader';

export const ViewportSection: React.FC = () => {
  const {
    settings,
    updateSettings,
    workbenchSidebarPosition,
    setWorkbenchSidebarPosition
  } = useAppStore();

  const environmentPreset = useViewportStore((s) => s.environmentPreset);
  const setEnvironmentPreset = useViewportStore((s) => s.setEnvironmentPreset);
  const customHdrs = useViewportStore((s) => s.customHdrs);
  const loadCustomHdrs = useViewportStore((s) => s.loadCustomHdrs);

  useEffect(() => {
    loadCustomHdrs();
  }, [loadCustomHdrs]);

  return (
    <div className="space-y-6 animate-in fade-in duration-100">
      <div>
        <h1 className="font-primary font-bold text-base tracking-tight uppercase text-ink-primary">
          Parámetros por Defecto del Visor 3D
        </h1>
        <p className="text-xs text-ink-secondary mt-0.5">
          Define el comportamiento inicial y las ayudas visuales activadas al abrir nuevas piezas.
        </p>
      </div>

      {/* Main Viewport Parameters */}
      <section className="space-y-3">
        <SectionHeader
          title="Ayudas Visuales y Comportamiento Inicial"
          subtitle="Configuración inicial del lienzo WebGL al importar geometría"
          icon={<Compass className="w-4 h-4" />}
          bordered={false}
        />
        <Card>
          <CardBody className="divide-y divide-hairline space-y-3 p-4">
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

            <div className="flex items-center justify-between pt-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-primary font-bold text-xs uppercase text-ink-primary">
                    Entorno HDRI por Defecto
                  </span>
                  <InfoTooltip content="Iluminación ambiental y mapa de reflejos cargado de forma predeterminada al abrir piezas." />
                </div>
                <p className="text-[11px] text-ink-secondary">
                  Selecciona un preset de iluminación de taller o un HDRI local importado.
                </p>
              </div>
              <select
                aria-label="Entorno HDRI por Defecto"
                value={environmentPreset}
                onChange={(e) => setEnvironmentPreset(e.target.value)}
                className="h-7 text-xs bg-surface-lowest border border-hairline rounded-xs px-2 text-ink-primary hover:border-action/50 focus:border-action focus:outline-none transition-colors cursor-pointer max-w-[200px]"
              >
                <optgroup label="Presets de Taller">
                  <option value="city">Ciudad (Predeterminado)</option>
                  <option value="studio">Estudio</option>
                  <option value="warehouse">Almacén</option>
                  <option value="apartment">Apartamento</option>
                  <option value="lobby">Lobby</option>
                  <option value="sunset">Atardecer</option>
                  <option value="night">Noche</option>
                  <option value="park">Parque</option>
                </optgroup>
                {customHdrs.length > 0 && (
                  <optgroup label="Mis Entornos">
                    {customHdrs.map((hdr) => (
                      <option key={hdr.name} value={`custom:${hdr.name}`}>
                        {hdr.displayName || hdr.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </CardBody>
        </Card>
      </section>

      {/* Posición del Panel Lateral de Taller */}
      <section className="space-y-3">
        <SectionHeader
          title="Disposición del Taller"
          subtitle="Orientación preferida de los paneles de inspección y herramientas"
          icon={<Layout className="w-4 h-4" />}
          bordered={false}
        />
        <Card>
          <CardBody className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="font-primary font-bold text-xs uppercase text-ink-primary">
                  Posición del Panel Lateral de Taller
                </span>
                <InfoTooltip content="Ubica el panel de mapas PBR, geometría y exportación a la izquierda o derecha del visor 3D." />
              </div>
              <p className="text-[11px] text-ink-secondary">
                Selecciona la orientación de trabajo preferida para las herramientas del taller.
              </p>
            </div>
            <SegmentedControl
              options={[
                { value: 'left', label: 'Izquierda' },
                { value: 'right', label: 'Derecha' }
              ]}
              value={workbenchSidebarPosition}
              onChange={(val) => setWorkbenchSidebarPosition(val as 'left' | 'right')}
              size="sm"
            />
          </CardBody>
        </Card>
      </section>
    </div>
  );
};
