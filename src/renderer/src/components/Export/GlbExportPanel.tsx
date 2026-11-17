import React, { useState } from 'react';
import { Download, FileArchive, Smartphone, Layers } from 'lucide-react';
import { exportModelToGLB, exportModelToUSDZ, viewportBridge } from '../../utils/viewportBridge';
import { createWebPackageZip } from '../../utils/webPackageExporter';
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

  const [includeArInWebZip, setIncludeArInWebZip] = useState(true);
  const [arTextureSize, setArTextureSize] = useState<'1024' | '2048'>('1024');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('active');
  const [progressStatus, setProgressStatus] = useState<string | null>(null);

  const isBusy = isExportingGlb || isExportingUsdz || isExportingZip || isExportingArZip;

  const handleExportGLB = async () => {
    setIsExportingGlb(true);
    setProgressStatus('Exporting baked GLB model...');
    try {
      let glbBuffer: ArrayBuffer;
      let variantSuffix = 'baked';

      if (selectedVariantId !== 'active') {
        const targetVar = variants.find((v) => v.id === selectedVariantId);
        if (!targetVar) throw new Error('Selected variant not found.');
        const targetObject = viewportBridge.modelGroup || viewportBridge.scene;
        if (!targetObject) throw new Error('No 3D model loaded.');
        const baked = await bakeVariantArtifacts(targetObject, targetVar, {
          maxTextureSize: Number(arTextureSize) as 1024 | 2048,
          includeGlb: true,
          includeUsdz: false
        });
        if (!baked.glb) throw new Error('Could not generate GLB buffer.');
        glbBuffer = baked.glb;
        variantSuffix = baked.variantCode;
      } else {
        glbBuffer = await exportModelToGLB();
      }

      const defaultName = `${productId || 'model'}_${variantSuffix}.glb`;
      const filePath = await window.electronAPI.saveFileDialog({
        title: 'Export Standalone GLB Model',
        defaultPath: defaultName,
        filters: [{ name: 'GLB 3D Binary', extensions: ['glb'] }]
      });

      if (filePath) {
        await window.electronAPI.writeBinaryFile(filePath, glbBuffer);
        onSuccess(`.GLB model exported successfully to: ${filePath}`);
      }
    } catch (err: any) {
      onError(`GLB export error: ${err.message || err}`);
    } finally {
      setIsExportingGlb(false);
      setProgressStatus(null);
    }
  };

  const handleExportUSDZ = async () => {
    setIsExportingUsdz(true);
    setProgressStatus('Generating Apple AR model (USDZ)...');
    try {
      let usdzBuffer: ArrayBuffer;
      let variantSuffix = 'ar';

      if (selectedVariantId !== 'active') {
        const targetVar = variants.find((v) => v.id === selectedVariantId);
        if (!targetVar) throw new Error('Selected variant not found.');
        const targetObject = viewportBridge.modelGroup || viewportBridge.scene;
        if (!targetObject) throw new Error('No 3D model loaded.');
        const baked = await bakeVariantArtifacts(targetObject, targetVar, {
          maxTextureSize: Number(arTextureSize) as 1024 | 2048,
          includeGlb: false,
          includeUsdz: true
        });
        if (!baked.usdz) throw new Error('Could not generate USDZ buffer.');
        usdzBuffer = baked.usdz;
        variantSuffix = baked.variantCode;
      } else {
        usdzBuffer = await exportModelToUSDZ({ maxTextureSize: Number(arTextureSize) as 1024 | 2048 });
      }

      const defaultName = `${productId || 'model'}_${variantSuffix}.usdz`;
      const filePath = await window.electronAPI.saveFileDialog({
        title: 'Export USDZ Model for Apple AR Quick Look',
        defaultPath: defaultName,
        filters: [{ name: 'Universal Scene Description (USDZ)', extensions: ['usdz'] }]
      });

      if (filePath) {
        await window.electronAPI.writeBinaryFile(filePath, usdzBuffer);
        onSuccess(`.USDZ model exported successfully to: ${filePath}`);
      }
    } catch (err: any) {
      onError(`USDZ export error: ${err.message || err}`);
    } finally {
      setIsExportingUsdz(false);
      setProgressStatus(null);
    }
  };

  const handleExportWebZip = async () => {
    setIsExportingZip(true);
    setProgressStatus('Starting Web & AR 3D packaging...');
    try {
      const zipBlob = await createWebPackageZip({
        productId,
        productName,
        includeArVariants: includeArInWebZip,
        arTextureSize: Number(arTextureSize) as 1024 | 2048,
        includeArGlb: true,
        includeArUsdz: true,
        onProgress: (status) => setProgressStatus(status)
      });

      const defaultName = `${productId || 'model'}_web_package.zip`;
      const filePath = await window.electronAPI.saveFileDialog({
        title: 'Save Web & AR 3D Package (.ZIP)',
        defaultPath: defaultName,
        filters: [{ name: 'ZIP Archive', extensions: ['zip'] }]
      });

      if (filePath) {
        const arrayBuffer = await zipBlob.arrayBuffer();
        await window.electronAPI.writeBinaryFile(filePath, arrayBuffer);
        onSuccess(`Web & AR 3D Package .ZIP generated successfully at: ${filePath}`);
      }
    } catch (err: any) {
      onError(`ZIP packaging error: ${err.message || err}`);
    } finally {
      setIsExportingZip(false);
      setProgressStatus(null);
    }
  };

  const handleExportArZip = async () => {
    setIsExportingArZip(true);
    setProgressStatus('Starting AR bundle export...');
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

      const defaultName = `${productId || 'model'}_ar_bundle.zip`;
      const filePath = await window.electronAPI.saveFileDialog({
        title: 'Save Multi-Variant AR Bundle (.ZIP)',
        defaultPath: defaultName,
        filters: [{ name: 'ZIP Archive', extensions: ['zip'] }]
      });

      if (filePath) {
        const arrayBuffer = await zipBlob.arrayBuffer();
        await window.electronAPI.writeBinaryFile(filePath, arrayBuffer);
        onSuccess(`Multi-variant AR Bundle .ZIP exported successfully to: ${filePath}`);
      }
    } catch (err: any) {
      onError(`AR bundle export error: ${err.message || err}`);
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
          Web Package &amp; 3D Model Export
        </h4>
      </div>

      <p className="text-[11px] text-ink-secondary leading-relaxed">
        Export a standard Web &amp; AR .ZIP bundle for direct web integration (clean 1:1 geometry, model-3d.json, maps/ with lossless textures), or generate standalone models optimized for Augmented Reality.
      </p>

      {/* AR Texture Budget Selector */}
      <div className="p-2.5 rounded-xs bg-surface-low border border-hairline space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-ink-primary flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-action" />
            Max AR Texture Resolution
          </span>
          <span className="text-[10px] text-ink-tertiary font-mono">Quick Look &amp; Scene Viewer</span>
        </div>
        <SegmentedControl
          value={arTextureSize}
          onChange={(val) => setArTextureSize(val as '1024' | '2048')}
          options={[
            { value: '1024', label: '1024px (Mobile / Fast Load)', disabled: isBusy },
            { value: '2048', label: '2048px (High Definition)', disabled: isBusy }
          ]}
          variant="surface"
          size="sm"
        />
        <div className="text-[10px] text-ink-tertiary">
          1024px is recommended for Apple Quick Look and Android Scene Viewer to keep VRAM usage low.
        </div>
      </div>

      {/* Primary Action: Web & AR 3D ZIP Package */}
      <div className="p-3 rounded-xs bg-surface-container/60 border border-hairline space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-primary font-primary uppercase tracking-wider">
            Web &amp; AR 3D Package (.ZIP)
          </span>
        </div>

        <div className="space-y-1.5 pt-0.5">
          <label className="flex items-center gap-1.5 text-[11px] text-ink-secondary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeArInWebZip}
              onChange={(e) => setIncludeArInWebZip(e.target.checked)}
              disabled={isBusy}
              className="rounded-xs border-hairline text-action focus:ring-0 cursor-pointer"
            />
            <span>
              Include per-variant baked AR models in <code className="text-action font-mono">ar/</code> (GLB + USDZ)
            </span>
          </label>
        </div>

        <Button
          variant="primary"
          size="md"
          className="w-full"
          onClick={handleExportWebZip}
          disabled={isBusy}
          isLoading={isExportingZip}
          icon={!isExportingZip ? <FileArchive className="w-3.5 h-3.5" /> : undefined}
        >
          {isExportingZip ? (progressStatus || 'Packaging...') : 'Export Web & AR Package (.ZIP)'}
        </Button>

        <div className="text-[10px] text-ink-tertiary font-mono leading-normal">
          Structure: <code className="text-action font-semibold">geometry.glb</code> (clean 1:1) + <code className="text-action font-semibold">model-3d.json</code> + <code className="text-action font-semibold">maps/</code> {includeArInWebZip && '+ ar/ (glb/ + usdz/)'}
        </div>
      </div>

      {/* AR Multi-Variant Bundle Export */}
      <div className="p-3 rounded-xs bg-surface-container/60 border border-hairline space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-primary font-primary uppercase tracking-wider flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-action" />
            Multi-Variant AR Bundle (.ZIP)
          </span>
          <span className="text-[10px] font-mono text-ink-tertiary">
            {variants.length} {variants.length === 1 ? 'variant' : 'variants'}
          </span>
        </div>

        <p className="text-[11px] text-ink-secondary leading-relaxed">
          Generates a standalone ZIP containing baked models (.GLB for Android and .USDZ for iOS) for all variants with textures optimized at {arTextureSize}px.
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
          {isExportingArZip ? (progressStatus || 'Baking variants...') : `Export AR Bundle (${variants.length} var)`}
        </Button>
      </div>

      {/* Secondary Standalone Exports */}
      <div className="space-y-2 pt-0.5">
        <div className="flex items-center justify-between">
          <div className="text-[10px] uppercase font-mono tracking-wider text-ink-tertiary">
            Standalone Individual Exports
          </div>
          {variants.length > 1 && (
            <div className="flex items-center gap-1 text-[10px] text-ink-secondary">
              <Layers className="w-3 h-3 text-ink-tertiary" />
              <span>Variant:</span>
              <select
                value={selectedVariantId}
                onChange={(e) => setSelectedVariantId(e.target.value)}
                disabled={isBusy}
                className="bg-surface-lowest border border-hairline text-ink-primary text-[10px] px-1.5 py-0.5 rounded-xs focus:outline-none focus:border-action cursor-pointer"
              >
                <option value="active">Active in Viewport</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name || v.id} {v.id === activeVariantId ? '(Active)' : ''}
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
            title="Bakes geometry with embedded textures for Three.js, Scene Viewer, or Blender"
          >
            {isExportingGlb ? 'Baking...' : 'Bake .GLB'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={handleExportUSDZ}
            disabled={isBusy}
            isLoading={isExportingUsdz}
            icon={!isExportingUsdz ? <Smartphone className="w-3.5 h-3.5 text-action" /> : undefined}
            title="Augmented Reality model for iPhone / iPad (Apple Quick Look)"
          >
            {isExportingUsdz ? 'Generating...' : 'Export .USDZ'}
          </Button>
        </div>
      </div>
    </div>
  );
};
