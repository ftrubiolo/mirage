import React, { useState } from 'react';
import {
  Box,
  Palette,
  PackageCheck,
  PanelRightClose,
  PanelRightOpen
} from 'lucide-react';
import { Canvas3D } from '../components/Viewport/Canvas3D';
import { PbrMapsStudio } from '../components/Staging/PbrMapsStudio';
import { ModelDropZone } from '../components/Staging/ModelDropZone';
import { ExportStudio } from '../components/Export/ExportStudio';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ResizeHandle, ResizeDragOverlay, SegmentedControl, IconButton } from '../components/UI';
import { useAppStore } from '../store/appStore';
import { useResizableSidebar } from '../hooks/useResizableSidebar';

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
          <IconButton
            icon={<PanelRightOpen className="w-4 h-4" />}
            size="md"
            variant="secondary"
            onClick={toggleWorkbenchSidebar}
            title="Mostrar panel lateral de taller (Ctrl+B)"
            className="absolute top-4 right-4 z-20 shadow-md backdrop-blur-xs"
          />
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
        <nav className="flex border-b border-hairline bg-surface-low p-1.5 gap-1.5 shrink-0 select-none items-center">
          <SegmentedControl
            value={workbenchTab}
            onChange={(val) => setWorkbenchTab(val as 'maps' | 'model' | 'export')}
            options={[
              { value: 'maps', label: 'Mapas PBR', icon: <Palette className="w-3.5 h-3.5" /> },
              { value: 'model', label: 'Geometría .GLB', icon: <Box className="w-3.5 h-3.5" /> },
              { value: 'export', label: 'Exportación', icon: <PackageCheck className="w-3.5 h-3.5" /> }
            ]}
            variant="surface"
            size="sm"
            className="flex-1"
          />

          <IconButton
            icon={<PanelRightClose className="w-4 h-4" />}
            size="sm"
            variant="ghost"
            onClick={() => setWorkbenchSidebarCollapsed(true)}
            title="Colapsar panel lateral (Ctrl+B)"
          />
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
