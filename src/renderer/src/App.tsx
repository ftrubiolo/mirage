import React, { useEffect, useState } from 'react';
import {
  Box,
  Palette,
  PackageCheck
} from 'lucide-react';
import { Canvas3D } from './components/Viewport/Canvas3D';
import { getSharedGltfLoader } from './components/Viewport/PBRModelViewer';
import { PbrMapsStudio } from './components/Staging/PbrMapsStudio';
import { ModelDropZone } from './components/Staging/ModelDropZone';
import { ExportStudio } from './components/Export/ExportStudio';
import { OrmPackerModal } from './components/Staging/OrmPackerModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TopNav } from './components/Navigation/TopNav';
import { HubView } from './components/Hub/HubView';
import { LibraryView } from './components/Library/LibraryView';
import { EntryDetailView } from './components/Library/EntryDetailView';
import { SettingsView } from './components/Settings/SettingsView';
import { SaveToLibraryModal } from './components/Library/SaveToLibraryModal';
import { useWorkbenchStore } from './store/workbenchStore';
import { useAppStore } from './store/appStore';
import { handleWorkbenchChange, flushAutoSave } from './utils/libraryBridge';

export const App: React.FC = () => {
  const [workbenchTab, setWorkbenchTab] = useState<'maps' | 'model' | 'export'>('maps');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  const { currentView } = useAppStore();
  const { setModel } = useWorkbenchStore();

  // Warm up DRACO / GLTF loader in the background at startup
  useEffect(() => {
    getSharedGltfLoader().catch(() => {});
  }, []);

  // Auto-save active library entry when user changes workbench parameters, model, textures, or name
  useEffect(() => {
    const unsubscribe = useWorkbenchStore.subscribe((state) => {
      handleWorkbenchChange(state);
    });

    const handleBeforeUnload = () => {
      flushAutoSave();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        flushAutoSave();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen w-full bg-canvas text-ink-primary overflow-hidden font-body antialiased select-none">
      {/* Universal Architectural Top Navigation Bar */}
      <TopNav onOpenSaveModal={() => setIsSaveModalOpen(true)} />

      {/* View Container */}
      <div className="flex-1 flex overflow-hidden w-full min-h-0 relative">
        {/* Workbench View (Kept continuously active in DOM to prevent WebGL context lost & cold HDR/PMREM initialization freezes) */}
        <div
          className={`absolute inset-0 flex overflow-hidden w-full h-full ${
            currentView === 'workbench'
              ? 'z-10 opacity-100 pointer-events-auto'
              : 'z-0 opacity-0 pointer-events-none'
          }`}
        >
          {/* Left: 3D Viewport */}
          <main className="flex-1 relative bg-canvas min-w-0 min-h-0">
            <ErrorBoundary fallbackTitle="Visor 3D Atelier">
              <Canvas3D />
            </ErrorBoundary>
          </main>

          {/* Right: Dedicated PBR Maps Studio Sidebar */}
          <aside className="w-[460px] max-w-[48vw] border-l border-hairline bg-surface-lowest flex flex-col shrink-0 min-h-0">
            {/* Navigation Tabs */}
            <nav className="flex border-b border-hairline bg-surface-low p-1 gap-1 shrink-0 select-none">
              <button
                onClick={() => setWorkbenchTab('maps')}
                className={`flex-1 py-1.5 rounded-xs text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  workbenchTab === 'maps'
                    ? 'bg-surface-container text-action font-semibold shadow-xs border border-hairline'
                    : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-high/40'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Mapas PBR</span>
              </button>

              <button
                onClick={() => setWorkbenchTab('model')}
                className={`flex-1 py-1.5 rounded-xs text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  workbenchTab === 'model'
                    ? 'bg-surface-container text-action font-semibold shadow-xs border border-hairline'
                    : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-high/40'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>Geometría .GLB</span>
              </button>

              <button
                onClick={() => setWorkbenchTab('export')}
                className={`flex-1 py-1.5 rounded-xs text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  workbenchTab === 'export'
                    ? 'bg-surface-container text-action font-semibold shadow-xs border border-hairline'
                    : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-high/40'
                }`}
              >
                <PackageCheck className="w-3.5 h-3.5" />
                <span>Exportación</span>
              </button>
            </nav>

            {/* Tab Content Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {workbenchTab === 'maps' && <PbrMapsStudio />}

              {workbenchTab === 'model' && (
                <div className="space-y-4">
                  <ModelDropZone />
                </div>
              )}

              {workbenchTab === 'export' && (
                <ExportStudio />
              )}
            </div>
          </aside>
        </div>

        {/* Hub View */}
        {currentView === 'hub' && (
          <div className="absolute inset-0 z-20 flex bg-canvas overflow-hidden">
            <HubView />
          </div>
        )}

        {/* Library View */}
        {currentView === 'library' && (
          <div className="absolute inset-0 z-20 flex bg-canvas overflow-hidden">
            <LibraryView />
          </div>
        )}

        {/* Entry Detail View (Split 1/3 - 2/3) */}
        {currentView === 'entryDetail' && (
          <div className="absolute inset-0 z-20 flex bg-canvas overflow-hidden">
            <EntryDetailView
              entry={useAppStore.getState().selectedEntryForDetail}
              onBack={() => useAppStore.getState().setView('library')}
            />
          </div>
        )}

        {/* Settings View */}
        {currentView === 'settings' && (
          <div className="absolute inset-0 z-20 flex bg-canvas overflow-hidden">
            <SettingsView />
          </div>
        )}
      </div>

      {/* Global Sharp ORM Texture Packer Dialog Modal */}
      <OrmPackerModal />

      {/* Save Current Workbench State to Library Modal */}
      <SaveToLibraryModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
      />
    </div>
  );
};
