import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Package, FolderOpen, Loader2 } from 'lucide-react';
import { useWorkbenchStore, MapVariantItem } from '../../store/workbenchStore';
import { useAppStore } from '../../store/appStore';
import { getNextSlotTargetType } from './MapSlotPicker';
import { packOrmWithCanvas } from '../../utils/canvasOrmPacker';
import { autoSaveActiveEntry } from '../../utils/libraryBridge';

export const OrmPackerModal: React.FC = () => {
  const {
    isOrmPackerOpen,
    closeOrmPacker,
    mapVariants,
    addMapVariant,
    setUseOrmPack
  } = useWorkbenchStore();

  const [mode, setMode] = useState<'gltf' | 'separate'>('gltf');
  const [aoPath, setAoPath] = useState('');
  const [metalRoughnessPath, setMetalRoughnessPath] = useState('');
  const [roughnessPath, setRoughnessPath] = useState('');
  const [metalnessPath, setMetalnessPath] = useState('');
  const [newName, setNewName] = useState('');
  const [customOutputPath, setCustomOutputPath] = useState('');
  const [resolution, setResolution] = useState(2048);
  const [quality, setQuality] = useState(90);
  const [isProcessing, setIsProcessing] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);

  // Pre-fill from active slots and auto-suggest variant name when opening
  useEffect(() => {
    if (isOrmPackerOpen) {
      const state = useWorkbenchStore.getState();
      if (state.aoMap.filePath) setAoPath(state.aoMap.filePath);
      if (state.roughnessMap.filePath) setRoughnessPath(state.roughnessMap.filePath);
      if (state.metalnessMap.filePath) setMetalnessPath(state.metalnessMap.filePath);
      if (state.aoMap.filePath && (state.roughnessMap.filePath || state.metalnessMap.filePath)) {
        setMode('separate');
      }

      const activeSlug = useAppStore.getState().activeEntrySlug || 'producto';
      const existingVariants = state.mapVariants['orm'] || [];
      const targetType = getNextSlotTargetType('orm', existingVariants, activeSlug);
      
      const defaultName = `${activeSlug}_${targetType}`;
      setNewName(defaultName);
      setCustomOutputPath('');
      setResolution(2048);
      setQuality(90);
    }
  }, [isOrmPackerOpen]);

  // Handle ESC and outside click
  useEffect(() => {
    if (!isOrmPackerOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        closeOrmPacker();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOrmPackerOpen, isProcessing, closeOrmPacker]);

  if (!isOrmPackerOpen) return null;

  const pickFile = async (setter: (val: string) => void, title: string) => {
    const file = await window.electronAPI.openFileDialog({
      title,
      filters: [{ name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'webp', 'tga'] }]
    });
    if (file) {
      setter(file);
    }
  };

  const handleBrowseOutput = async () => {
    try {
      const activeSlug = useAppStore.getState().activeEntrySlug || 'producto';
      const libDir = await window.electronAPI.getLibraryPath();
      const sep = libDir.includes('\\') ? '\\' : '/';
      const entryDir = `${libDir}${sep}${activeSlug}`;
      const existingVariants = mapVariants['orm'] || [];
      const targetType = getNextSlotTargetType('orm', existingVariants, activeSlug);
      const defaultFileName = `${activeSlug}_${targetType}.webp`;
      const defaultPath = `${entryDir}${sep}${defaultFileName}`;

      const selected = await window.electronAPI.saveFileDialog({
        title: 'Guardar mapa ORM WebP',
        defaultPath: customOutputPath || defaultPath,
        filters: [{ name: 'WebP Texture', extensions: ['webp'] }]
      });

      if (selected) {
        setCustomOutputPath(selected);
      }
    } catch (err) {
      console.warn('[OrmPackerModal] Error opening save dialog:', err);
    }
  };

  const handlePack = async () => {
    if (!aoPath) {
      alert('Debes seleccionar el mapa de AO (Oclusión Ambiental)');
      return;
    }

    if (mode === 'gltf' && !metalRoughnessPath) {
      alert('Debes seleccionar el mapa metalRoughness de glTF');
      return;
    }

    if (mode === 'separate' && !roughnessPath && !metalnessPath) {
      alert('Debes seleccionar al menos un mapa de rugosidad o metalicidad');
      return;
    }

    const activeSlug = useAppStore.getState().activeEntrySlug || 'producto';
    let finalOutput = customOutputPath;

    if (!finalOutput) {
      try {
        const libDir = await window.electronAPI.getLibraryPath();
        const sep = libDir.includes('\\') ? '\\' : '/';
        const entryDir = `${libDir}${sep}${activeSlug}`;
        const existingVariants = mapVariants['orm'] || [];
        const targetType = getNextSlotTargetType('orm', existingVariants, activeSlug);
        const destFileName = `${activeSlug}_${targetType}.webp`;
        finalOutput = `${entryDir}${sep}${destFileName}`;
      } catch (err) {
        const lastSlash = Math.max(aoPath.lastIndexOf('/'), aoPath.lastIndexOf('\\'));
        const dir = lastSlash !== -1 ? aoPath.substring(0, lastSlash) : '';
        const sep = aoPath.includes('\\') ? '\\' : '/';
        finalOutput = `${dir}${sep}output_orm.webp`;
      }
    }

    try {
      setIsProcessing(true);

      let packedPath = '';

      // 1. Primary engine: Hardware-accelerated Canvas WebP packing
      try {
        packedPath = await packOrmWithCanvas({
          aoUrl: window.electronAPI.toAssetUrl(aoPath),
          metalRoughnessUrl: mode === 'gltf' && metalRoughnessPath ? window.electronAPI.toAssetUrl(metalRoughnessPath) : undefined,
          roughnessUrl: mode === 'separate' && roughnessPath ? window.electronAPI.toAssetUrl(roughnessPath) : undefined,
          metalnessUrl: mode === 'separate' && metalnessPath ? window.electronAPI.toAssetUrl(metalnessPath) : undefined,
          outputPath: finalOutput,
          resolution,
          quality
        });
      } catch (canvasErr) {
        console.warn('Canvas packer fallback to Sharp worker:', canvasErr);
        // 2. Fallback to Sharp worker
        packedPath = await window.electronAPI.packOrmTexture({
          aoPath,
          metalRoughnessPath: mode === 'gltf' ? metalRoughnessPath : undefined,
          roughnessPath: mode === 'separate' ? roughnessPath : undefined,
          metalnessPath: mode === 'separate' ? metalnessPath : undefined,
          outputPath: finalOutput,
          resolution,
          quality
        });
      }

      const fileInfo = await window.electronAPI.getFileInfo(packedPath);
      const rawAssetUrl = window.electronAPI.toAssetUrl(packedPath);
      const assetUrl = `${rawAssetUrl}?v=${Date.now()}`;

      const finalVariantName = newName.trim() || fileInfo.name.replace(/\.[^/.]+$/, '');

      // Add as an additional variant in the ORM pool & activate it
      const newVariant: MapVariantItem = {
        id: `orm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: finalVariantName,
        url: assetUrl,
        filePath: packedPath,
        fileName: fileInfo.name,
        fileSize: fileInfo.size
      };

      addMapVariant('orm', newVariant);
      setUseOrmPack(true);
      autoSaveActiveEntry(true);
      closeOrmPacker();
    } catch (err: any) {
      console.error('[OrmPackerModal] Error packing ORM texture:', err);
      alert(`Error al empaquetar ORM: ${err?.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return createPortal(
    <div
      onClick={() => {
        if (!isProcessing) closeOrmPacker();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none font-body animate-in fade-in duration-100 cursor-pointer"
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[480px] bg-surface-lowest border border-hairline-strong rounded-xs shadow-2xl p-4 flex flex-col gap-3 font-body animate-in fade-in zoom-in-95 duration-150 cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-xs bg-action/10 border border-action/30 flex items-center justify-center text-action shrink-0">
              <Package className="w-3.5 h-3.5" />
            </div>
            <span className="font-primary font-bold text-xs text-ink-primary uppercase tracking-wider">
              Empaquetador de Textura ORM
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-ink-tertiary">
              GPU WebP / Sharp
            </span>
            <button
              type="button"
              disabled={isProcessing}
              onClick={closeOrmPacker}
              className="text-ink-tertiary hover:text-ink-primary p-0.5 rounded-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Cerrar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => setMode('gltf')}
            className={`py-1.5 px-2.5 text-xs rounded-xs border font-medium transition-colors text-left cursor-pointer ${
              mode === 'gltf'
                ? 'border-action bg-action/10 text-action font-semibold'
                : 'border-hairline bg-surface-low text-ink-secondary hover:border-hairline-strong'
            }`}
          >
            <div className="font-primary text-[11px]">glTF Split (2 mapas)</div>
            <div className="text-[9px] text-ink-tertiary font-mono">AO + metalRoughness</div>
          </button>

          <button
            type="button"
            disabled={isProcessing}
            onClick={() => setMode('separate')}
            className={`py-1.5 px-2.5 text-xs rounded-xs border font-medium transition-colors text-left cursor-pointer ${
              mode === 'separate'
                ? 'border-action bg-action/10 text-action font-semibold'
                : 'border-hairline bg-surface-low text-ink-secondary hover:border-hairline-strong'
            }`}
          >
            <div className="font-primary text-[11px]">Mapas Separados (3)</div>
            <div className="text-[9px] text-ink-tertiary font-mono">AO + Rough + Metal</div>
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-2 pt-0.5">
          {/* AO Map Input (Canal R) */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono tabular-nums text-ink-secondary flex items-center justify-between">
              <span>Canal R — Oclusión Ambiental (AO)</span>
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                readOnly
                value={aoPath}
                placeholder="Selecciona el mapa AO..."
                className="flex-1 h-7 bg-surface-low border border-hairline-strong rounded-xs px-2.5 text-xs font-mono tabular-nums text-ink-primary placeholder:text-ink-tertiary truncate"
              />
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => pickFile(setAoPath, 'Seleccionar mapa de AO')}
                className="h-7 px-2 rounded-xs bg-surface-container hover:bg-surface-high border border-hairline text-ink-primary text-xs cursor-pointer flex items-center justify-center shrink-0"
              >
                <FolderOpen className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Mode glTF: metalRoughness */}
          {mode === 'gltf' ? (
            <div className="space-y-1">
              <label className="text-[10px] font-mono tabular-nums text-ink-secondary flex items-center justify-between">
                <span>Canales G+B — glTF metalRoughness (G: Rough, B: Metal)</span>
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={metalRoughnessPath}
                  placeholder="Selecciona el mapa metalRoughness..."
                  className="flex-1 h-7 bg-surface-low border border-hairline-strong rounded-xs px-2.5 text-xs font-mono tabular-nums text-ink-primary placeholder:text-ink-tertiary truncate"
                />
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => pickFile(setMetalRoughnessPath, 'Seleccionar mapa metalRoughness')}
                  className="h-7 px-2 rounded-xs bg-surface-container hover:bg-surface-high border border-hairline text-ink-primary text-xs cursor-pointer flex items-center justify-center shrink-0"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {/* Roughness (Canal G) */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono tabular-nums text-ink-secondary block truncate">
                  Canal G — Rugosidad
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={roughnessPath}
                    placeholder="Rugosidad..."
                    className="flex-1 h-7 bg-surface-low border border-hairline-strong rounded-xs px-2 text-xs font-mono tabular-nums text-ink-primary placeholder:text-ink-tertiary truncate"
                  />
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => pickFile(setRoughnessPath, 'Seleccionar mapa Roughness')}
                    className="h-7 px-2 rounded-xs bg-surface-container hover:bg-surface-high border border-hairline text-ink-primary text-xs cursor-pointer flex items-center justify-center shrink-0"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Metallic (Canal B) */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono tabular-nums text-ink-secondary block truncate">
                  Canal B — Metalicidad
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={metalnessPath}
                    placeholder="Metálico..."
                    className="flex-1 h-7 bg-surface-low border border-hairline-strong rounded-xs px-2 text-xs font-mono tabular-nums text-ink-primary placeholder:text-ink-tertiary truncate"
                  />
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => pickFile(setMetalnessPath, 'Seleccionar mapa Metallic')}
                    className="h-7 px-2 rounded-xs bg-surface-container hover:bg-surface-high border border-hairline text-ink-primary text-xs cursor-pointer flex items-center justify-center shrink-0"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Resolution & Quality */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] text-ink-secondary mb-1 font-primary">
              Resolución:
            </label>
            <select
              value={resolution}
              disabled={isProcessing}
              onChange={(e) => setResolution(parseInt(e.target.value))}
              className="w-full h-7 bg-surface-lowest border border-hairline-strong rounded-xs px-2 text-xs font-mono tabular-nums text-ink-primary focus:outline-none focus:border-action cursor-pointer disabled:opacity-50"
            >
              <option value={4096}>4096 × 4096 (4K)</option>
              <option value={2048}>2048 × 2048 (2K)</option>
              <option value={1024}>1024 × 1024 (1K)</option>
              <option value={512}>512 × 512 (512px)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-ink-secondary mb-1 font-primary">
              Calidad WebP ({quality}%):
            </label>
            <div className="flex items-center h-7">
              <input
                type="range"
                min="50"
                max="100"
                value={quality}
                disabled={isProcessing}
                onChange={(e) => setQuality(parseInt(e.target.value))}
                className="w-full accent-action h-1 bg-surface-container rounded-none appearance-none cursor-pointer disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Row: Variant Name Input, EXAMINAR button, EMPAQUETAR button */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={newName}
            disabled={isProcessing}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim() && !isProcessing) {
                handlePack();
              }
            }}
            placeholder="Nombre de la nueva variante ORM..."
            className="min-w-0 flex-1 h-7 px-2.5 rounded-xs bg-surface-lowest border border-hairline-strong text-xs font-mono tabular-nums text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:border-action disabled:opacity-50"
            title="Nombre para la nueva variante ORM"
          />

          <button
            type="button"
            disabled={isProcessing}
            onClick={handleBrowseOutput}
            className="h-7 px-3 rounded-xs border border-hairline-strong bg-surface-low hover:bg-surface-high text-[11px] font-mono font-semibold uppercase tracking-wider text-ink-primary transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            title="Examinar y cambiar ruta o nombre de destino"
          >
            EXAMINAR
          </button>

          <button
            type="button"
            disabled={isProcessing || !newName.trim()}
            onClick={handlePack}
            className="h-7 px-4 rounded-xs bg-action hover:bg-action-hover text-white text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>EMPAQUETANDO...</span>
              </>
            ) : (
              <span>EMPAQUETAR</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
