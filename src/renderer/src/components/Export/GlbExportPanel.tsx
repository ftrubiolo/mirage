import React, { useState } from 'react';
import { Download, FileArchive, Smartphone, Layers } from 'lucide-react';
import { exportModelToGLB, exportModelToUSDZ, viewportBridge } from '../../utils/viewportBridge';
import { createSeraPackageZip } from '../../utils/seraPackageExporter';
import { createArPackageZip, bakeVariantArtifacts } from '../../utils/arBakePipeline';
import { useVariantStore } from '../../store/variantStore';
import { Button } from '../UI/Button';
import { SegmentedControl } from '../UI/SegmentedControl';

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
  const variants = useVariantStore((s) => s.variants);
  const activeVariantId = useVariantStore((s) => s.activeVariantId);

  const [isExportingGlb, setIsExportingGlb] = useState(false);
  const [isExportingUsdz, setIsExportingUsdz] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [isExportingArZip, setIsExportingArZip] = useState(false);

  const [includeArInSeraZip, setIncludeArInSeraZip] = useState(true);
  const [arTextureSize, setArTextureSize] = useState<'1024' | '2048'>('1024');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('active');
  const [progressStatus, setProgressStatus] = useState<string | null>(null);

  const isBusy = isExportingGlb || isExportingUsdz || isExportingZip || isExportingArZip;

  const handleExportGLB = async () => {
    setIsExportingGlb(true);
    setProgressStatus('Exportando modelo GLB horneado...');
    try {
      let glbBuffer: ArrayBuffer;
      let variantSuffix = 'baked';

      if (selectedVariantId !== 'active') {
        const targetVar = variants.find((v) => v.id === selectedVariantId);
        if (!targetVar) throw new Error('Variante seleccionada no encontrada.');
        const targetObject = viewportBridge.modelGroup || viewportBridge.scene;
        if (!targetObject) throw new Error('No hay ningún modelo 3D cargado.');
        const baked = await bakeVariantArtifacts(targetObject, targetVar, {
          maxTextureSize: Number(arTextureSize) as 1024 | 2048,
          includeGlb: true,
          includeUsdz: false
        });
        if (!baked.glb) throw new Error('No se pudo generar el búfer GLB.');
        glbBuffer = baked.glb;
        variantSuffix = baked.variantCode;
      } else {
        glbBuffer = await exportModelToGLB();
      }

      const defaultName = `${productId || 'modelo'}_${variantSuffix}.glb`;
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
      let usdzBuffer: ArrayBuffer;
      let variantSuffix = 'ar';

      if (selectedVariantId !== 'active') {
        const targetVar = variants.find((v) => v.id === selectedVariantId);
        if (!targetVar) throw new Error('Variante seleccionada no encontrada.');
        const targetObject = viewportBridge.modelGroup || viewportBridge.scene;
        if (!targetObject) throw new Error('No hay ningún modelo 3D cargado.');
        const baked = await bakeVariantArtifacts(targetObject, targetVar, {
          maxTextureSize: Number(arTextureSize) as 1024 | 2048,
          includeGlb: false,
          includeUsdz: true
        });
        if (!baked.usdz) throw new Error('No se pudo generar el búfer USDZ.');
        usdzBuffer = baked.usdz;
        variantSuffix = baked.variantCode;
      } else {
        usdzBuffer = await exportModelToUSDZ({ maxTextureSize: Number(arTextureSize) as 1024 | 2048 });
      }

      const defaultName = `${productId || 'modelo'}_${variantSuffix}.usdz`;
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
        includeArVariants: includeArInSeraZip,
        arTextureSize: Number(arTextureSize) as 1024 | 2048,
        includeArGlb: true,
        includeArUsdz: true,
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

  const handleExportArZip = async () => {
    setIsExportingArZip(true);
    setProgressStatus('Iniciando exportación de Paquete AR...');
    try {
      const zipBlob = await createArPackageZip({
        productId,
        productName,
        variants,
        maxTextureSize: Number(arTextureSize) as 1024 | 2048,
        includeGlb: true,
        includeUsdz: true,
        onProgress: (p) => setProgressStatus(p.message)
      });

      const defaultName = `${productId || 'modelo'}_ar_bundle.zip`;
      const filePath = await window.electronAPI.saveFileDialog({
        title: 'Guardar Paquete AR Multi-Variante (.ZIP)',
        defaultPath: defaultName,
        filters: [{ name: 'ZIP Archive', extensions: ['zip'] }]
      });

      if (filePath) {
        const arrayBuffer = await zipBlob.arrayBuffer();
        await window.electronAPI.writeBinaryFile(filePath, arrayBuffer);
        onSuccess(`Bundle AR multi-variante .ZIP exportado con éxito en: ${filePath}`);
      }
    } catch (err: any) {
      onError(`Error al exportar paquete AR: ${err.message || err}`);
    } finally {
      setIsExportingArZip(false);
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
        Exporta el paquete oficial .ZIP bajo la plantilla de Sera Muebles para importación web directa (geometría limpia 1:1, model-3d.json, carpetas maps/ con texturas intactas), o genera modelos optimizados para Realidad Aumentada.
      </p>

      {/* AR Texture Budget Selector */}
      <div className="p-2.5 rounded-xs bg-surface-low border border-hairline space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-ink-primary flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-action" />
            Resolución Máxima para AR
          </span>
          <span className="text-[10px] text-ink-tertiary font-mono">Quick Look & Scene Viewer</span>
        </div>
        <SegmentedControl
          value={arTextureSize}
          onChange={(val) => setArTextureSize(val as '1024' | '2048')}
          options={[
            { value: '1024', label: '1024px (Móvil / Carga Rápida)', disabled: isBusy },
            { value: '2048', label: '2048px (Alta Definición)', disabled: isBusy }
          ]}
          variant="surface"
          size="sm"
        />
        <div className="text-[10px] text-ink-tertiary">
          1024px es el estándar recomendado para Apple Quick Look y Android para evitar consumo excesivo de memoria VRAM.
        </div>
      </div>

      {/* Primary Action: Sera Muebles ZIP Package */}
      <div className="p-3 rounded-xs bg-surface-container/60 border border-hairline space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-primary font-primary uppercase tracking-wider">
            Paquete Web Sera Muebles (.ZIP)
          </span>
        </div>

        <div className="space-y-1.5 pt-0.5">
          <label className="flex items-center gap-1.5 text-[11px] text-ink-secondary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeArInSeraZip}
              onChange={(e) => setIncludeArInSeraZip(e.target.checked)}
              disabled={isBusy}
              className="rounded-xs border-hairline text-action focus:ring-0 cursor-pointer"
            />
            <span>
              Incluir modelos AR horneados por variante en carpeta <code className="text-action font-mono">ar/</code> (GLB + USDZ)
            </span>
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
          Estructura: <code className="text-action font-semibold">geometry.glb</code> (limpio 1:1) + <code className="text-action font-semibold">model-3d.json</code> + <code className="text-action font-semibold">maps/</code> {includeArInSeraZip && '+ ar/ (glb/ + usdz/)'}
        </div>
      </div>

      {/* AR Multi-Variant Bundle Export */}
      <div className="p-3 rounded-xs bg-surface-container/60 border border-hairline space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-primary font-primary uppercase tracking-wider flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-action" />
            Bundle AR Multi-Variante (.ZIP)
          </span>
          <span className="text-[10px] font-mono text-ink-tertiary">
            {variants.length} {variants.length === 1 ? 'variante' : 'variantes'}
          </span>
        </div>

        <p className="text-[11px] text-ink-secondary leading-relaxed">
          Genera un archivo ZIP independiente conteniendo modelos horneados (.GLB para Android y .USDZ para iOS) para todas las variantes con texturas optimizadas a {arTextureSize}px.
        </p>

        <Button
          variant="secondary"
          size="md"
          className="w-full"
          onClick={handleExportArZip}
          disabled={isBusy}
          isLoading={isExportingArZip}
          icon={!isExportingArZip ? <Smartphone className="w-3.5 h-3.5 text-action" /> : undefined}
        >
          {isExportingArZip ? (progressStatus || 'Horneando variantes...') : `Exportar Bundle AR (${variants.length} var)`}
        </Button>
      </div>

      {/* Secondary Standalone Exports */}
      <div className="space-y-2 pt-0.5">
        <div className="flex items-center justify-between">
          <div className="text-[10px] uppercase font-mono tracking-wider text-ink-tertiary">
            Exportaciones Individuales (Standalone)
          </div>
          {variants.length > 1 && (
            <div className="flex items-center gap-1 text-[10px] text-ink-secondary">
              <Layers className="w-3 h-3 text-ink-tertiary" />
              <span>Variante:</span>
              <select
                value={selectedVariantId}
                onChange={(e) => setSelectedVariantId(e.target.value)}
                disabled={isBusy}
                className="bg-surface-lowest border border-hairline text-ink-primary text-[10px] px-1.5 py-0.5 rounded-xs focus:outline-none focus:border-action cursor-pointer"
              >
                <option value="active">Activa en Visor</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name || v.id} {v.id === activeVariantId ? '(Activa)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
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
            title="Hornea geometrías con texturas embebidas para Three.js, Scene Viewer o Blender"
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
