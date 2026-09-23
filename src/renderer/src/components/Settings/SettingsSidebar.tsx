import React from 'react';
import {
  Palette,
  Compass,
  Keyboard,
  HardDrive,
  Cpu,
  Info
} from 'lucide-react';
import { Badge } from '../UI/Badge';

export type SettingsTab = 'appearance' | 'viewport' | 'keybinds' | 'storage' | 'ai' | 'system';

interface NavItem {
  id: SettingsTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface SettingsSidebarProps {
  activeTab: SettingsTab;
  onSelectTab: (tab: SettingsTab) => void;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'appearance', label: 'Apariencia & Tema', icon: Palette },
  { id: 'viewport', label: 'Visor 3D & Parámetros', icon: Compass },
  { id: 'keybinds', label: 'Atajos de Teclado', icon: Keyboard },
  { id: 'storage', label: 'Almacenamiento Local', icon: HardDrive },
  { id: 'ai', label: 'Modelos IA & Agentes', icon: Cpu },
  { id: 'system', label: 'Información del Sistema', icon: Info }
];

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  activeTab,
  onSelectTab
}) => {
  return (
    <aside className="w-64 border-r border-hairline bg-surface-low/50 flex flex-col p-4 shrink-0 overflow-y-auto space-y-1">
      <div className="px-3 py-2 mb-2">
        <h2 className="font-primary font-bold text-xs uppercase tracking-wider text-ink-primary">
          Configuración
        </h2>
        <p className="text-[11px] text-ink-tertiary">
          Mirage Atelier 3D Workbench
        </p>
      </div>

      <nav className="space-y-0.5 flex-1" aria-label="Secciones de configuración">
        {NAV_ITEMS.map((item) => {
          const isSelected = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full px-3 py-2.5 rounded-xs text-xs font-medium flex items-center gap-2.5 transition-colors text-left cursor-pointer ${
                isSelected
                  ? 'bg-surface-container text-action font-semibold border-l-2 border-action shadow-xs'
                  : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-container/50 border-l-2 border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-action' : 'text-ink-tertiary'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="pt-4 border-t border-hairline px-3 flex items-center justify-between">
        <span className="text-[11px] text-ink-tertiary font-mono">Mirage</span>
        <Badge variant="neutral" size="xs" mono>
          v1.0.0
        </Badge>
      </div>
    </aside>
  );
};
