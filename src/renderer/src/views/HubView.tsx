import React, { useState, useEffect } from 'react';
import {
  Library,
  Settings,
  ArrowRight,
  Clock
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useModelStore } from '../store/modelStore';
import { LibraryEntry } from '../types/library';
import { loadEntryIntoWorkbench, resetWorkbench } from '../utils/libraryBridge';
import {
  Button,
  PortalCard,
  PortalCardProps,
  PieceCard,
  EmptyState,
  SectionHeader,
  Spinner,
  Badge,
  MirageLogo,
  MetrologyTriadIcon
} from '../components/UI';

interface HubViewProps {
  onOpenNewPieceModal?: () => void;
}

export const HubView: React.FC<HubViewProps> = () => {
  const { setView } = useAppStore();
  const productName = useModelStore((s) => s.productName);
  const modelFilePath = useModelStore((s) => s.modelFilePath);

  const [recentEntries, setRecentEntries] = useState<LibraryEntry[]>([]);
  const [isLoadingRecents, setIsLoadingRecents] = useState(true);
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecents = async () => {
      try {
        if (window.electronAPI) {
          const list = await window.electronAPI.listLibraryEntries();
          if (list && Array.isArray(list)) {
            // Sort by updatedAt descending
            const sorted = [...list].sort(
              (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
            );
            setRecentEntries(sorted.slice(0, 6));
          }
        }
      } catch (err) {
        console.warn('Failed to load recent entries:', err);
      } finally {
        setIsLoadingRecents(false);
      }
    };

    fetchRecents();
  }, []);

  const handleOpenEmptyWorkbench = () => {
    resetWorkbench();
    setView('workbench');
  };

  const handleOpenExistingWorkbench = () => {
    setView('workbench');
  };

  const handleLoadRecent = async (entry: LibraryEntry) => {
    try {
      setLoadingSlug(entry.slug);
      await loadEntryIntoWorkbench(entry);
    } finally {
      setLoadingSlug(null);
    }
  };

  const portals: (PortalCardProps & { id: string })[] = [
    {
      id: 'workbench',
      icon: <MetrologyTriadIcon size={20} className="text-ink-primary" />,
      title: '3D Workbench',
      description:
        'Real-time PBR rendering canvas, metric scale calibration, and Sharp ORM texture packing.',
      actionText: 'Open Workbench',
      onClick: handleOpenEmptyWorkbench,
    },
    {
      id: 'library',
      icon: <Library className="w-5 h-5 text-action" />,
      title: 'Model Library',
      description:
        'Local asset catalog with .GLB models, slot-based PBR textures, snapshots, and variant tracking.',
      actionText: 'Browse Library',
      onClick: () => setView('library')
    },
    {
      id: 'settings',
      icon: <Settings className="w-5 h-5 text-action" />,
      title: 'Studio Settings',
      description:
        'Display theme (Dark/Light/System), typography density scale, keybinds, and storage paths.',
      actionText: 'Preferences',
      onClick: () => setView('settings')
    }
  ];

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full w-full bg-canvas text-ink-primary overflow-hidden select-none">
      {/* 1/3 Left Panel: Title Container (vertically centered, left-aligned) & Action Button (bottom) */}
      <div className="w-full lg:w-1/3 xl:w-[32%] bg-surface-lowest border-b lg:border-b-0 lg:border-r border-hairline flex flex-col justify-between p-8 lg:p-10 shrink-0 select-none">
        {/* Center Vertically: Left-aligned Title & Subtitle */}
        <div className="flex-1 flex flex-col justify-center items-start text-left w-full space-y-4 py-8">
          {/* Top Tag: 3D STUDIO WORKBENCH */}
          <div className="flex items-center gap-2.5">
            <MirageLogo size={28} className="text-ink-primary shrink-0" />
            <Badge variant="action">3D</Badge>
            <span className="text-xs font-mono text-ink-secondary uppercase tracking-wider">
              Studio Workbench
            </span>
          </div>

          {/* Large Architectural Typography: MIRAGE */}
          <h1 className="font-primary font-black text-6xl sm:text-7xl xl:text-8xl tracking-tighter uppercase text-ink-primary leading-none">
            MIRAGE
          </h1>

          {/* Subtitle */}
          <p className="text-xs text-ink-secondary font-body leading-relaxed max-w-sm">
            Geometric verification, PBR texture packing, and multi-variant 3D asset management for web &amp; AR.
          </p>
        </div>

        {/* Bottom: Active Model Button pushed down */}
        {modelFilePath && (
          <div className="w-full shrink-0 pt-4">
            <div className="p-3.5 bg-surface-low border border-hairline rounded-xs flex items-center justify-between gap-3 text-left shadow-xs">
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] uppercase font-primary font-semibold text-ink-tertiary tracking-wider block">
                  Active Model
                </span>
                <span
                  className="font-primary font-bold text-xs text-ink-primary truncate max-w-[150px] block"
                  title={productName}
                >
                  {productName || 'Untitled'}
                </span>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenExistingWorkbench}
                iconRight={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Resume
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 2/3 Right Panel: 3 Action Cards & Recent Entries */}
      <div className="flex-1 h-full overflow-y-auto p-6 lg:p-10 min-w-0">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Three Primary Portals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {portals.map((portal) => (
              <PortalCard
                key={portal.id}
                icon={portal.icon}
                title={portal.title}
                description={portal.description}
                actionText={portal.actionText}
                onClick={portal.onClick}
                accentIcon={portal.accentIcon}
              />
            ))}
          </div>

          {/* Recent Models Section */}
          <div className="space-y-4 pt-2">
            <SectionHeader
              title="Recent 3D Models"
              icon={<Clock className="w-4 h-4" />}
              action={
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setView('library')}
                  iconRight={<ArrowRight className="w-3.5 h-3.5" />}
                  className="text-action hover:text-action-hover"
                >
                  View Full Catalog
                </Button>
              }
            />

            {isLoadingRecents ? (
              <div className="p-8 text-center">
                <Spinner size="md" label="Loading recent models..." />
              </div>
            ) : recentEntries.length === 0 ? (
              <EmptyState
                description="No models registered in the library yet. Start by loading a model in the 3D Workbench or creating a new entry."
                action={
                  <>
                    <Button variant="secondary" onClick={handleOpenEmptyWorkbench}>
                      Open Empty Workbench
                    </Button>
                    <Button variant="primary" onClick={() => setView('library')}>
                      Go to Library
                    </Button>
                  </>
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {recentEntries.map((entry) => (
                  <PieceCard
                    key={entry.slug}
                    title={entry.title}
                    slug={entry.slug}
                    posterUrl={entry.posterUrl}
                    stats={entry.stats}
                    isLoading={loadingSlug === entry.slug}
                    onClick={() => handleLoadRecent(entry)}
                    compact
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
