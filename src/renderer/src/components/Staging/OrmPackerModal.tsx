import React, { useState, useEffect } from 'react';
import { Package, FolderOpen } from 'lucide-react';
import { usePbrMaterialStore } from '../../store/pbrMaterialStore';
import { MapVariantItem, useVariantStore } from '../../store/variantStore';
import { useAppStore } from '../../store/appStore';
import { getNextSlotTargetType } from './MapSlotPicker';
import { packOrmWithCanvas } from '../../utils/canvasOrmPacker';
import { autoSaveActiveEntry } from '../../utils/libraryBridge';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { TextInput } from '../UI/TextInput';
import { SegmentedControl } from '../UI/SegmentedControl';

export const OrmPackerModal: React.FC = () => {
  const isOrmPackerOpen = useAppStore((state) => state.isOrmPackerOpen);
  const closeOrmPacker = useAppStore((state) => state.closeOrmPacker);
  const mapVariants = useVariantStore((state) => state.mapVariants);
  const addMapVariant = useVariantStore((state) => state.addMapVariant);
  const setUseOrmPack = usePbrMaterialStore((state) => state.setUseOrmPack);

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

  // Pre-fill from active slots and auto-suggest variant name when opening
  useEffect(() => {
    if (isOrmPackerOpen) {
      const pbrState = usePbrMaterialStore.getState();
      if (pbrState.aoMap.filePath) setAoPath(pbrState.aoMap.filePath);
      if (pbrState.roughnessMap.filePath) setRoughnessPath(pbrState.roughnessMap.filePath);
      if (pbrState.metalnessMap.filePath) setMetalnessPath(pbrState.metalnessMap.filePath);
      if (pbrState.aoMap.filePath && (pbrState.roughnessMap.filePath || pbrState.metalnessMap.filePath)) {
        setMode('separate');
      }

      const activeSlug = useAppStore.getState().activeEntrySlug || 'producto';
      const existingVariants = useVariantStore.getState().mapVariants['orm'] || [];
      const targetType = getNextSlotTargetType('orm', existingVariants, activeSlug);
      
      const defaultName = `${activeSlug}_${targetType}`;
      setNewName(defaultName);
      setCustomOutputPath('');
      setResolution(2048);
      setQuality(90);
    }
  }, [isOrmPackerOpen]);

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

  return (
    <Modal
      isOpen={isOrmPackerOpen}
      onClose={() => !isProcessing && closeOrmPacker()}
      title="Empaquetador de Textura ORM"
      icon={<Package className="w-4 h-4" />}
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleBrowseOutput}
            disabled={isProcessing}
            icon={<FolderOpen className="w-3.5 h-3.5" />}
          >
            Examinar Ruta
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={closeOrmPacker}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePack}
              isLoading={isProcessing}
              disabled={!newName.trim()}
            >
              Empaquetar
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3.5 font-body">
        {/* Mode Selector */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-primary font-semibold text-ink-secondary uppercase tracking-wider">
            Modo de Entrada:
          </span>
          <SegmentedControl
            options={[
              { value: 'gltf', label: 'glTF Split (2 Mapas)' },
              { value: 'separate', label: 'Mapas Separados (3)' }
            ]}
            value={mode}
            onChange={(val) => setMode(val as any)}
            size="sm"
          />
        </div>

        {/* Inputs */}
        <div className="space-y-2.5 pt-1">
          {/* AO Map Input (Canal R) */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono tabular-nums text-ink-secondary flex items-center justify-between">
              <span>Canal R — Oclusión Ambiental (AO)</span>
            </label>
            <div className="flex gap-1.5">
              <div className="flex-1">
                <TextInput
                  readOnly
                  value={aoPath}
                  placeholder="Selecciona el mapa AO..."
                  mono
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => pickFile(setAoPath, 'Seleccionar mapa de AO')}
                disabled={isProcessing}
                icon={<FolderOpen className="w-3.5 h-3.5" />}
              />
            </div>
          </div>

          {/* Mode glTF: metalRoughness */}
          {mode === 'gltf' ? (
            <div className="space-y-1">
              <label className="text-[10px] font-mono tabular-nums text-ink-secondary flex items-center justify-between">
                <span>Canales G+B — glTF metalRoughness (G: Rough, B: Metal)</span>
              </label>
              <div className="flex gap-1.5">
                <div className="flex-1">
                  <TextInput
                    readOnly
                    value={metalRoughnessPath}
                    placeholder="Selecciona el mapa metalRoughness..."
                    mono
                  />
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => pickFile(setMetalRoughnessPath, 'Seleccionar mapa metalRoughness')}
                  disabled={isProcessing}
                  icon={<FolderOpen className="w-3.5 h-3.5" />}
                />
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
                  <div className="flex-1">
                    <TextInput
                      readOnly
                      value={roughnessPath}
                      placeholder="Rugosidad..."
                      mono
                    />
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => pickFile(setRoughnessPath, 'Seleccionar mapa Roughness')}
                    disabled={isProcessing}
                    icon={<FolderOpen className="w-3.5 h-3.5" />}
                  />
                </div>
              </div>

              {/* Metallic (Canal B) */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono tabular-nums text-ink-secondary block truncate">
                  Canal B — Metalicidad
                </label>
                <div className="flex gap-1.5">
                  <div className="flex-1">
                    <TextInput
                      readOnly
                      value={metalnessPath}
                      placeholder="Metálico..."
                      mono
                    />
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => pickFile(setMetalnessPath, 'Seleccionar mapa Metallic')}
                    disabled={isProcessing}
                    icon={<FolderOpen className="w-3.5 h-3.5" />}
                  />
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
              className="w-full h-8 bg-surface-lowest border border-hairline-strong rounded-xs px-2 text-xs font-mono tabular-nums text-ink-primary focus:outline-none focus:border-action cursor-pointer disabled:opacity-50"
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
            <div className="flex items-center h-8">
              <input
                type="range"
                min="50"
                max="100"
                value={quality}
                disabled={isProcessing}
                onChange={(e) => setQuality(parseInt(e.target.value))}
                className="w-full accent-action h-1.5 bg-surface-container rounded-none appearance-none cursor-pointer disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Variant Name Input */}
        <div>
          <label className="block text-[11px] text-ink-secondary mb-1 font-primary">
            Nombre de la variante ORM:
          </label>
          <TextInput
            value={newName}
            disabled={isProcessing}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim() && !isProcessing) {
                handlePack();
              }
            }}
            placeholder="Nombre de la nueva variante ORM..."
            mono
          />
        </div>

        {customOutputPath && (
          <div className="p-2 bg-surface-low border border-hairline rounded-xs">
            <span className="text-[10px] text-ink-tertiary font-mono block">Destino personalizado:</span>
            <span className="text-xs font-mono text-ink-primary truncate block">{customOutputPath}</span>
          </div>
        )}
      </div>
    </Modal>
  );
};
