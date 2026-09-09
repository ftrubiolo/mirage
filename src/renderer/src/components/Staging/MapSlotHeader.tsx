import React from 'react';
import { SlotName } from '../../store/workbenchStore';
import { Switch } from '../UI/Switch';

export interface MapSlotHeaderProps {
  slot: SlotName;
  title: string;
  icon: React.ReactNode;
  isEnabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  headerExtra?: React.ReactNode;
  embeddedInSection?: boolean;
  children: React.ReactNode;
}

export const MapSlotHeader: React.FC<MapSlotHeaderProps> = ({
  slot,
  title,
  icon,
  isEnabled,
  onToggleEnabled,
  headerExtra,
  embeddedInSection = true,
  children
}) => {
  if (!embeddedInSection) {
    return (
      <div className="space-y-2 p-2.5 rounded-xs bg-surface-low/30 border border-hairline">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="shrink-0 flex items-center justify-center text-action">
              {icon}
            </div>
            <span className="text-xs font-semibold text-ink-primary uppercase tracking-wider font-primary truncate">
              {title}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerExtra}
            <Switch
              checked={isEnabled}
              onChange={onToggleEnabled}
              title={isEnabled ? 'Desactivar mapa (forzar null)' : 'Activar mapa'}
            />
          </div>
        </div>
        <div className={`transition-opacity duration-200 ${!isEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3.5 rounded-xs bg-surface-lowest border border-hairline space-y-3 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="shrink-0 flex items-center justify-center text-action">
            {icon}
          </div>
          <h3 className="text-xs font-semibold text-ink-primary uppercase tracking-wider font-primary truncate">
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {headerExtra}
          <Switch
            checked={isEnabled}
            onChange={onToggleEnabled}
            title={isEnabled ? 'Desactivar mapa (forzar null)' : 'Activar mapa'}
          />
        </div>
      </div>
      <div className={`transition-opacity duration-200 ${!isEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
        {children}
      </div>
    </div>
  );
};
