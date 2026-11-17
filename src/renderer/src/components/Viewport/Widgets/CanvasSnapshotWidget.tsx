import React, { useState } from 'react';
import * as THREE from 'three';
import { Camera, Layers, Loader2, Download } from 'lucide-react';
import { useViewportStore } from '../../../store/viewportStore';
import { captureViewportSnapshot, viewportBridge } from '../../../utils/viewportBridge';

interface CanvasSnapshotWidgetProps {
  id?: string;
  mode?: 'full' | 'compressed';
  orientation?: 'horizontal' | 'vertical';
}

const RESOLUTION_OPTIONS: Array<{ id: '1080p' | '4k' | 'square' | 'viewport'; label: string; desc: string }> = [
  { id: '1080p', label: '1080p', desc: '1920 × 1080 FHD' },
  { id: '4k', label: '4K UHD', desc: '3840 × 2160 UHD' },
  { id: 'square', label: '1:1', desc: '1080 × 1080 Square' },
  { id: 'viewport', label: 'Viewport', desc: 'Current Size' }
];

export const CanvasSnapshotWidget: React.FC<CanvasSnapshotWidgetProps> = ({
  id = 'snapshot-button',
  mode: propMode,
  orientation: propOrientation
}) => {
  const storeMode = useViewportStore((s) => s.getCanvasWidgetMode(id));
  const storeOrientation = useViewportStore((s) => s.getCanvasWidgetOrientation(id));
  const mode = propMode ?? storeMode;
  const orientation = propOrientation ?? storeOrientation;

  const snapshotResolution = useViewportStore((s) => s.snapshotResolution);
  const setSnapshotResolution = useViewportStore((s) => s.setSnapshotResolution);
  const snapshotTransparent = useViewportStore((s) => s.snapshotTransparent);
  const toggleSnapshotTransparent = useViewportStore((s) => s.toggleSnapshotTransparent);
  const snapshotFormat = useViewportStore((s) => s.snapshotFormat);
  const setSnapshotFormat = useViewportStore((s) => s.setSnapshotFormat);

  const [isCapturing, setIsCapturing] = useState(false);

  const isCompressed = mode === 'compressed';
  const isVertical = isCompressed && orientation === 'vertical';

  const getCaptureDimensions = (resolution: string) => {
    switch (resolution) {
      case '4k':
        return { width: 3840, height: 2160 };
      case 'square':
        return { width: 1080, height: 1080 };
      case 'viewport': {
        const gl = viewportBridge.gl;
        if (gl) {
          const size = new THREE.Vector2();
          gl.getSize(size);
          return { width: Math.max(100, Math.round(size.x)), height: Math.max(100, Math.round(size.y)) };
        }
        return { width: 1920, height: 1080 };
      }
      case '1080p':
      default:
        return { width: 1920, height: 1080 };
    }
  };

  const handleCapture = async () => {
    try {
      setIsCapturing(true);
      const { width, height } = getCaptureDimensions(snapshotResolution);
      const snap = await captureViewportSnapshot({
        width,
        height,
        transparent: snapshotTransparent,
        format: snapshotFormat
      });

      const a = document.createElement('a');
      a.href = snap.dataUrl;
      a.download = `mirage-snapshot-${Date.now()}.${snapshotFormat}`;
      a.click();
    } catch (err) {
      console.warn('[CanvasSnapshotWidget] Snapshot capture error:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  if (isCompressed) {
    return (
      <div
        className={`flex ${isVertical ? 'flex-col w-full' : 'flex-row'} p-0 gap-0 text-xs antialiased`}
        data-testid="canvas-snapshot-compressed"
        data-orientation={orientation}
      >
        <button
          type="button"
          onClick={handleCapture}
          disabled={isCapturing}
          className={`${isVertical ? 'w-full' : 'w-11'} h-11 flex items-center justify-center border transition-colors cursor-pointer relative group bg-surface-container/30 border-hairline text-ink-secondary hover:text-action hover:bg-surface-high hover:border-hairline-strong active:bg-action/20 disabled:opacity-50`}
          title={`Capture ${snapshotFormat.toUpperCase()} image (${snapshotResolution})`}
          aria-label="Capture image"
        >
          {isCapturing ? (
            <Loader2 size={20} className="animate-spin text-action" />
          ) : (
            <Camera size={20} className="text-ink-secondary group-hover:text-action" />
          )}
        </button>

        <button
          type="button"
          onClick={toggleSnapshotTransparent}
          className={`${isVertical ? 'w-full' : 'w-11'} h-11 flex items-center justify-center border transition-colors cursor-pointer relative group ${
            snapshotTransparent
              ? 'bg-action/20 border-action text-action shadow-xs ring-1 ring-action/50'
              : 'bg-surface-container/30 border-hairline text-ink-secondary hover:text-ink-primary hover:bg-surface-high hover:border-hairline-strong'
          }`}
          title={snapshotTransparent ? 'Transparent background enabled' : 'Opaque background enabled'}
          aria-label="Toggle transparent background"
        >
          <Layers size={20} className={snapshotTransparent ? 'text-action' : 'text-ink-secondary group-hover:text-ink-primary'} />
        </button>
      </div>
    );
  }

  // Full detailed mode
  return (
    <div className="w-64 space-y-3 text-xs antialiased" data-testid="canvas-snapshot-full">
      {/* Master Capture Button */}
      <button
        type="button"
        onClick={handleCapture}
        disabled={isCapturing}
        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xs font-medium bg-action text-on-action border border-action shadow-xs hover:bg-action/90 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
      >
        {isCapturing ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <Download size={15} />
        )}
        <span>{isCapturing ? 'Capturing...' : 'Export Image'}</span>
      </button>

      {/* Resolution Selector */}
      <div className="p-2 rounded-xs bg-surface-container/30 border border-hairline space-y-1.5">
        <div className="text-[10px] text-ink-tertiary font-mono uppercase tracking-wider">Output Resolution</div>
        <div className="grid grid-cols-2 gap-1">
          {RESOLUTION_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSnapshotResolution(opt.id)}
              className={`p-1.5 text-left rounded-xs border transition-colors cursor-pointer ${
                snapshotResolution === opt.id
                  ? 'bg-action/15 border-action/40 text-action'
                  : 'bg-surface-container/40 border-hairline text-ink-secondary hover:text-ink-primary hover:bg-surface-high'
              }`}
            >
              <div className="font-semibold text-[10px] leading-tight">{opt.label}</div>
              <div className="text-[9px] opacity-75 font-mono truncate">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Format & Transparency */}
      <div className="p-2 rounded-xs bg-surface-container/30 border border-hairline space-y-2">
        {/* Format Selector */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-ink-secondary font-medium">Format</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSnapshotFormat('png')}
              className={`px-2 py-0.5 font-mono text-[10px] rounded-xs border transition-colors cursor-pointer ${
                snapshotFormat === 'png'
                  ? 'bg-action text-on-action border-action font-bold'
                  : 'bg-surface-container border-hairline text-ink-tertiary hover:text-ink-primary'
              }`}
            >
              PNG
            </button>
            <button
              type="button"
              onClick={() => setSnapshotFormat('webp')}
              className={`px-2 py-0.5 font-mono text-[10px] rounded-xs border transition-colors cursor-pointer ${
                snapshotFormat === 'webp'
                  ? 'bg-action text-on-action border-action font-bold'
                  : 'bg-surface-container border-hairline text-ink-tertiary hover:text-ink-primary'
              }`}
            >
              WEBP
            </button>
          </div>
        </div>

        {/* Transparency Toggle */}
        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-hairline/60">
          <div className="flex items-center gap-1.5 text-ink-secondary">
            <Layers size={13} />
            <span>Transparent Background</span>
          </div>
          <button
            type="button"
            onClick={toggleSnapshotTransparent}
            className={`px-2 py-0.5 font-mono text-[10px] rounded-xs border transition-colors cursor-pointer ${
              snapshotTransparent
                ? 'bg-action text-on-action border-action font-semibold'
                : 'bg-surface-container border-hairline text-ink-tertiary hover:text-ink-primary'
            }`}
          >
            {snapshotTransparent ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
    </div>
  );
};
