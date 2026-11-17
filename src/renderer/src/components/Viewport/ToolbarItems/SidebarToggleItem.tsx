import React from 'react';
import {
  PanelLeftOpen,
  PanelLeftClose,
  PanelRightOpen,
  PanelRightClose
} from 'lucide-react';
import { useAppStore } from '../../../store/appStore';
import { IconButton } from '../../UI';

interface SidebarToggleItemProps {
  position: 'left' | 'right';
}

export const SidebarToggleItem: React.FC<SidebarToggleItemProps> = ({ position }) => {
  const isWorkbenchSidebarCollapsed = useAppStore((state) => state.isWorkbenchSidebarCollapsed);
  const toggleWorkbenchSidebar = useAppStore((state) => state.toggleWorkbenchSidebar);

  if (position === 'left') {
    return (
      <div className="flex items-center shrink-0">
        <IconButton
          variant={isWorkbenchSidebarCollapsed ? 'secondary' : 'ghost'}
          size="xs"
          icon={
            isWorkbenchSidebarCollapsed ? (
              <PanelLeftOpen className="w-3.5 h-3.5 text-action" />
            ) : (
              <PanelLeftClose className="w-3.5 h-3.5 text-ink-secondary" />
            )
          }
          onClick={toggleWorkbenchSidebar}
          title={
            isWorkbenchSidebarCollapsed
              ? 'Show workbench sidebar (Ctrl+B)'
              : 'Collapse workbench sidebar (Ctrl+B)'
          }
          className={isWorkbenchSidebarCollapsed ? 'bg-action/10 border-action/30' : ''}
        />
        <div className="w-px h-3.5 bg-hairline mx-0.5" />
      </div>
    );
  }

  return (
    <div className="flex items-center shrink-0">
      <div className="w-px h-3.5 bg-hairline mx-0.5" />
      <IconButton
        variant={isWorkbenchSidebarCollapsed ? 'secondary' : 'ghost'}
        size="xs"
        icon={
          isWorkbenchSidebarCollapsed ? (
            <PanelRightOpen className="w-3.5 h-3.5 text-action" />
          ) : (
            <PanelRightClose className="w-3.5 h-3.5 text-ink-secondary" />
          )
        }
        onClick={toggleWorkbenchSidebar}
        title={
          isWorkbenchSidebarCollapsed
            ? 'Show workbench sidebar (Ctrl+B)'
            : 'Collapse workbench sidebar (Ctrl+B)'
        }
        className={isWorkbenchSidebarCollapsed ? 'bg-action/10 border-action/30' : ''}
      />
    </div>
  );
};
