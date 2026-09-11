import React, { useEffect, useState, useCallback } from 'react';
import { WorkbenchView } from './components/Workbench/WorkbenchView';
import { OrmPackerModal } from './components/Staging/OrmPackerModal';
import { TopNav } from './components/Navigation/TopNav';
import { HubView } from './components/Hub/HubView';
import { LibraryView } from './components/Library/LibraryView';
import { EntryDetailView } from './components/Library/EntryDetailView';
import { SettingsView } from './components/Settings/SettingsView';
import { AgentStudioView } from './components/Agent/AgentStudioView';
import { SaveToLibraryModal } from './components/Library/SaveToLibraryModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useModelStore } from './store/modelStore';
import { usePbrMaterialStore } from './store/pbrMaterialStore';
import { useVariantStore } from './store/variantStore';
import { useAppStore, initSettingsFromFile } from './store/appStore';
import { useAgentStore } from './store/agentStore';
import { handleWorkbenchChange, flushAutoSave } from './utils/libraryBridge';
import { getSharedGltfLoader } from './components/Viewport/PBRModelViewer';

export const App: React.FC = () => {
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  const currentView = useAppStore((s) => s.currentView);
  const selectedEntryForDetail = useAppStore((s) => s.selectedEntryForDetail);
  const setView = useAppStore((s) => s.setView);

  // Warm up DRACO / GLTF loader, initialize AI agent providers and load settings from disk on startup
  useEffect(() => {
    getSharedGltfLoader().catch(() => {});
    useAgentStore.getState().init().catch(() => {});
    initSettingsFromFile().catch(() => {});
  }, []);

  // Auto-save the active library entry when workbench parameters, model,
  // textures, or the name change. All three domain stores are watched because
  // an edit can touch any of them.
  useEffect(() => {
    const unsubscribeModel = useModelStore.subscribe(() => handleWorkbenchChange());
    const unsubscribePbr = usePbrMaterialStore.subscribe(() => handleWorkbenchChange());
    const unsubscribeVariant = useVariantStore.subscribe(() => handleWorkbenchChange());

    const handleBeforeUnload = () => {
      flushAutoSave();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        flushAutoSave();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
          return;
        }
        if (useAppStore.getState().currentView === 'workbench') {
          e.preventDefault();
          useAppStore.getState().toggleWorkbenchSidebar();
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsubscribeModel();
      unsubscribePbr();
      unsubscribeVariant();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleOpenSaveModal = useCallback(() => setIsSaveModalOpen(true), []);

  return (
    <div className="flex flex-col h-screen w-full bg-canvas text-ink-primary overflow-hidden font-body antialiased select-none">
      {/* Universal Architectural Top Navigation Bar */}
      <TopNav onOpenSaveModal={handleOpenSaveModal} />

      {/* View Container */}
      <div className="flex-1 flex overflow-hidden w-full min-h-0 relative">
        {/* Workbench View (Persisted in DOM for WebGL context, frame rendering paused when not visible) */}
        <div
          className={`absolute inset-0 flex overflow-hidden w-full h-full transition-opacity duration-150 ${
            currentView === 'workbench'
              ? 'z-10 opacity-100 pointer-events-auto'
              : 'z-0 opacity-0 pointer-events-none'
          }`}
          style={{ visibility: currentView === 'workbench' ? 'visible' : 'hidden' }}
        >
          <ErrorBoundary fallbackTitle="Mesa de trabajo">
            <WorkbenchView />
          </ErrorBoundary>
        </div>

        {/* Hub View */}
        {currentView === 'hub' && (
          <div className="absolute inset-0 z-20 flex bg-canvas overflow-hidden">
            <ErrorBoundary fallbackTitle="Inicio">
              <HubView />
            </ErrorBoundary>
          </div>
        )}

        {/* Library View */}
        {currentView === 'library' && (
          <div className="absolute inset-0 z-20 flex bg-canvas overflow-hidden">
            <ErrorBoundary fallbackTitle="Biblioteca">
              <LibraryView />
            </ErrorBoundary>
          </div>
        )}

        {/* Entry Detail View (Split 1/3 - 2/3) */}
        {currentView === 'entryDetail' && (
          <div className="absolute inset-0 z-20 flex bg-canvas overflow-hidden">
            <ErrorBoundary fallbackTitle="Detalle de pieza">
              <EntryDetailView
                entry={selectedEntryForDetail}
                onBack={() => setView('library')}
              />
            </ErrorBoundary>
          </div>
        )}

        {/* Settings View */}
        {currentView === 'settings' && (
          <div className="absolute inset-0 z-20 flex bg-canvas overflow-hidden">
            <ErrorBoundary fallbackTitle="Configuración">
              <SettingsView />
            </ErrorBoundary>
          </div>
        )}

        {/* Agent Studio View */}
        {currentView === 'agent' && (
          <div className="absolute inset-0 z-20 flex bg-canvas overflow-hidden">
            <ErrorBoundary fallbackTitle="Estudio IA">
              <AgentStudioView />
            </ErrorBoundary>
          </div>
        )}
      </div>

      {/* Global Sharp ORM Texture Packer Dialog Modal */}
      <ErrorBoundary fallbackTitle="Empaquetador ORM">
        <OrmPackerModal />
      </ErrorBoundary>

      {/* Save Current Workbench State to Library Modal */}
      <ErrorBoundary fallbackTitle="Guardar en biblioteca">
        <SaveToLibraryModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
        />
      </ErrorBoundary>
    </div>
  );
};
