import React, { useState } from 'react';
import {
  Package,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  ArrowRightLeft,
  Wrench
} from 'lucide-react';
import { SlotName } from '../../store/pbrMaterialStore';
import {
  convertImageToWebpCanvas,
  flipNormalMapCanvas,
  invertRoughnessCanvas
} from '../../utils/canvasTextureProcessor';
import { Button } from '../UI/Button';
import { TextInput } from '../UI/TextInput';
import { AlertBanner } from '../UI/AlertBanner';

export interface TexturePipelinePanelProps {
  initialNormalPath?: string;
  initialRoughnessPath?: string;
  initialBaseColorPath?: string;
  setMapSlot: (slot: SlotName, data: any) => void;
  openOrmPacker: () => void;
}

export const TexturePipelinePanel: React.FC<TexturePipelinePanelProps> = ({
  initialNormalPath = '',
  initialRoughnessPath = '',
  initialBaseColorPath = '',
  setMapSlot,
  openOrmPacker
}) => {
  const [normalInputPath, setNormalInputPath] = useState<string>(initialNormalPath);
  const [isProcessingNormal, setIsProcessingNormal] = useState(false);

  const [roughnessInputPath, setRoughnessInputPath] = useState<string>(initialRoughnessPath);
  const [isProcessingRoughness, setIsProcessingRoughness] = useState(false);

  const [resizerInputPath, setResizerInputPath] = useState<string>(initialBaseColorPath);
  const [targetRes, setTargetRes] = useState<number>(2048);
  const [targetQuality, setTargetQuality] = useState<number>(85);
  const [isProcessingResize, setIsProcessingResize] = useState(false);

  const [textureMsg, setTextureMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Normal Y Flip
  const handleFlipNormal = async () => {
    const file = normalInputPath;
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
    const file = roughnessInputPath;
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
    const file = resizerInputPath;
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
    <div className="rounded-xs bg-surface-lowest border border-hairline overflow-hidden divide-y divide-hairline shadow-xs">
      {/* Section Header */}
      <div className="p-3 flex items-center justify-between bg-surface-low">
        <h4 className="text-xs font-semibold uppercase tracking-wider font-primary text-ink-primary flex items-center gap-1.5">
          <Wrench className="w-4 h-4 text-action" />
          Pipeline de Texturas (Sharp)
        </h4>
        <span className="text-[10px] font-mono tabular-nums text-ink-tertiary">
          Procesamiento PBR
        </span>
      </div>

      {/* Texture message */}
      {textureMsg && (
        <div className="p-3">
          <AlertBanner
            variant={textureMsg.type === 'success' ? 'success' : 'error'}
            title={textureMsg.type === 'success' ? 'Operación exitosa' : 'Error en pipeline'}
            message={textureMsg.text}
            onClose={() => setTextureMsg(null)}
          />
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
        <Button
          variant="secondary"
          size="sm"
          onClick={openOrmPacker}
          icon={<Package className="w-3.5 h-3.5 text-action" />}
        >
          Empaquetador ORM
        </Button>
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
          <div className="flex-1">
            <TextInput
              value={normalInputPath}
              onChange={(e) => setNormalInputPath(e.target.value)}
              placeholder="Ruta del Normal Map..."
              mono
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              const path = await window.electronAPI.openFileDialog({
                title: 'Seleccionar Mapa de Normales',
                filters: [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'webp', 'tga'] }]
              });
              if (path) setNormalInputPath(path);
            }}
          >
            Examinar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleFlipNormal}
            isLoading={isProcessingNormal}
          >
            Invertir Y
          </Button>
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
          <div className="flex-1">
            <TextInput
              value={roughnessInputPath}
              onChange={(e) => setRoughnessInputPath(e.target.value)}
              placeholder="Ruta del mapa de rugosidad..."
              mono
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              const path = await window.electronAPI.openFileDialog({
                title: 'Seleccionar Textura de Rugosidad',
                filters: [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
              });
              if (path) setRoughnessInputPath(path);
            }}
          >
            Examinar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleInvertRoughness}
            isLoading={isProcessingRoughness}
          >
            Invertir
          </Button>
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
          <div className="flex-1">
            <TextInput
              value={resizerInputPath}
              onChange={(e) => setResizerInputPath(e.target.value)}
              placeholder="Ruta de la textura a optimizar..."
              mono
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              const path = await window.electronAPI.openFileDialog({
                title: 'Seleccionar Textura',
                filters: [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
              });
              if (path) setResizerInputPath(path);
            }}
          >
            Examinar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleResizeConvert}
            isLoading={isProcessingResize}
          >
            Convertir
          </Button>
        </div>
      </div>
    </div>
  );
};
