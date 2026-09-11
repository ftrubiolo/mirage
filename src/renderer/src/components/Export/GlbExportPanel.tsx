import React, { useState } from 'react';
import { Download, FileArchive, Smartphone } from 'lucide-react';
import { exportModelToGLB, exportModelToUSDZ } from '../../utils/viewportBridge';
import { createSeraPackageZip } from '../../utils/seraPackageExporter';
import { Button } from '../UI/Button';

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
  onError,
  onSuccess
}) => {
  const [isExportingGlb, setIsExportingGlb] = useState(false);
  const [isExportingUsdz, setIsExportingUsdz] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [includeUsdz, setIncludeUsdz] = useState(true);
  const [progressStatus, setProgressStatus] = useState<string | null>(null);

  const isBusy = isExportingGlb || isExportingUsdz || isExportingZip;

  const handleExportGLB = async () => {
    setIsExportingGlb(true);
    setProgressStatus('Exportando modelo GLB horneado...');
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
      setProgressStatus(null);
    }
  };

  const handleExportUSDZ = async () => {
    setIsExportingUsdz(true);
    setProgressStatus('Generando modelo para Realidad Aumentada Apple (USDZ)...');
    try {
      const usdzBuffer = await exportModelToUSDZ();
      const defaultName = `${productId || 'modelo'}.usdz`;
      const filePath = await window.electronAPI.saveFileDialog({
        title: 'Exportar Modelo USDZ para Apple AR Quick Look',
        defaultPath: defaultName,
        filters: [{ name: 'Universal Scene Description (USDZ)', extensions: ['usdz'] }]
      });

      if (filePath) {
        await window.electronAPI.writeBinaryFile(filePath, usdzBuffer);
        onSuccess(`Modelo .USDZ exportado con éxito en: ${filePath}`);
      }
    } catch (err: any) {
      onError(`Error al exportar USDZ: ${err.message || err}`);
    } finally {
      setIsExportingUsdz(false);
      setProgressStatus(null);
    }
  };

  const handleExportSeraZip = async () => {
    setIsExportingZip(true);
    setProgressStatus('Iniciando empaquetado Sera Muebles...');
    try {
      const zipBlob = await createSeraPackageZip({
        productId,
        productName,
        includeUsdz,
        onProgress: (status) => setProgressStatus(status)
      });

      const defaultName = `${productId || 'modelo'}_paquete_sera.zip`;
      const filePath = await window.electronAPI.saveFileDialog({
        title: 'Guardar Paquete Sera Muebles (.ZIP)',
        defaultPath: defaultName,
        filters: [{ name: 'ZIP Archive', extensions: ['zip'] }]
      });

      if (filePath) {
        const arrayBuffer = await zipBlob.arrayBuffer();
        await window.electronAPI.writeBinaryFile(filePath, arrayBuffer);
        onSuccess(`Paquete Sera Muebles .ZIP generado con éxito en: ${filePath}`);
      }
    } catch (err: any) {
      onError(`Error al crear paquete ZIP: ${err.message || err}`);
    } finally {
      setIsExportingZip(false);
      setProgressStatus(null);
    }
  };

  return (
    <div className="p-3.5 rounded-xs bg-surface-lowest border border-hairline space-y-3.5 shadow-xs">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider font-primary text-ink-primary flex items-center gap-1.5">
          <FileArchive className="w-4 h-4 text-action" />
          Exportación de Paquete Sera & Modelos 3D
        </h4>
      </div>

      <p className="text-[11px] text-ink-secondary leading-relaxed">
        Exporta el paquete oficial .ZIP bajo la plantilla de Sera Muebles para importación web directa (geometría limpia 1:1, model-3d.json, carpetas maps/ con texturas intactas), o exporta archivos standalone.
      </p>

      {/* Primary Action: Sera Muebles ZIP Package */}
      <div className="p-3 rounded-xs bg-surface-container/60 border border-hairline space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-primary font-primary uppercase tracking-wider">
            Paquete Web Sera Muebles (.ZIP)
          </span>
          <label className="flex items-center gap-1.5 text-[11px] text-ink-secondary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeUsdz}
              onChange={(e) => setIncludeUsdz(e.target.checked)}
              disabled={isBusy}
              className="rounded-xs border-hairline text-action focus:ring-0 cursor-pointer"
            />
            <span>Incluir .usdz (Apple AR)</span>
          </label>
        </div>

        <Button
          variant="primary"
          size="md"
          className="w-full"
          onClick={handleExportSeraZip}
          disabled={isBusy}
          isLoading={isExportingZip}
          icon={!isExportingZip ? <FileArchive className="w-3.5 h-3.5" /> : undefined}
        >
          {isExportingZip ? (progressStatus || 'Empaquetando...') : 'Exportar Paquete Sera (.ZIP)'}
        </Button>

        <div className="text-[10px] text-ink-tertiary font-mono leading-normal">
          Estructura: <code className="text-action font-semibold">geometry.glb</code> (limpio 1:1) + <code className="text-action font-semibold">model-3d.json</code> + <code className="text-action font-semibold">maps/</code> (fidelidad intacta) {includeUsdz && '+ model.usdz'}
        </div>
      </div>

      {/* Secondary Standalone Exports */}
      <div className="space-y-1.5 pt-0.5">
        <div className="text-[10px] uppercase font-mono tracking-wider text-ink-tertiary">
          Exportaciones Individuales (Standalone)
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={handleExportGLB}
            disabled={isBusy}
            isLoading={isExportingGlb}
            icon={!isExportingGlb ? <Download className="w-3.5 h-3.5 text-action" /> : undefined}
            title="Hornea geometrías con texturas embebidas para Three.js o Blender"
          >
            {isExportingGlb ? 'Horneando...' : 'Hornear .GLB'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={handleExportUSDZ}
            disabled={isBusy}
            isLoading={isExportingUsdz}
            icon={!isExportingUsdz ? <Smartphone className="w-3.5 h-3.5 text-action" /> : undefined}
            title="Modelo para Realidad Aumentada en iPhone / iPad (Apple Quick Look)"
          >
            {isExportingUsdz ? 'Generando...' : 'Exportar .USDZ'}
          </Button>
        </div>
      </div>
    </div>
  );
};
