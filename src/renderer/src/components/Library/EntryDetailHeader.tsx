import React from 'react';
import { ArrowLeft, ArrowUpRight, FolderOpen } from 'lucide-react';
import { Button } from '../UI';

export interface EntryDetailHeaderProps {
  title: string;
  slug: string;
  isLoading: boolean;
  onBack: () => void;
  onOpenFolder: () => void;
  onOpenIn3D: () => void;
}

export const EntryDetailHeader: React.FC<EntryDetailHeaderProps> = ({
  title,
  slug,
  isLoading,
  onBack,
  onOpenFolder,
  onOpenIn3D
}) => {
  return (
    <div className="border-b border-hairline bg-surface-low px-6 py-3 shrink-0 flex flex-row items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="secondary"
          size="sm"
          onClick={onBack}
          icon={<ArrowLeft className="w-3.5 h-3.5" />}
          title="Back to library overview"
        >
          <span className="hidden sm:inline">Library</span>
        </Button>

        <div className="h-4 w-px bg-hairline" />

        <div className="flex items-center gap-2 min-w-0">
          <h1 className="font-primary font-bold text-base tracking-tight uppercase text-ink-primary truncate">
            {title}
          </h1>
          <span className="font-mono text-[11px] text-ink-secondary bg-surface-container px-2 py-0.5 rounded-xs border border-hairline hidden md:inline truncate">
            {slug}
          </span>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenFolder}
          icon={<FolderOpen className="w-3.5 h-3.5 text-action" />}
          title="Open folder in file explorer"
        >
          <span className="hidden sm:inline">Folder</span>
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={onOpenIn3D}
          isLoading={isLoading}
          iconRight={<ArrowUpRight className="w-3.5 h-3.5" />}
        >
          Open in 3D Workbench
        </Button>
      </div>
    </div>
  );
};
