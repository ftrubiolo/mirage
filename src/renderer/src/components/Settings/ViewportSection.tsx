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
          3D Viewport Defaults
        </h1>
        <p className="text-xs text-ink-secondary mt-0.5">
          Configure default behavior and visual aids enabled when opening new 3D models.
        </p>
      </div>

      {/* Main Viewport Parameters */}
      <section className="space-y-3">
        <SectionHeader
          title="Visual Aids &amp; Initial Behavior"
          subtitle="Default WebGL canvas settings when importing geometry"
          icon={<Compass className="w-4 h-4" />}
          bordered={false}
        />
        <Card>
          <CardBody className="divide-y divide-hairline space-y-3 p-4">
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5">
                <span className="font-primary font-bold text-xs uppercase text-ink-primary">
                  Ground Contact Shadows
                </span>
                <InfoTooltip content="Generates soft volumetric contact shadows beneath the model base." />
              </div>
              <Switch
                checked={settings.defaultContactShadows}
                onChange={(val) => updateSettings({ defaultContactShadows: val })}
              />
            </div>

            <div className="flex items-center justify-between pt-3">
              <div className="flex items-center gap-1.5">
                <span className="font-primary font-bold text-xs uppercase text-ink-primary">
                  Metric Reference Grid
                </span>
                <InfoTooltip content="Projects a metric reference grid onto the Y=0 ground plane to verify real-world scale." />
              </div>
              <Switch
                checked={settings.defaultGroundGrid}
                onChange={(val) => updateSettings({ defaultGroundGrid: val })}
              />
            </div>

            <div className="flex items-center justify-between pt-3">
              <div className="flex items-center gap-1.5">
                <span className="font-primary font-bold text-xs uppercase text-ink-primary">
                  Smooth Auto-Rotation
                </span>
                <InfoTooltip content="Starts a gentle continuous turntable rotation when loading a model." />
              </div>
              <Switch
                checked={settings.defaultAutoRotate}
                onChange={(val) => updateSettings({ defaultAutoRotate: val })}
              />
            </div>

            <div className="flex items-center justify-between pt-3">
              <div className="flex items-center gap-1.5">
                <span className="font-primary font-bold text-xs uppercase text-ink-primary">
                  Default Snapshot Format
                </span>
                <InfoTooltip content="Default image format for rendered posters and downloaded snapshots." />
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
                    Default HDRI Environment
                  </span>
                  <InfoTooltip content="Default ambient lighting and reflection map loaded when opening models." />
                </div>
                <p className="text-[11px] text-ink-secondary">
                  Choose a built-in studio lighting preset or a locally imported HDRI.
                </p>
              </div>
              <select
                aria-label="Default HDRI Environment"
                value={environmentPreset}
                onChange={(e) => setEnvironmentPreset(e.target.value)}
                className="h-7 text-xs bg-surface-lowest border border-hairline rounded-xs px-2 text-ink-primary hover:border-action/50 focus:border-action focus:outline-none transition-colors cursor-pointer max-w-[200px]"
              >
                <optgroup label="Studio Presets">
                  <option value="city">City (Default)</option>
                  <option value="studio">Studio</option>
                  <option value="warehouse">Warehouse</option>
                  <option value="apartment">Apartment</option>
                  <option value="lobby">Lobby</option>
                  <option value="sunset">Sunset</option>
                  <option value="night">Night</option>
                  <option value="park">Park</option>
                </optgroup>
                {customHdrs.length > 0 && (
                  <optgroup label="Custom Environments">
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

      {/* Workbench Sidebar Position */}
      <section className="space-y-3">
        <SectionHeader
          title="Workbench Layout"
          subtitle="Preferred placement of inspection and editing panels"
          icon={<Layout className="w-4 h-4" />}
          bordered={false}
        />
        <Card>
          <CardBody className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="font-primary font-bold text-xs uppercase text-ink-primary">
                  Workbench Side Panel Position
                </span>
                <InfoTooltip content="Places the PBR maps, geometry, and export panel on the left or right side of the 3D viewport." />
              </div>
              <p className="text-[11px] text-ink-secondary">
                Select your preferred dock side for workbench tools.
              </p>
            </div>
            <SegmentedControl
              options={[
                { value: 'left', label: 'Left' },
                { value: 'right', label: 'Right' }
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
