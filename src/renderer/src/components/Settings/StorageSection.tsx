import React, { useEffect } from 'react';
import { HardDrive, FolderOpen } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { Card, CardBody } from '../UI/Card';
import { Button } from '../UI/Button';
import { InfoTooltip } from '../UI/InfoTooltip';
import { SectionHeader } from '../UI/SectionHeader';

export const StorageSection: React.FC = () => {
  const { libraryPath, setLibraryPath } = useAppStore();

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

  return (
    <div className="space-y-6 animate-in fade-in duration-100">
      <div>
        <h1 className="font-primary font-bold text-base tracking-tight uppercase text-ink-primary">
          Local Library Storage
        </h1>
        <p className="text-xs text-ink-secondary mt-0.5">
          Filesystem location where GLB models, PBR textures, and metadata are stored.
        </p>
      </div>

      <section className="space-y-3">
        <SectionHeader
          title="Library Base Directory"
          subtitle="Standardized local filesystem path"
          icon={<HardDrive className="w-4 h-4" />}
          bordered={false}
        />
        <Card>
          <CardBody className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-primary font-semibold uppercase tracking-wider text-ink-secondary mb-1 flex items-center gap-1.5">
                  <span>Disk Path</span>
                  <InfoTooltip
                    content={
                      <div className="space-y-1">
                        <div className="font-semibold text-ink-primary">Standardized File Layout:</div>
                        <div className="font-mono text-[10px] space-y-0.5 text-ink-secondary">
                          <div>• [slug]_model.glb: Optimized geometry</div>
                          <div>• [slug]_[slot].[ext]: PBR maps (baseColor, orm, normal)</div>
                          <div>• [slug]_poster.webp: 3D snapshot</div>
                          <div>• entry.json: Configuration &amp; metrology</div>
                        </div>
                      </div>
                    }
                    position="top"
                    align="start"
                    size="md"
                  />
                </div>

                <div className="px-3 py-2 bg-surface-low border border-hairline rounded-xs font-mono text-xs text-ink-primary truncate select-all">
                  {libraryPath || 'Loading system path...'}
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleOpenFolder}
                icon={<FolderOpen className="w-4 h-4 text-action" />}
              >
                Reveal in Explorer
              </Button>
            </div>
          </CardBody>
        </Card>
      </section>
    </div>
  );
};
