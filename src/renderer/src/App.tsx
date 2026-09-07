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
import { useWorkbenchStore } from './store/workbenchStore';
import { useAppStore, initSettingsFromFile } from './store/appStore';
import { useAgentStore } from './store/agentStore';
import { handleWorkbenchChange, flushAutoSave } from './utils/libraryBridge';
import { getSharedGltfLoader } from './components/Viewport/PBRModelViewer';

export const App: React.FC = () => {
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  const { currentView } = useAppStore();
  const { setModel: _setModel } = useWorkbenchStore();

  // Warm up DRACO / GLTF loader, initialize AI agent providers and load settings from disk on startup
  useEffect(() => {
    getSharedGltfLoader().catch(() => {});
    useAgentStore.getState().init().catch(() => {});
    initSettingsFromFile().catch(() => {});
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
      unsubscribe();
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
          <WorkbenchView />
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

        {/* Agent Studio View */}
        {currentView === 'agent' && (
          <div className="absolute inset-0 z-20 flex bg-canvas overflow-hidden">
            <AgentStudioView />
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
