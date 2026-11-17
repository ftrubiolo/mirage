import React from 'react';
import { Library, Sparkles, Settings } from 'lucide-react';
import { useAppStore, AppView } from '../store/appStore';
import { IconButton, MetrologyTriadIcon } from '../components/UI';

interface NavButtonConfig {
  id: AppView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const WorkbenchNavIcon: React.FC<{ className?: string }> = ({ className }) => (
  <MetrologyTriadIcon size={16} className={className} />
);

export const NavSidebar: React.FC = React.memo(() => {
  const currentView = useAppStore((s) => s.currentView);
  const setView = useAppStore((s) => s.setView);

  const mainViews: NavButtonConfig[] = [
    { id: 'workbench', label: '3D Workbench', icon: WorkbenchNavIcon },
    { id: 'library', label: 'Model Library', icon: Library },
    { id: 'agent', label: 'AI Studio', icon: Sparkles }
  ];

  return (
    <aside
      aria-label="Primary navigation"
      className="w-12 border-r border-hairline bg-surface-low flex flex-col items-center justify-between py-2 shrink-0 select-none z-20"
    >
      {/* Top 3 Main Views */}
      <div className="flex flex-col items-center gap-1.5 w-full px-1.5">
        {mainViews.map((btn) => {
          const Icon = btn.icon;
          const isActive = currentView === btn.id || (btn.id === 'library' && currentView === 'entryDetail');

          return (
            <IconButton
              key={btn.id}
              variant={isActive ? 'secondary' : 'ghost'}
              size="md"
              onClick={() => setView(btn.id)}
              icon={<Icon className={`w-4 h-4 ${isActive ? 'text-action font-bold' : ''}`} />}
              title={btn.label}
              className={`w-9 h-9 ${isActive ? '!bg-surface-lowest !border-hairline shadow-xs' : ''}`}
            />
          );
        })}
      </div>

      {/* Bottom Settings View */}
      <div className="flex flex-col items-center gap-1.5 w-full px-1.5">
        <IconButton
          variant={currentView === 'settings' ? 'secondary' : 'ghost'}
          size="md"
          onClick={() => setView('settings')}
          icon={<Settings className={`w-4 h-4 ${currentView === 'settings' ? 'text-action font-bold' : ''}`} />}
          title="Settings"
          className={`w-9 h-9 ${currentView === 'settings' ? '!bg-surface-lowest !border-hairline shadow-xs' : ''}`}
        />
      </div>
    </aside>
  );
});
