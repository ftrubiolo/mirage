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
          Almacenamiento Local de la Biblioteca
        </h1>
        <p className="text-xs text-ink-secondary mt-0.5">
          Ubicación física en el disco duro donde se guardan modelos GLB, texturas y metadatos.
        </p>
      </div>

      <section className="space-y-3">
        <SectionHeader
          title="Directorio Base de la Biblioteca"
          subtitle="Ruta estandarizada del sistema de archivos local"
          icon={<HardDrive className="w-4 h-4" />}
          bordered={false}
        />
        <Card>
          <CardBody className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-primary font-semibold uppercase tracking-wider text-ink-secondary mb-1 flex items-center gap-1.5">
                  <span>Ruta en Disco</span>
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
          </CardBody>
        </Card>
      </section>
    </div>
  );
};
