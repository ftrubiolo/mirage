import React, { useState } from 'react';
import {
  Box,
  Palette,
  PackageCheck
} from 'lucide-react';
import { Canvas3D } from '../components/Viewport/Canvas3D';
import { PbrMapsStudio } from '../components/Staging/PbrMapsStudio';
import { GeometryStudio } from '../components/Staging/GeometryStudio';
import { ExportStudio } from '../components/Export/ExportStudio';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ResizeHandle, ResizeDragOverlay, SegmentedControl } from '../components/UI';
import { useAppStore } from '../store/appStore';
import { useResizableSidebar } from '../hooks/useResizableSidebar';

export const WorkbenchView: React.FC = () => {
  const [workbenchTab, setWorkbenchTab] = useState<'maps' | 'model' | 'export'>('maps');

  const {
    workbenchSidebarWidth,
    workbenchSidebarPosition,
    isWorkbenchSidebarCollapsed,
    setWorkbenchSidebarWidth,
    setWorkbenchSidebarCollapsed,
    toggleWorkbenchSidebar
  } = useAppStore();

  const isLeftSidebar = workbenchSidebarPosition === 'left';

  const {
    width: sidebarWidth,
    isDragging,
    handleMouseDown: handleResizeMouseDown,
    handleReset: handleResetWidth
  } = useResizableSidebar({
    defaultWidth: 460,
    minWidth: 340,
    maxWidth: () => Math.max(340, Math.min(840, window.innerWidth - 380)),
    side: workbenchSidebarPosition,
    width: workbenchSidebarWidth,
    onWidthChange: setWorkbenchSidebarWidth,
    collapsible: true,
    isCollapsed: isWorkbenchSidebarCollapsed,
    onCollapseChange: setWorkbenchSidebarCollapsed,
    collapseThreshold: 60
  });

  const sidebarElement = (
    <aside
      style={{
        width: isWorkbenchSidebarCollapsed ? 0 : `${sidebarWidth}px`
      }}
      className={`bg-surface-lowest flex flex-col shrink-0 min-h-0 relative ${
        isLeftSidebar ? 'border-r border-hairline' : 'border-l border-hairline'
      } ${isDragging ? 'select-none' : ''} ${
        isWorkbenchSidebarCollapsed ? (isLeftSidebar ? 'border-r-0' : 'border-l-0') + ' overflow-hidden pointer-events-none' : ''
      }`}
    >
      {/* Drag Resize Handle */}
      {!isWorkbenchSidebarCollapsed && (
        <ResizeHandle
          position={isLeftSidebar ? 'right' : 'left'}
          isDragging={isDragging}
          onMouseDown={handleResizeMouseDown}
          onDoubleClick={handleResetWidth}
          title="Arrastra para redimensionar (Doble clic para restablecer 460px)"
        />
      )}

      {/* Navigation Tabs */}
      <nav className="flex border-b border-hairline bg-surface-low h-9 shrink-0 select-none items-center">
        <SegmentedControl
          value={workbenchTab}
          onChange={(val) => setWorkbenchTab(val as 'maps' | 'model' | 'export')}
          options={[
            { value: 'maps', label: 'Mapas PBR', icon: <Palette className="w-3.5 h-3.5" /> },
            { value: 'model', label: 'Geometría', icon: <Box className="w-3.5 h-3.5" /> },
            { value: 'export', label: 'Exportación', icon: <PackageCheck className="w-3.5 h-3.5" /> }
          ]}
          variant="surface"
          size="sm"
          className="w-full"
        />
      </nav>

      {/* Tab Content Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className={workbenchTab === 'maps' ? 'space-y-4' : 'hidden'}>
          <PbrMapsStudio />
        </div>

        <div className={workbenchTab === 'model' ? 'space-y-4' : 'hidden'}>
          <GeometryStudio />
        </div>

        <div className={workbenchTab === 'export' ? 'space-y-4' : 'hidden'}>
          <ExportStudio />
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex w-full h-full overflow-hidden relative">
      {/* Render sidebar on left when position is left */}
      {isLeftSidebar && sidebarElement}

      {/* 3D Viewport Area */}
      <main className="flex-1 relative bg-canvas min-w-0 min-h-0">
        <ErrorBoundary fallbackTitle="Visor 3D Atelier">
          <Canvas3D />
        </ErrorBoundary>
      </main>

      {/* Render sidebar on right when position is right */}
      {!isLeftSidebar && sidebarElement}

      {/* Fullscreen transparent overlay while dragging to prevent pointer capture */}
      {isDragging && <ResizeDragOverlay />}
    </div>
  );
};
