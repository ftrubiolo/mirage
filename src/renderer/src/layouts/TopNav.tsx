import React, { useState, useEffect, useRef } from 'react';
import { BookmarkPlus, Save } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useModelStore } from '../store/modelStore';
import { flushAutoSave } from '../utils/libraryBridge';
import { IconButton } from '../components/UI/IconButton';

interface TopNavProps {
  onOpenSaveModal?: () => void;
}

export const TopNav: React.FC<TopNavProps> = React.memo(({ onOpenSaveModal }) => {
  const {
    currentView,
    setView,
    activeEntrySlug,
    isAutoSaving,
    lastAutoSavedAt
  } = useAppStore();

  const productName = useModelStore((s) => s.productName);
  const setProductMeta = useModelStore((s) => s.setProductMeta);

  const [justSaved, setJustSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isAutoSaving && lastAutoSavedAt) {
      setJustSaved(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setJustSaved(false);
        timerRef.current = null;
      }, 1000);
    }
  }, [isAutoSaving, lastAutoSavedAt]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleForceSave = async () => {
    await flushAutoSave();
  };

  const openSaveModal = useAppStore((s) => s.openSaveModal);
  const handleSaveModal = onOpenSaveModal || openSaveModal;

  return (
    <header className="h-12 border-b border-hairline bg-surface-low px-4 flex items-center justify-between shrink-0 select-none z-30">
      {/* Left: Brand Monogram (Clicking takes user to Hub) */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setView('hub')}
          className="flex items-center gap-2 group cursor-pointer focus:outline-none"
          title="Go to Mirage Hub / Home"
        >
          <div className="h-6 px-2 rounded-xs bg-action text-white font-primary font-bold text-xs tracking-wider flex items-center justify-center uppercase shadow-xs group-hover:bg-action-hover transition-colors">
            3D
          </div>
          <span className="font-primary font-semibold text-xs tracking-wider uppercase text-ink-primary group-hover:text-action transition-colors hidden sm:inline">
            MIRAGE
          </span>
        </button>
      </div>

      {/* Right: Entry Name and Save Controls (Visible in workbench) */}
      <div className="flex items-center gap-2 text-xs">
        {currentView === 'workbench' && (
          <>
            {activeEntrySlug ? (
              <div className="flex items-center gap-1.5 max-w-[320px]">
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductMeta(activeEntrySlug, e.target.value)}
                  placeholder="Model name"
                  title="Click to rename model (auto-save active)"
                  className="bg-transparent hover:bg-surface-container/50 focus:bg-surface-lowest px-2 py-0.5 rounded-xs border border-transparent hover:border-hairline focus:border-action font-primary font-bold text-xs text-ink-primary truncate focus:outline-none transition-colors"
                />
                {/* Always Visible Floppy Disk Button (Interactive & Animated) */}
                <button
                  onClick={handleForceSave}
                  disabled={isAutoSaving}
                  title={
                    isAutoSaving
                      ? 'Saving changes to disk...'
                      : justSaved
                      ? `Saved to disk${lastAutoSavedAt ? ` at ${lastAutoSavedAt}` : ''}`
                      : 'Save changes to disk (Click to force save)'
                  }
                  className={`p-1.5 rounded-xs transition-all border flex items-center justify-center cursor-pointer ${
                    isAutoSaving
                      ? 'bg-action/10 border-action text-action animate-pulse'
                      : justSaved
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-xs'
                      : 'border-transparent text-ink-secondary hover:text-ink-primary hover:bg-surface-container hover:border-hairline'
                  }`}
                >
                  <Save className={`w-3.5 h-3.5 ${isAutoSaving ? 'animate-spin' : ''}`} />
                </button>
              </div>
            ) : (
              /* NOT working on a library item: Save button as ICON ONLY */
              <IconButton
                variant="primary"
                size="sm"
                onClick={handleSaveModal}
                icon={<BookmarkPlus className="w-4 h-4" />}
                title="Save to Library"
              />
            )}
          </>
        )}
      </div>
    </header>
  );
});
