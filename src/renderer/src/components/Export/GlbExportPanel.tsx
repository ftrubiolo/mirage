import React, { useState } from 'react';
import { Download, FileArchive } from 'lucide-react';
import { captureViewportSnapshot, exportModelToGLB, createWebPackageZip } from '../../utils/viewportBridge';

export interface GlbExportPanelProps {
  productId: string;
  productName: string;
  modelStats: any;
  capturedPosterBlob: Blob | null;
  generateExportConfig: () => any;
  onError: (errorText: string) => void;
  onSuccess: (successText: string) => void;
}

export const GlbExportPanel: React.FC<GlbExportPanelProps> = ({
  productId,
  productName,
  modelStats,
  capturedPosterBlob,
  generateExportConfig,
  onError,
  onSuccess
}) => {
  const [isExportingGlb, setIsExportingGlb] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);

  const handleExportGLB = async () => {
    setIsExportingGlb(true);
    try {
      const glbBuffer = await exportModelToGLB();
      const defaultName = `${productId || 'modelo'}_baked.glb`;
      const filePath = await window.electronAPI.saveFileDialog({
        title: 'Exportar Modelo GLB Standalone',
        defaultPath: defaultName,
        filters: [{ name: 'GLB 3D Binary', extensions: ['glb'] }]
      });

      if (filePath) {
        await window.electronAPI.writeBinaryFile(filePath, glbBuffer);
        onSuccess(`Modelo .GLB exportado con éxito en: ${filePath}`);
      }
    } catch (err: any) {
      onError(`Error al exportar GLB: ${err.message || err}`);
    } finally {
      setIsExportingGlb(false);
    }
  };

  const handleExportWebZip = async () => {
    setIsExportingZip(true);
    try {
      const glbBuffer = await exportModelToGLB();

      let posterBlob = capturedPosterBlob;
      if (!posterBlob) {
        const snap = await captureViewportSnapshot({ width: 1024, height: 1024, transparent: true, format: 'webp' });
        posterBlob = snap.blob;
      }

      const metadata = {
        productId,
        productName,
        exportedAt: new Date().toISOString(),
        dimensions: modelStats?.dimensions || null,
        stats: {
          triangleCount: modelStats?.triangleCount || 0,
          vertexCount: modelStats?.vertexCount || 0,
          meshCount: modelStats?.meshCount || 0,
          materials: modelStats?.materials || []
        },
        storeConfig: generateExportConfig()
      };

      const zipBlob = await createWebPackageZip({
        glbBuffer,
        posterBlob,
        metadata
      });

      const defaultName = `${productId || 'modelo'}_web_bundle.zip`;
      const filePath = await window.electronAPI.saveFileDialog({
        title: 'Guardar Paquete Web (.ZIP)',
        defaultPath: defaultName,
        filters: [{ name: 'ZIP Archive', extensions: ['zip'] }]
      });

      if (filePath) {
        const arrayBuffer = await zipBlob.arrayBuffer();
        await window.electronAPI.writeBinaryFile(filePath, arrayBuffer);
        onSuccess(`Paquete Web .ZIP generado con éxito en: ${filePath}`);
      }
    } catch (err: any) {
      onError(`Error al crear paquete ZIP: ${err.message || err}`);
    } finally {
      setIsExportingZip(false);
    }
  };

  return (
    <div className="p-3.5 rounded-xs bg-surface-lowest border border-hairline space-y-3.5 shadow-xs">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider font-primary text-ink-primary flex items-center gap-1.5">
          <Download className="w-4 h-4 text-action" />
          Exportación de Modelo & Paquete Web
        </h4>
      </div>

      <p className="text-[11px] text-ink-secondary leading-relaxed">
        Hornea las geometrías con los mapas PBR asignados (BaseColor, ORM, Normales) en un archivo final autocontenido listo para Three.js o el catálogo de Sera.
      </p>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={handleExportGLB}
          disabled={isExportingGlb || isExportingZip}
          className="py-2.5 px-3 rounded-xs bg-surface-container hover:bg-surface-high border border-hairline text-ink-primary font-medium text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-xs uppercase tracking-wider cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-action" />
          {isExportingGlb ? 'Horneando...' : 'Hornear .GLB'}
        </button>

        <button
          onClick={handleExportWebZip}
          disabled={isExportingZip || isExportingGlb}
          className="py-2.5 px-3 rounded-xs bg-action hover:bg-action-hover text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-xs uppercase tracking-wider cursor-pointer"
        >
          <FileArchive className="w-3.5 h-3.5" />
          {isExportingZip ? 'Empaquetando...' : 'Paquete Web (.ZIP)'}
        </button>
      </div>
      <div className="text-[10px] text-ink-tertiary text-center font-mono">
        El .ZIP incluye el modelo .glb horneado, miniatura poster.webp y metadata.json
      </div>
    </div>
  );
};
