import React, { useState } from 'react';
import { PackageCheck } from 'lucide-react';
import { usePbrMaterialStore } from '../../store/pbrMaterialStore';
import { useModelStore } from '../../store/modelStore';
import { useAppStore } from '../../store/appStore';
import {
  generateExportConfig as buildExportConfig,
  setMapSlotForActiveVariant
} from '../../store/workbenchActions';
import { PerformanceAudit } from '../Audit/PerformanceAudit';
import { PosterCapturePanel } from './PosterCapturePanel';
import { GlbExportPanel } from './GlbExportPanel';
import { TexturePipelinePanel } from './TexturePipelinePanel';
import { AlertBanner } from '../UI';

export { PosterCapturePanel, GlbExportPanel, TexturePipelinePanel };

export const ExportStudio: React.FC = () => {
  // One narrow selector per field: an object-returning selector would produce a
  // fresh reference on every render and loop under zustand v5.
  const normalMap = usePbrMaterialStore((s) => s.normalMap);
  const roughnessMap = usePbrMaterialStore((s) => s.roughnessMap);
  const baseColorMap = usePbrMaterialStore((s) => s.baseColorMap);
  const modelStats = useModelStore((s) => s.modelStats);
  const setMapSlot = setMapSlotForActiveVariant;
  const openOrmPacker = useAppStore((s) => s.openOrmPacker);
  const productId = useModelStore((s) => s.productId);
  const productName = useModelStore((s) => s.productName);
  const generateExportConfig = buildExportConfig;

  const [capturedPosterBlob, setCapturedPosterBlob] = useState<Blob | null>(null);
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  return (
    <div className="space-y-4 font-body select-none pb-8 text-ink-primary">
      {/* Tab Header Banner */}
      <div className="p-3.5 rounded-xs bg-surface-lowest border border-hairline flex items-center justify-between shadow-xs">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider font-primary text-ink-primary flex items-center gap-1.5">
            <PackageCheck className="w-4 h-4 text-action" />
            Export &amp; Delivery Center
          </h3>
          <p className="text-[11px] text-ink-secondary mt-0.5">
            Optimize, bake geometry, and generate bundles for web catalogs and AR viewers.
          </p>
        </div>
      </div>

      {/* Global Status Message */}
      {exportMessage && (
        <AlertBanner
          variant={exportMessage.type}
          message={exportMessage.text}
          onClose={() => setExportMessage(null)}
        />
      )}

      {/* PANEL 1: Poster & Snapshot Generator */}
      <PosterCapturePanel
        productId={productId}
        capturedPosterBlob={capturedPosterBlob}
        setCapturedPosterBlob={setCapturedPosterBlob}
        onError={(text) => setExportMessage({ type: 'error', text })}
        onSuccess={(text) => setExportMessage({ type: 'success', text })}
      />

      {/* PANEL 2: Standalone GLB & ZIP Web Bundle */}
      <GlbExportPanel
        productId={productId}
        productName={productName}
        modelStats={modelStats}
        capturedPosterBlob={capturedPosterBlob}
        generateExportConfig={generateExportConfig}
        onError={(text) => setExportMessage({ type: 'error', text })}
        onSuccess={(text) => setExportMessage({ type: 'success', text })}
      />

      {/* PANEL 3: Texture Processing Pipeline (Sharp) */}
      <TexturePipelinePanel
        initialNormalPath={normalMap.filePath || ''}
        initialRoughnessPath={roughnessMap.filePath || ''}
        initialBaseColorPath={baseColorMap.filePath || ''}
        setMapSlot={setMapSlot}
        openOrmPacker={openOrmPacker}
      />

      {/* PANEL 4: Performance Audit */}
      <PerformanceAudit />
    </div>
  );
};
