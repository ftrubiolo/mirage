import React, { useState } from 'react';
import { Camera, Download } from 'lucide-react';
import { captureViewportSnapshot } from '../../utils/viewportBridge';
import { Checkbox } from '../UI/Checkbox';

export interface PosterCapturePanelProps {
  productId: string;
  capturedPosterBlob: Blob | null;
  setCapturedPosterBlob: (blob: Blob | null) => void;
  onError: (errorText: string) => void;
  onSuccess: (successText: string) => void;
}

export const PosterCapturePanel: React.FC<PosterCapturePanelProps> = ({
  productId,
  capturedPosterBlob,
  setCapturedPosterBlob,
  onError,
  onSuccess
}) => {
  const [posterRes, setPosterRes] = useState<'1024' | '512' | '1080'>('1024');
  const [transparentBg, setTransparentBg] = useState(true);
  const [posterFormat, setPosterFormat] = useState<'webp' | 'png'>('webp');
  const [capturedPosterUrl, setCapturedPosterUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCapturePoster = async () => {
    setIsCapturing(true);
    try {
      const dim =
        posterRes === '1080'
          ? { width: 1920, height: 1080 }
          : { width: Number(posterRes), height: Number(posterRes) };
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
      onError(`Error al capturar poster: ${err.message || err}`);
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
      onSuccess(`Poster guardado en: ${filePath}`);
    }
  };

  return (
    <div className="p-3.5 rounded-xs bg-surface-lowest border border-hairline space-y-3.5 shadow-xs">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider font-primary text-ink-primary flex items-center gap-1.5">
          <Camera className="w-4 h-4 text-action" />
          Generador de Posters y Miniaturas
        </h4>
        <span className="text-[10px] font-mono tabular-nums text-ink-tertiary">
          model-viewer poster
        </span>
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
  );
};
