import React, { useState, useRef, useEffect } from 'react';
import { SlidersHorizontal, Plus, Trash2, RotateCcw, EyeOff, Type, ArrowUpCircle } from 'lucide-react';
import { useViewportStore } from '../../store/viewportStore';
import {
  ContextMenu,
  ContextMenuHeader,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuCheckbox
} from '../UI';
import {
  ChannelDropdownItem,
  OverlaysItemGroup,
  TransformGizmoItem,
  ThemeToggleItem,
  CameraOrientationItem,
  ProjectionToggleItem,
  FitModelItem,
  AutoRotateItem,
  EnvironmentHdriItem,
  LightingIntensityItem,
  SnapshotButtonItem,
  ToolbarItemWrapper,
  BarItemRenderer,
  isToolbarSpacer,
  TOGGLEABLE_TOOLBAR_ITEMS,
  ITEMS_WITH_TEXT,
  isItemWithText
} from './ToolbarItems';

export const ViewportStatusBar: React.FC = () => {
  const statusBarItems = useViewportStore((s) => s.statusBarItems);
  const hiddenStatusBarItems = useViewportStore((s) => s.hiddenStatusBarItems);
  const iconOnlyToolbarItems = useViewportStore((s) => s.iconOnlyToolbarItems);
  const toggleStatusBarItemVisibility = useViewportStore((s) => s.toggleStatusBarItemVisibility);
  const toggleToolbarItemIconOnly = useViewportStore((s) => s.toggleToolbarItemIconOnly);
  const setAllToolbarItemsIconOnly = useViewportStore((s) => s.setAllToolbarItemsIconOnly);
  const addStatusBarSpacer = useViewportStore((s) => s.addStatusBarSpacer);
  const removeStatusBarSpacer = useViewportStore((s) => s.removeStatusBarSpacer);
  const resetStatusBarItems = useViewportStore((s) => s.resetStatusBarItems);
  const resetAllBars = useViewportStore((s) => s.resetAllBars);
  const moveBarItem = useViewportStore((s) => s.moveBarItem);
  const moveItemToOtherBar = useViewportStore((s) => s.moveItemToOtherBar);

  const containerRef = useRef<HTMLElement>(null);
  const [statusBarWidth, setStatusBarWidth] = useState<number>(1000);

  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number } | null;
    targetItemId?: string;
  }>({
    isOpen: false,
    position: null
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setStatusBarWidth(entry.contentRect.width);
        }
      }
    });
    ro.observe(el);
    setStatusBarWidth(el.getBoundingClientRect().width || 1000);

    return () => ro.disconnect();
  }, []);

  const isCompact = statusBarWidth < 680;

  const handleContextMenu = (e: React.MouseEvent, itemId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      targetItemId: itemId
    });
  };

  const barDropTarget = useViewportStore((s) => s.barDropTarget);
  const visibleStatusBarItems = statusBarItems.filter((id) => !hiddenStatusBarItems.includes(id));

  const renderBarItem = (id: string) => {
    return (
      <BarItemRenderer
        id={id}
        compact={isCompact}
        iconOnly={iconOnlyToolbarItems.includes(id)}
      />
    );
  };

  const isTargetWithText = Boolean(contextMenu.targetItemId && isItemWithText(contextMenu.targetItemId));
  const areAllIconOnly = ITEMS_WITH_TEXT.every((item) => iconOnlyToolbarItems.includes(item.id));

  return (
    <footer
      ref={containerRef}
      aria-label="Status bar and model info"
      data-no-canvas-menu="true"
      onContextMenu={(e) => handleContextMenu(e)}
      className="w-full h-9 border-t border-hairline bg-surface-low/95 backdrop-blur-xs px-2 flex items-center justify-between shrink-0 select-none z-20 relative text-xs gap-1"
    >
      {/* Dynamic Reorderable Status Bar Items with Dynamic Expanding Spacers */}
      <div
        className="flex-1 flex items-center gap-1 min-w-0 h-full relative"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(e) => {
          const sourceId = e.dataTransfer.getData('text/plain');
          if (!sourceId) return;
          const sourceBar =
            (e.dataTransfer.getData('application/x-mirage-bar') as 'toolbar' | 'statusbar') ||
            (statusBarItems.includes(sourceId) ? 'statusbar' : 'toolbar');
          if (e.target === e.currentTarget) {
            moveBarItem(sourceId, sourceBar, 'statusbar', statusBarItems.length);
          }
        }}
      >
        {visibleStatusBarItems.length === 0 && barDropTarget?.bar === 'statusbar' && (
          <div data-drop-indicator="empty" className="w-0.5 h-5 bg-action rounded-xs z-40 animate-in fade-in duration-75" />
        )}
        {visibleStatusBarItems.map((id, index) => (
          <ToolbarItemWrapper
            key={id}
            itemId={id}
            index={index}
            bar="statusbar"
            onContextMenu={handleContextMenu}
          >
            {renderBarItem(id)}
          </ToolbarItemWrapper>
        ))}
      </div>

      {/* Context Menu for Status Bar Customization */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        onClose={() => setContextMenu({ isOpen: false, position: null })}
      >
        <ContextMenuHeader>Customize Status Bar</ContextMenuHeader>

        {/* Quick icon-only toggle when right-clicking directly on an item that has text */}
        {isTargetWithText && (
          <ContextMenuCheckbox
            label="Icon only"
            icon={<Type className="w-3.5 h-3.5 text-action" />}
            checked={iconOnlyToolbarItems.includes(contextMenu.targetItemId!)}
            onChange={() => toggleToolbarItemIconOnly(contextMenu.targetItemId!)}
          />
        )}

        {/* Quick hide option if right-clicked directly on a non-spacer tool */}
        {contextMenu.targetItemId && !isToolbarSpacer(contextMenu.targetItemId) && (
          <ContextMenuItem
            icon={<EyeOff className="w-3.5 h-3.5 text-ink-secondary" />}
            onClick={() => toggleStatusBarItemVisibility(contextMenu.targetItemId!)}
          >
            Hide this item
          </ContextMenuItem>
        )}

        {/* Quick swap to Toolbar */}
        {contextMenu.targetItemId && !isToolbarSpacer(contextMenu.targetItemId) && (
          <ContextMenuItem
            icon={<ArrowUpCircle className="w-3.5 h-3.5 text-action" />}
            onClick={() => moveItemToOtherBar(contextMenu.targetItemId!, 'statusbar')}
          >
            Move to toolbar
          </ContextMenuItem>
        )}

        <ContextMenuItem
          icon={<Plus className="w-3.5 h-3.5 text-action" />}
          onClick={() => addStatusBarSpacer(contextMenu.targetItemId)}
        >
          Add flexible spacer
        </ContextMenuItem>

        {contextMenu.targetItemId && isToolbarSpacer(contextMenu.targetItemId) && (
          <ContextMenuItem
            icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
            danger
            onClick={() => removeStatusBarSpacer(contextMenu.targetItemId!)}
          >
            Remove this spacer
          </ContextMenuItem>
        )}

        <ContextMenuSeparator />

        {/* Submenu to toggle individual items into Icon-Only mode */}
        <ContextMenuSub
          label="Icon-Only Mode"
          icon={<Type className="w-3.5 h-3.5 text-action" />}
        >
          <ContextMenuHeader>Items with Text</ContextMenuHeader>
          <ContextMenuCheckbox
            label="All icon-only"
            checked={areAllIconOnly}
            onChange={(checked) => setAllToolbarItemsIconOnly(checked)}
          />
          <ContextMenuSeparator />
          {ITEMS_WITH_TEXT.map((item) => {
            const isIcon = iconOnlyToolbarItems.includes(item.id);
            return (
              <ContextMenuCheckbox
                key={item.id}
                label={item.label}
                checked={isIcon}
                onChange={() => toggleToolbarItemIconOnly(item.id)}
              />
            );
          })}
        </ContextMenuSub>

        {/* Submenu with checkboxes to toggle any tool on/off */}
        <ContextMenuSub
          label="Visible Items"
          icon={<SlidersHorizontal className="w-3.5 h-3.5 text-action" />}
        >
          <ContextMenuHeader>Show / Hide</ContextMenuHeader>
          {TOGGLEABLE_TOOLBAR_ITEMS.map((item) => {
            const isVisible = !hiddenStatusBarItems.includes(item.id);
            return (
              <ContextMenuCheckbox
                key={item.id}
                label={item.label}
                checked={isVisible}
                onChange={() => toggleStatusBarItemVisibility(item.id)}
              />
            );
          })}
        </ContextMenuSub>

        <ContextMenuSeparator />

        <ContextMenuItem
          icon={<RotateCcw className="w-3.5 h-3.5 text-ink-secondary" />}
          onClick={resetStatusBarItems}
        >
          Reset status bar
        </ContextMenuItem>

        <ContextMenuItem
          icon={<RotateCcw className="w-3.5 h-3.5 text-ink-secondary" />}
          onClick={resetAllBars}
        >
          Reset both bars
        </ContextMenuItem>
      </ContextMenu>
    </footer>
  );
};
