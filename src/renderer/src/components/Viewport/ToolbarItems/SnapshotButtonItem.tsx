import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import { captureViewportSnapshot } from '../../../utils/viewportBridge';

export const SnapshotButtonItem: React.FC = () => {
  const [isCapturing, setIsCapturing] = useState(false);

  const handleTakeSnapshot = async () => {
    try {
      setIsCapturing(true);
      const snap = await captureViewportSnapshot({
        width: 1920,
        height: 1080,
        transparent: false,
        format: 'png'
      });
      const a = document.createElement('a');
      a.href = snap.dataUrl;
      a.download = `mirage-snapshot-${Date.now()}.png`;
      a.click();
    } catch (err) {
      console.warn('[ViewportToolbar] Snapshot capture error:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <button
      onClick={handleTakeSnapshot}
      disabled={isCapturing}
      title="Capture high-resolution PNG image (1920×1080)"
      className="p-1.5 rounded-xs transition-colors text-ink-secondary hover:text-ink-primary hover:bg-surface-container border border-transparent cursor-pointer disabled:opacity-50"
    >
      <Camera className="w-3.5 h-3.5" />
    </button>
  );
};
