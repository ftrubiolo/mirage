import React, { useState } from 'react';
import {
  Box,
  Palette,
  PackageCheck,
  PanelRightClose,
  PanelRightOpen
} from 'lucide-react';
import { Canvas3D } from '../Viewport/Canvas3D';
import { PbrMapsStudio } from '../Staging/PbrMapsStudio';
import { ModelDropZone } from '../Staging/ModelDropZone';
import { ExportStudio } from '../Export/ExportStudio';
import { ErrorBoundary } from '../ErrorBoundary';
import { ResizeHandle, ResizeDragOverlay } from '../UI/ResizeHandle';
import { useAppStore } from '../../store/appStore';
import { useResizableSidebar } from '../../hooks/useResizableSidebar';

export const WorkbenchView: React.FC = () => {
  const [workbenchTab, setWorkbenchTab] = useState<'maps' | 'model' | 'export'>('maps');

  const {
    workbenchSidebarWidth,
    isWorkbenchSidebarCollapsed,
    setWorkbenchSidebarWidth,
    setWorkbenchSidebarCollapsed,
    toggleWorkbenchSidebar
  } = useAppStore();

  const {
    width: sidebarWidth,
    isDragging,
    handleMouseDown: handleResizeMouseDown,
    handleReset: handleResetWidth
  } = useResizableSidebar({
    defaultWidth: 460,
    minWidth: 340,
    maxWidth: () => Math.max(340, Math.min(840, window.innerWidth - 380)),
    side: 'right',
    width: workbenchSidebarWidth,
    onWidthChange: setWorkbenchSidebarWidth,
    collapsible: true,
    isCollapsed: isWorkbenchSidebarCollapsed,
    onCollapseChange: setWorkbenchSidebarCollapsed,
    collapseThreshold: 60
  });

  return (
    <div className="flex w-full h-full overflow-hidden relative">
      {/* Left: 3D Viewport Area */}
      <main className="flex-1 relative bg-canvas min-w-0 min-h-0">
        <ErrorBoundary fallbackTitle="Visor 3D Atelier">
          <Canvas3D />
        </ErrorBoundary>

        {isWorkbenchSidebarCollapsed && (
          <button
            onClick={toggleWorkbenchSidebar}
            className="absolute top-4 right-4 z-20 px-2.5 py-1.5 rounded-xs bg-surface-lowest/90 hover:bg-surface-lowest border border-hairline shadow-md text-ink-secondary hover:text-action transition-all cursor-pointer flex items-center gap-2 backdrop-blur-xs group animate-in fade-in zoom-in-95 duration-100"
            title="Mostrar panel lateral de taller (Ctrl+B)"
          >
            <PanelRightOpen className="w-4 h-4 group-hover:scale-105 transition-transform" />
          </button>
        )}
      </main>

      {/* Right: Dedicated PBR Maps Studio Sidebar (Resizable & Collapsible) */}
      <aside
        style={{
          width: isWorkbenchSidebarCollapsed ? 0 : `${sidebarWidth}px`
        }}
        className={`border-l border-hairline bg-surface-lowest flex flex-col shrink-0 min-h-0 relative ${
          isDragging ? 'select-none' : ''
        } ${isWorkbenchSidebarCollapsed ? 'border-l-0 overflow-hidden pointer-events-none' : ''}`}
      >
        {/* Drag Resize Handle (Left edge) */}
        {!isWorkbenchSidebarCollapsed && (
          <ResizeHandle
            position="left"
            isDragging={isDragging}
            onMouseDown={handleResizeMouseDown}
            onDoubleClick={handleResetWidth}
            title="Arrastra para redimensionar (Doble clic para restablecer 460px)"
          />
        )}

        {/* Navigation Tabs */}
        <nav className="flex border-b border-hairline bg-surface-low p-1 gap-1 shrink-0 select-none items-center">
          <button
            onClick={() => setWorkbenchTab('maps')}
            className={`flex-1 py-1.5 rounded-xs text-xs font-medium flex items-center justify-center gap-1.5 transition-colors min-w-0 ${
              workbenchTab === 'maps'
                ? 'bg-surface-container text-action font-semibold shadow-xs border border-hairline'
                : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-high/40'
            }`}
          >
            <Palette className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Mapas PBR</span>
          </button>

          <button
            onClick={() => setWorkbenchTab('model')}
            className={`flex-1 py-1.5 rounded-xs text-xs font-medium flex items-center justify-center gap-1.5 transition-colors min-w-0 ${
              workbenchTab === 'model'
                ? 'bg-surface-container text-action font-semibold shadow-xs border border-hairline'
                : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-high/40'
            }`}
          >
            <Box className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Geometría .GLB</span>
          </button>

          <button
            onClick={() => setWorkbenchTab('export')}
            className={`flex-1 py-1.5 rounded-xs text-xs font-medium flex items-center justify-center gap-1.5 transition-colors min-w-0 ${
              workbenchTab === 'export'
                ? 'bg-surface-container text-action font-semibold shadow-xs border border-hairline'
                : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-high/40'
            }`}
          >
            <PackageCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Exportación</span>
          </button>

          <div className="w-px h-4 bg-hairline mx-0.5 shrink-0" />

          <button
            onClick={() => setWorkbenchSidebarCollapsed(true)}
            className="p-1.5 rounded-xs hover:bg-surface-high text-ink-tertiary hover:text-ink-primary transition-colors cursor-pointer shrink-0"
            title="Colapsar panel lateral (Ctrl+B)"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        </nav>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className={workbenchTab === 'maps' ? 'space-y-4' : 'hidden'}>
            <PbrMapsStudio />
          </div>

          <div className={workbenchTab === 'model' ? 'space-y-4' : 'hidden'}>
            <ModelDropZone />
          </div>

          <div className={workbenchTab === 'export' ? 'space-y-4' : 'hidden'}>
            <ExportStudio />
          </div>
        </div>
      </aside>

      {/* Fullscreen transparent overlay while dragging to prevent pointer capture */}
      {isDragging && <ResizeDragOverlay />}
    </div>
  );
};
