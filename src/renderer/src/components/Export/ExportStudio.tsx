import React, { useState } from 'react';
import {
  Camera,
  Download,
  PackageCheck,
  Package,
  Sliders,
  CheckCircle2,
  AlertCircle,
  FileArchive,
  Image as ImageIcon,
  ArrowRightLeft,
  Wrench
} from 'lucide-react';
import { useWorkbenchStore } from '../../store/workbenchStore';
import { captureViewportSnapshot, exportModelToGLB, createWebPackageZip } from '../../utils/viewportBridge';
import { PerformanceAudit } from '../Audit/PerformanceAudit';
import { Checkbox } from '../UI/Checkbox';
import {
  convertImageToWebpCanvas,
  flipNormalMapCanvas,
  invertRoughnessCanvas
} from '../../utils/canvasTextureProcessor';

export const ExportStudio: React.FC = () => {
  const {
    modelStats,
    normalMap,
    roughnessMap,
    baseColorMap,
    setMapSlot,
    openOrmPacker,
    productId,
    productName,
    generateExportConfig
  } = useWorkbenchStore();

  // Poster generator state
  const [posterRes, setPosterRes] = useState<'1024' | '512' | '1080'>('1024');
  const [transparentBg, setTransparentBg] = useState(true);
  const [posterFormat, setPosterFormat] = useState<'webp' | 'png'>('webp');
  const [capturedPosterUrl, setCapturedPosterUrl] = useState<string | null>(null);
  const [capturedPosterBlob, setCapturedPosterBlob] = useState<Blob | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // GLB / ZIP export state
  const [isExportingGlb, setIsExportingGlb] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Texture utilities state
  const [normalInputPath, setNormalInputPath] = useState<string>(normalMap.filePath || '');
  const [isProcessingNormal, setIsProcessingNormal] = useState(false);

  const [roughnessInputPath, setRoughnessInputPath] = useState<string>(roughnessMap.filePath || '');
  const [isProcessingRoughness, setIsProcessingRoughness] = useState(false);

  const [resizerInputPath, setResizerInputPath] = useState<string>(baseColorMap.filePath || '');
  const [targetRes, setTargetRes] = useState<number>(2048);
  const [targetQuality, setTargetQuality] = useState<number>(85);
  const [isProcessingResize, setIsProcessingResize] = useState(false);

  const [textureMsg, setTextureMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // --- Handlers ---

  const handleCapturePoster = async () => {
    setIsCapturing(true);
    setExportMessage(null);
    try {
      const dim = posterRes === '1080' ? { width: 1920, height: 1080 } : { width: Number(posterRes), height: Number(posterRes) };
      const { blob, dataUrl } = await captureViewportSnapshot({
        width: dim.width,
        height: dim.height,
        transparent: transparentBg,
        format: posterFormat,
        quality: 0.92
      });
      setCapturedPosterUrl(dataUrl);
      setCapturedPosterBlob(blob);
    } catch (err: any) {
      setExportMessage({ type: 'error', text: `Error al capturar poster: ${err.message || err}` });
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSavePoster = async () => {
    if (!capturedPosterBlob) return;
    const ext = posterFormat;
    const defaultName = `${productId || 'modelo'}_poster.${ext}`;
    const filePath = await window.electronAPI.saveFileDialog({
      title: 'Guardar Poster / Miniatura',
      defaultPath: defaultName,
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }]
    });

    if (filePath) {
      const arrayBuffer = await capturedPosterBlob.arrayBuffer();
      await window.electronAPI.writeBinaryFile(filePath, arrayBuffer);
      setExportMessage({ type: 'success', text: `Poster guardado en: ${filePath}` });
    }
  };

  const handleExportGLB = async () => {
    setIsExportingGlb(true);
    setExportMessage(null);
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
        setExportMessage({ type: 'success', text: `Modelo .GLB exportado con éxito en: ${filePath}` });
      }
    } catch (err: any) {
      setExportMessage({ type: 'error', text: `Error al exportar GLB: ${err.message || err}` });
    } finally {
      setIsExportingGlb(false);
    }
  };

  const handleExportWebZip = async () => {
    setIsExportingZip(true);
    setExportMessage(null);
    try {
      // 1. Bake GLB
      const glbBuffer = await exportModelToGLB();

      // 2. Generate poster blob (1024x1024 transparent webp)
      let posterBlob = capturedPosterBlob;
      if (!posterBlob) {
        const snap = await captureViewportSnapshot({ width: 1024, height: 1024, transparent: true, format: 'webp' });
        posterBlob = snap.blob;
      }

      // 3. Metadata
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

      // 4. Create ZIP
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
        setExportMessage({ type: 'success', text: `Paquete Web .ZIP generado con éxito en: ${filePath}` });
      }
    } catch (err: any) {
      setExportMessage({ type: 'error', text: `Error al crear paquete ZIP: ${err.message || err}` });
    } finally {
      setIsExportingZip(false);
    }
  };

  // Normal Y Flip
  const handleFlipNormal = async () => {
    const file = normalInputPath || normalMap.filePath;
    if (!file) {
      setTextureMsg({ type: 'error', text: 'Selecciona una textura de mapa de normales.' });
      return;
    }
    setIsProcessingNormal(true);
    setTextureMsg(null);
    try {
      const outputPath = file.replace(/\.[^/.]+$/, '') + '_flippedY.webp';
      const sourceUrl = window.electronAPI.toAssetUrl(file);

      try {
        await flipNormalMapCanvas(sourceUrl, outputPath, 95);
      } catch (canvasErr) {
        console.warn('Canvas flipNormal fallback to Sharp worker:', canvasErr);
        await window.electronAPI.processTexture({
          task: 'flipNormal',
          inputPath: file,
          outputPath,
          resolution: 2048,
          quality: 95
        });
      }

      setTextureMsg({ type: 'success', text: `Normal Y invertida guardada en: ${outputPath}` });
      const info = await window.electronAPI.getFileInfo(outputPath);
      setMapSlot('normal', {
        filePath: outputPath,
        url: `${window.electronAPI.toAssetUrl(outputPath)}?t=${Date.now()}`,
        fileName: info.name,
        fileSize: info.size
      });
    } catch (err: any) {
      setTextureMsg({ type: 'error', text: `Error al procesar normal: ${err.message || err}` });
    } finally {
      setIsProcessingNormal(false);
    }
  };

  // Invert Roughness
  const handleInvertRoughness = async () => {
    const file = roughnessInputPath || roughnessMap.filePath;
    if (!file) {
      setTextureMsg({ type: 'error', text: 'Selecciona una textura de rugosidad / gloss.' });
      return;
    }
    setIsProcessingRoughness(true);
    setTextureMsg(null);
    try {
      const outputPath = file.replace(/\.[^/.]+$/, '') + '_inverted.webp';
      const sourceUrl = window.electronAPI.toAssetUrl(file);

      try {
        await invertRoughnessCanvas(sourceUrl, outputPath, 90);
      } catch (canvasErr) {
        console.warn('Canvas invertRoughness fallback to Sharp worker:', canvasErr);
        await window.electronAPI.processTexture({
          task: 'invertRoughness',
          inputPath: file,
          outputPath,
          resolution: 2048,
          quality: 90
        });
      }

      setTextureMsg({ type: 'success', text: `Rugosidad invertida guardada en: ${outputPath}` });
      const info = await window.electronAPI.getFileInfo(outputPath);
      setMapSlot('roughness', {
        filePath: outputPath,
        url: `${window.electronAPI.toAssetUrl(outputPath)}?t=${Date.now()}`,
        fileName: info.name,
        fileSize: info.size
      });
    } catch (err: any) {
      setTextureMsg({ type: 'error', text: `Error al invertir rugosidad: ${err.message || err}` });
    } finally {
      setIsProcessingRoughness(false);
    }
  };

  // Resize & WebP Convert
  const handleResizeConvert = async () => {
    const file = resizerInputPath || baseColorMap.filePath;
    if (!file) {
      setTextureMsg({ type: 'error', text: 'Selecciona una textura para optimizar.' });
      return;
    }
    setIsProcessingResize(true);
    setTextureMsg(null);
    try {
      const outputPath = file.replace(/\.[^/.]+$/, '') + `_${targetRes}px.webp`;
      const sourceUrl = window.electronAPI.toAssetUrl(file);

      try {
        await convertImageToWebpCanvas(sourceUrl, outputPath, targetQuality, targetRes);
      } catch (canvasErr) {
        console.warn('Canvas convertResize fallback to Sharp worker:', canvasErr);
        await window.electronAPI.processTexture({
          task: 'convertResize',
          inputPath: file,
          outputPath,
          resolution: targetRes,
          quality: targetQuality
        });
      }

      setTextureMsg({ type: 'success', text: `Textura optimizada a WebP guardada en: ${outputPath}` });
    } catch (err: any) {
      setTextureMsg({ type: 'error', text: `Error al optimizar textura: ${err.message || err}` });
    } finally {
      setIsProcessingResize(false);
    }
  };

  return (
    <div className="space-y-4 font-body select-none pb-8 text-ink-primary">
      {/* Tab Header Banner */}
      <div className="p-3.5 rounded-xs bg-surface-lowest border border-hairline flex items-center justify-between shadow-xs">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider font-primary text-ink-primary flex items-center gap-1.5">
            <PackageCheck className="w-4 h-4 text-action" />
            Centro de Exportación & Entrega
          </h3>
          <p className="text-[11px] text-ink-secondary mt-0.5">
            Optimiza, hornea geometrías y genera paquetes para catalogación o render web.
          </p>
        </div>
      </div>

      {/* Global Status Message */}
      {exportMessage && (
        <div
          className={`p-3 rounded-xs text-xs flex items-center gap-2 border ${
            exportMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/30'
              : 'bg-rose-50 text-rose-800 border-rose-300/60 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-500/30'
          }`}
        >
          {exportMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
          )}
          <span className="truncate font-mono tabular-nums">{exportMessage.text}</span>
        </div>
      )}

      {/* PANEL 1: Poster & Snapshot Generator */}
      <div className="p-3.5 rounded-xs bg-surface-lowest border border-hairline space-y-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider font-primary text-ink-primary flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-action" />
            Generador de Posters y Miniaturas
          </h4>
          <span className="text-[10px] font-mono tabular-nums text-ink-tertiary">model-viewer poster</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Resolution Presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-ink-secondary font-primary font-semibold uppercase tracking-wider block">
              Resolución
            </span>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: '1024', label: '1024²' },
                { id: '512', label: '512²' },
                { id: '1080', label: '1080p' }
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => setPosterRes(r.id as any)}
                  className={`py-1 rounded-xs text-[11px] font-mono tabular-nums font-medium border transition-colors ${
                    posterRes === r.id
                      ? 'bg-action text-white border-action font-semibold shadow-xs'
                      : 'bg-surface-low border-hairline text-ink-secondary hover:text-ink-primary hover:bg-surface-container'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Format Selection */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-ink-secondary font-primary font-semibold uppercase tracking-wider block">
              Formato
            </span>
            <div className="grid grid-cols-2 gap-1">
              {(['webp', 'png'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setPosterFormat(f)}
                  className={`py-1 rounded-xs text-[11px] font-medium border uppercase transition-colors ${
                    posterFormat === f
                      ? 'bg-action text-white border-action font-semibold shadow-xs'
                      : 'bg-surface-low border-hairline text-ink-secondary hover:text-ink-primary hover:bg-surface-container'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Options Row */}
        <div className="flex items-center justify-between pt-1">
          <Checkbox
            checked={transparentBg}
            onChange={setTransparentBg}
            label={<span className="text-xs text-ink-secondary">Fondo Transparente (Canal Alpha)</span>}
          />
        </div>

        {/* Action Buttons & Preview */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleCapturePoster}
            disabled={isCapturing}
            className="flex-1 py-2 px-3 rounded-xs bg-surface-container hover:bg-surface-high text-ink-primary font-medium text-xs flex items-center justify-center gap-1.5 border border-hairline transition-colors disabled:opacity-50 shadow-xs uppercase tracking-wider"
          >
            <Camera className="w-3.5 h-3.5 text-action" />
            {isCapturing ? 'Capturando...' : 'Capturar Vista Actual'}
          </button>

          {capturedPosterUrl && (
            <button
              onClick={handleSavePoster}
              className="py-2 px-3 rounded-xs bg-action hover:bg-action-hover text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs uppercase tracking-wider"
            >
              <Download className="w-3.5 h-3.5" />
              Guardar {posterFormat.toUpperCase()}
            </button>
          )}
        </div>

        {/* Thumbnail Preview */}
        {capturedPosterUrl && (
          <div className="flex items-center gap-3 pt-2 border-t border-hairline">
            <div className="w-14 h-14 rounded-xs bg-surface-low border border-hairline flex items-center justify-center overflow-hidden shrink-0">
              <img src={capturedPosterUrl} alt="Poster preview" className="max-w-full max-h-full object-contain" />
            </div>
            <div className="text-[11px] text-ink-secondary space-y-0.5">
              <span className="font-semibold text-ink-primary block">Miniatura lista</span>
              <span className="font-mono tabular-nums">
                {posterRes === '1080' ? '1920×1080' : `${posterRes}×${posterRes}px`} • {posterFormat.toUpperCase()}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-mono">
                {transparentBg ? 'Fondo transparente' : 'Fondo de escena'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* PANEL 2: Standalone GLB & ZIP Web Bundle */}
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
            className="py-2.5 px-3 rounded-xs bg-surface-container hover:bg-surface-high border border-hairline text-ink-primary font-medium text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-xs uppercase tracking-wider"
          >
            <Download className="w-3.5 h-3.5 text-action" />
            {isExportingGlb ? 'Horneando...' : 'Hornear .GLB'}
          </button>

          <button
            onClick={handleExportWebZip}
            disabled={isExportingZip || isExportingGlb}
            className="py-2.5 px-3 rounded-xs bg-action hover:bg-action-hover text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-xs uppercase tracking-wider"
          >
            <FileArchive className="w-3.5 h-3.5" />
            {isExportingZip ? 'Empaquetando...' : 'Paquete Web (.ZIP)'}
          </button>
        </div>
        <div className="text-[10px] text-ink-tertiary text-center font-mono">
          El .ZIP incluye el modelo .glb horneado, miniatura poster.webp y metadata.json
        </div>
      </div>

      {/* PANEL 3: Texture Processing Utilities (Sharp) */}
      <div className="rounded-xs bg-surface-lowest border border-hairline overflow-hidden divide-y divide-hairline shadow-xs">
        {/* Section Header */}
        <div className="p-3 flex items-center justify-between bg-surface-low">
          <h4 className="text-xs font-semibold uppercase tracking-wider font-primary text-ink-primary flex items-center gap-1.5">
            <Wrench className="w-4 h-4 text-action" />
            Pipeline de Texturas (Sharp)
          </h4>
          <span className="text-[10px] font-mono tabular-nums text-ink-tertiary">Procesamiento PBR</span>
        </div>

        {/* Texture message */}
        {textureMsg && (
          <div
            className={`px-3.5 py-2 text-[11px] flex items-center gap-2 ${
              textureMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
            }`}
          >
            {textureMsg.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span className="truncate font-mono tabular-nums">{textureMsg.text}</span>
          </div>
        )}

        {/* Tool 1: Empaquetar ORM WebP */}
        <div className="p-3.5 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-ink-primary flex items-center gap-1.5 font-primary">
              <Package className="w-3.5 h-3.5 text-action" />
              Empaquetar Textura ORM WebP
            </span>
            <span className="text-[10px] text-ink-secondary block">
              Combina AO (R) + Rugosidad (G) + Metálico (B) en un solo mapa WebP ultraligero.
            </span>
          </div>
          <button
            onClick={openOrmPacker}
            className="px-3 py-1.5 rounded-xs bg-action/10 hover:bg-action/20 text-action border border-action/30 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors uppercase tracking-wider"
          >
            <Package className="w-3 h-3" />
            Empaquetador ORM
          </button>
        </div>

        {/* Tool 2: Invert Normal Y */}
        <div className="p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-primary flex items-center gap-1.5 font-primary">
              <ArrowRightLeft className="w-3.5 h-3.5 text-action" />
              Invertir Normal Y (DirectX ↔ OpenGL)
            </span>
            <span className="text-[10px] text-ink-tertiary font-mono">Canal Verde (Y)</span>
          </div>
          <p className="text-[10px] text-ink-secondary">
            Invierte el canal verde para corregir mapas de relieve invertidos.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={normalInputPath}
              onChange={(e) => setNormalInputPath(e.target.value)}
              placeholder="Ruta del Normal Map..."
              className="flex-1 h-8 bg-surface-low border border-hairline-strong rounded-xs px-2.5 text-xs font-mono tabular-nums text-ink-primary placeholder:text-ink-tertiary leading-8 focus:outline-none focus:border-action"
            />
            <button
              onClick={async () => {
                const path = await window.electronAPI.openFileDialog({
                  title: 'Seleccionar Mapa de Normales',
                  filters: [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'webp', 'tga'] }]
                });
                if (path) setNormalInputPath(path);
              }}
              className="h-8 px-2.5 bg-surface-container hover:bg-surface-high border border-hairline rounded-xs text-[11px] text-ink-primary font-medium transition-colors flex items-center justify-center shrink-0 uppercase tracking-wider"
            >
              Examinar
            </button>
            <button
              onClick={handleFlipNormal}
              disabled={isProcessingNormal}
              className="h-8 px-3 bg-action hover:bg-action-hover text-white font-semibold rounded-xs text-[11px] transition-colors disabled:opacity-50 flex items-center justify-center shrink-0 uppercase tracking-wider shadow-xs"
            >
              {isProcessingNormal ? 'Procesando...' : 'Invertir Y'}
            </button>
          </div>
        </div>

        {/* Tool 3: Invert Roughness */}
        <div className="p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-primary flex items-center gap-1.5 font-primary">
              <Sliders className="w-3.5 h-3.5 text-action" />
              Invertir Rugosidad (Roughness ↔ Glossiness)
            </span>
            <span className="text-[10px] text-ink-tertiary font-mono">1.0 - Valor</span>
          </div>
          <p className="text-[10px] text-ink-secondary">
            Invierte la escala de grises para convertir entre aspereza y brillo superficial.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={roughnessInputPath}
              onChange={(e) => setRoughnessInputPath(e.target.value)}
              placeholder="Ruta del mapa de rugosidad..."
              className="flex-1 h-8 bg-surface-low border border-hairline-strong rounded-xs px-2.5 text-xs font-mono tabular-nums text-ink-primary placeholder:text-ink-tertiary leading-8 focus:outline-none focus:border-action"
            />
            <button
              onClick={async () => {
                const path = await window.electronAPI.openFileDialog({
                  title: 'Seleccionar Textura de Rugosidad',
                  filters: [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
                });
                if (path) setRoughnessInputPath(path);
              }}
              className="h-8 px-2.5 bg-surface-container hover:bg-surface-high border border-hairline rounded-xs text-[11px] text-ink-primary font-medium transition-colors flex items-center justify-center shrink-0 uppercase tracking-wider"
            >
              Examinar
            </button>
            <button
              onClick={handleInvertRoughness}
              disabled={isProcessingRoughness}
              className="h-8 px-3 bg-action hover:bg-action-hover text-white font-semibold rounded-xs text-[11px] transition-colors disabled:opacity-50 flex items-center justify-center shrink-0 uppercase tracking-wider shadow-xs"
            >
              {isProcessingRoughness ? 'Invirtiendo...' : 'Invertir'}
            </button>
          </div>
        </div>

        {/* Tool 4: Resize & Convert to WebP */}
        <div className="p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-primary flex items-center gap-1.5 font-primary">
              <ImageIcon className="w-3.5 h-3.5 text-action" />
              Redimensionar y Optimizar a WebP
            </span>
            <span className="text-[10px] font-mono tabular-nums text-ink-tertiary">Sharp WebP</span>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-0.5">
            <div>
              <span className="text-[10px] text-ink-secondary font-medium block mb-1">Resolución máxima:</span>
              <select
                value={targetRes}
                onChange={(e) => setTargetRes(Number(e.target.value))}
                className="w-full h-8 bg-surface-low border border-hairline-strong rounded-xs px-2 text-xs font-mono tabular-nums text-ink-primary"
              >
                <option value={4096}>4096 × 4096 (4K)</option>
                <option value={2048}>2048 × 2048 (2K)</option>
                <option value={1024}>1024 × 1024 (1K Web)</option>
                <option value={512}>512 × 512 (Ligero)</option>
              </select>
            </div>
            <div>
              <span className="text-[10px] text-ink-secondary font-medium block mb-1">
                Calidad WebP ({targetQuality}%):
              </span>
              <input
                type="range"
                min={50}
                max={100}
                value={targetQuality}
                onChange={(e) => setTargetQuality(Number(e.target.value))}
                className="w-full accent-action h-1.5 mt-2 bg-surface-container rounded-none appearance-none cursor-pointer"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={resizerInputPath}
              onChange={(e) => setResizerInputPath(e.target.value)}
              placeholder="Ruta de la textura a optimizar..."
              className="flex-1 h-8 bg-surface-low border border-hairline-strong rounded-xs px-2.5 text-xs font-mono tabular-nums text-ink-primary placeholder:text-ink-tertiary leading-8 focus:outline-none focus:border-action"
            />
            <button
              onClick={async () => {
                const path = await window.electronAPI.openFileDialog({
                  title: 'Seleccionar Textura',
                  filters: [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
                });
                if (path) setResizerInputPath(path);
              }}
              className="h-8 px-2.5 bg-surface-container hover:bg-surface-high border border-hairline rounded-xs text-[11px] text-ink-primary font-medium transition-colors flex items-center justify-center shrink-0 uppercase tracking-wider"
            >
              Examinar
            </button>
            <button
              onClick={handleResizeConvert}
              disabled={isProcessingResize}
              className="h-8 px-3 bg-action hover:bg-action-hover text-white font-semibold rounded-xs text-[11px] transition-colors disabled:opacity-50 flex items-center justify-center shrink-0 uppercase tracking-wider shadow-xs"
            >
              {isProcessingResize ? 'Optimizando...' : 'Convertir'}
            </button>
          </div>
        </div>
      </div>

      {/* PANEL 4: Performance Audit */}
      <PerformanceAudit />
    </div>
  );
};
