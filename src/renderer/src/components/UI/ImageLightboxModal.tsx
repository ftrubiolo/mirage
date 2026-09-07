import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  FileImage
} from 'lucide-react';

export interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string | null;
  title?: string;
  subtitle?: string;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
  subtitle
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset zoom & pan when opening a new image
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setIsDragging(false);
    }
  }, [isOpen, imageUrl]);

  // Handle keyboard shortcuts (Escape to close, +/- to zoom, 0 to reset)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        handleResetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(8, +(prev * 1.25).toFixed(2)));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(0.2, +(prev / 1.25).toFixed(2)));
  };

  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Zoom via mouse wheel centered on cursor
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setScale((prev) => {
      const next = Math.max(0.2, Math.min(8, +(prev * zoomFactor).toFixed(2)));
      return next;
    });
  };

  // Drag pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click drags
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      });
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Double click to toggle between fit (1.0) and 2.0x zoom
  const handleDoubleClick = () => {
    if (scale > 1.2) {
      handleResetZoom();
    } else {
      setScale(2.0);
    }
  };

  if (!isOpen || !imageUrl) return null;

  return createPortal(
    <div
      ref={containerRef}
      onClick={onClose}
      onWheel={handleWheel}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col select-none animate-in fade-in duration-150"
    >
      {/* Top Floating Header Bar */}
      <header
        onClick={(e) => e.stopPropagation()}
        className="px-6 py-3 border-b border-white/10 bg-black/60 backdrop-blur-md flex items-center justify-between text-white shrink-0 z-10"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
          <div className="p-1.5 rounded-xs bg-white/10 text-white shrink-0">
            <FileImage className="w-4 h-4" />
          </div>
          <div className="truncate min-w-0">
            <h3 className="font-primary font-bold text-xs uppercase tracking-wider text-white truncate">
              {title || 'Inspección de Textura PBR'}
            </h3>
            {subtitle && (
              <p className="font-mono text-[10px] text-white/60 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Zoom & Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-xs bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Alejar Zoom (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            onClick={handleResetZoom}
            className="px-2 py-1 rounded-xs bg-white/10 hover:bg-white/20 text-white font-mono text-xs tabular-nums transition-colors cursor-pointer min-w-[54px] text-center"
            title="Restablecer escala 1:1 (0)"
          >
            {Math.round(scale * 100)}%
          </button>

          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-xs bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Acercar Zoom (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-white/20 mx-1" />

          <button
            onClick={handleDoubleClick}
            className="p-1.5 rounded-xs bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Alternar Vista Rápida 200% (Doble clic)"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-white/20 mx-1" />

          <button
            onClick={onClose}
            className="p-1.5 rounded-xs bg-white/10 hover:bg-rose-500/80 text-white transition-colors cursor-pointer"
            title="Cerrar visor (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Canvas Viewport Area */}
      <main
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        className={`flex-1 relative overflow-hidden flex items-center justify-center ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          backgroundImage:
            'linear-gradient(45deg, rgba(255,255,255,0.04) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,0.04) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.04) 75%), linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.04) 75%)',
          backgroundSize: '24px 24px',
          backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0px'
        }}
      >
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.08s ease-out'
          }}
          className="max-w-full max-h-full flex items-center justify-center pointer-events-none will-change-transform"
        >
          <img
            src={imageUrl}
            alt={title || 'Textura PBR'}
            draggable={false}
            className="max-h-[82vh] max-w-[85vw] object-contain rounded-xs shadow-2xl border border-white/10 select-none pointer-events-none"
          />
        </div>

        {/* Floating Hint Overlay at Bottom */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-xs bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-mono text-white/70 pointer-events-none">
          Arrastra para mover • Rueda para zoom • Doble clic para 200% • Esc para cerrar
        </div>
      </main>
    </div>,
    document.body
  );
};
