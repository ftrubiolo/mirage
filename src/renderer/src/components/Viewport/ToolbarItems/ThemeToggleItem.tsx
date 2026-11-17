import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useViewportStore } from '../../../store/viewportStore';

export const ThemeToggleItem: React.FC = () => {
  const viewportTheme = useViewportStore((s) => s.viewportTheme);
  const toggleViewportTheme = useViewportStore((s) => s.toggleViewportTheme);

  return (
    <button
      onClick={toggleViewportTheme}
      title={
        viewportTheme === 'dark'
          ? 'Switch viewport background to Light mode'
          : 'Switch viewport background to Dark mode'
      }
      className="p-1.5 rounded-xs transition-colors flex items-center text-xs text-ink-secondary hover:text-ink-primary hover:bg-surface-container border border-transparent cursor-pointer"
    >
      {viewportTheme === 'dark' ? (
        <Sun className="w-3.5 h-3.5 text-amber-500" />
      ) : (
        <Moon className="w-3.5 h-3.5 text-ink-primary" />
      )}
    </button>
  );
};
