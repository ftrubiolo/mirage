import React, { useState } from 'react';
import { Camera, Download } from 'lucide-react';
import { captureViewportSnapshot } from '../../utils/viewportBridge';
import { Checkbox } from '../UI/Checkbox';
import { Button } from '../UI/Button';
import { SegmentedControl } from '../UI/SegmentedControl';

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
      onError(`Error capturing poster: ${err.message || err}`);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSavePoster = async () => {
    if (!capturedPosterBlob) return;
    const ext = posterFormat;
    const defaultName = `${productId || 'model'}_poster.${ext}`;
    const filePath = await window.electronAPI.saveFileDialog({
      title: 'Save Poster / Thumbnail',
      defaultPath: defaultName,
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }]
    });

    if (filePath) {
      const arrayBuffer = await capturedPosterBlob.arrayBuffer();
      await window.electronAPI.writeBinaryFile(filePath, arrayBuffer);
      onSuccess(`Poster saved to: ${filePath}`);
    }
  };

  return (
    <div className="p-3.5 rounded-xs bg-surface-lowest border border-hairline space-y-3.5 shadow-xs">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider font-primary text-ink-primary flex items-center gap-1.5">
          <Camera className="w-4 h-4 text-action" />
          Poster &amp; Thumbnail Generator
        </h4>
        <span className="text-[10px] font-mono tabular-nums text-ink-tertiary">
          model-viewer poster
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Resolution Presets */}
        <div className="space-y-1.5">
          <span className="text-[10px] text-ink-secondary font-primary font-semibold uppercase tracking-wider block">
            Resolution
          </span>
          <SegmentedControl
            options={[
              { value: '1024', label: '1024²' },
              { value: '512', label: '512²' },
              { value: '1080', label: '1080p' }
            ]}
            value={posterRes}
            onChange={(v) => setPosterRes(v as any)}
            size="xs"
            className="w-full"
          />
        </div>

        {/* Format Selection */}
        <div className="space-y-1.5">
          <span className="text-[10px] text-ink-secondary font-primary font-semibold uppercase tracking-wider block">
            Format
          </span>
          <SegmentedControl
            options={[
              { value: 'webp', label: 'WEBP' },
              { value: 'png', label: 'PNG' }
            ]}
            value={posterFormat}
            onChange={(v) => setPosterFormat(v as any)}
            size="xs"
            className="w-full"
          />
        </div>
      </div>

      {/* Options Row */}
      <div className="flex items-center justify-between pt-1">
        <Checkbox
          checked={transparentBg}
          onChange={setTransparentBg}
          label={<span className="text-xs text-ink-secondary">Transparent Background (Alpha Channel)</span>}
        />
      </div>

      {/* Action Buttons & Preview */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={handleCapturePoster}
          disabled={isCapturing}
          isLoading={isCapturing}
          icon={!isCapturing ? <Camera className="w-3.5 h-3.5 text-action" /> : undefined}
        >
          {isCapturing ? 'Capturing...' : 'Capture Current View'}
        </Button>

        {capturedPosterUrl && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleSavePoster}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Save {posterFormat.toUpperCase()}
          </Button>
        )}
      </div>

      {/* Thumbnail Preview */}
      {capturedPosterUrl && (
        <div className="flex items-center gap-3 pt-2 border-t border-hairline">
          <div className="w-14 h-14 rounded-xs bg-surface-low border border-hairline flex items-center justify-center overflow-hidden shrink-0">
            <img src={capturedPosterUrl} alt="Poster preview" className="max-w-full max-h-full object-contain" />
          </div>
          <div className="text-[11px] text-ink-secondary space-y-0.5">
            <span className="font-semibold text-ink-primary block">Thumbnail ready</span>
            <span className="font-mono tabular-nums">
              {posterRes === '1080' ? '1920×1080' : `${posterRes}×${posterRes}px`} • {posterFormat.toUpperCase()}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-mono">
              {transparentBg ? 'Transparent background' : 'Scene background'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
