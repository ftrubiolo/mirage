import React, { useState } from 'react';
import { PackageCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { useWorkbenchStore } from '../../store/workbenchStore';
import { PerformanceAudit } from '../Audit/PerformanceAudit';
import { PosterCapturePanel } from './PosterCapturePanel';
import { GlbExportPanel } from './GlbExportPanel';
import { TexturePipelinePanel } from './TexturePipelinePanel';

export { PosterCapturePanel, GlbExportPanel, TexturePipelinePanel };

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

  const [capturedPosterBlob, setCapturedPosterBlob] = useState<Blob | null>(null);
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
