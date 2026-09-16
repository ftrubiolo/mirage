import React, { useState, useRef, useEffect } from 'react';
import { SlidersHorizontal, Plus, Trash2, RotateCcw, EyeOff, Type, ArrowDownCircle } from 'lucide-react';
import { useViewportStore } from '../../store/viewportStore';
import { useAppStore } from '../../store/appStore';
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
  SidebarToggleItem,
  ToolbarItemWrapper,
  CompactToolbarDrawer,
  BarItemRenderer,
  isToolbarSpacer,
  TOGGLEABLE_TOOLBAR_ITEMS,
  ITEMS_WITH_TEXT,
  isItemWithText
} from './ToolbarItems';

export const ViewportToolbar: React.FC = () => {
  const toolbarItems = useViewportStore((s) => s.toolbarItems);
  const hiddenToolbarItems = useViewportStore((s) => s.hiddenToolbarItems);
  const iconOnlyToolbarItems = useViewportStore((s) => s.iconOnlyToolbarItems);
  const toggleToolbarItemVisibility = useViewportStore((s) => s.toggleToolbarItemVisibility);
  const toggleToolbarItemIconOnly = useViewportStore((s) => s.toggleToolbarItemIconOnly);
  const setAllToolbarItemsIconOnly = useViewportStore((s) => s.setAllToolbarItemsIconOnly);
  const addToolbarSpacer = useViewportStore((s) => s.addToolbarSpacer);
  const removeToolbarSpacer = useViewportStore((s) => s.removeToolbarSpacer);
  const resetToolbarItems = useViewportStore((s) => s.resetToolbarItems);
  const resetAllBars = useViewportStore((s) => s.resetAllBars);
  const moveBarItem = useViewportStore((s) => s.moveBarItem);
  const moveItemToOtherBar = useViewportStore((s) => s.moveItemToOtherBar);

  const workbenchSidebarPosition = useAppStore((s) => s.workbenchSidebarPosition);
  const isLeftSidebar = workbenchSidebarPosition === 'left';

  const toolbarRef = useRef<HTMLElement>(null);
  const [toolbarWidth, setToolbarWidth] = useState<number>(1000);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number } | null;
    targetItemId?: string;
  }>({
    isOpen: false,
    position: null
  });

  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setToolbarWidth(entry.contentRect.width);
        }
      }
    });
    ro.observe(el);
    setToolbarWidth(el.getBoundingClientRect().width || 1000);

    return () => ro.disconnect();
  }, []);

  const isCompact = toolbarWidth < 680;

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
  const visibleToolbarItems = toolbarItems.filter((id) => !hiddenToolbarItems.includes(id));

  const renderToolbarItem = (id: string) => {
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
    <header
      ref={toolbarRef}
      aria-label="Barra de herramientas del visor 3D"
      data-no-canvas-menu="true"
      onContextMenu={(e) => handleContextMenu(e)}
      className="w-full h-9 border-b border-hairline bg-surface-low/95 backdrop-blur-xs px-2 flex items-center justify-between shrink-0 select-none z-10 relative text-xs gap-1"
    >
      {/* Pinned Sidebar Toggle on Left */}
      {isLeftSidebar && <SidebarToggleItem position="left" />}

      {/* Dynamic Reorderable Toolbar Items with Dynamic Expanding Spacers */}
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
            (toolbarItems.includes(sourceId) ? 'toolbar' : 'statusbar');
          if (e.target === e.currentTarget) {
            moveBarItem(sourceId, sourceBar, 'toolbar', toolbarItems.length);
          }
        }}
      >
        {visibleToolbarItems.length === 0 && barDropTarget?.bar === 'toolbar' && (
          <div data-drop-indicator="empty" className="w-0.5 h-5 bg-action rounded-xs z-40 animate-in fade-in duration-75" />
        )}
        {visibleToolbarItems.map((id, index) => (
          <ToolbarItemWrapper
            key={id}
            itemId={id}
            index={index}
            bar="toolbar"
            onContextMenu={handleContextMenu}
          >
            {renderToolbarItem(id)}
          </ToolbarItemWrapper>
        ))}
      </div>

      {/* Compact Mode Overflow Drawer */}
      {isCompact && (
        <div className="relative shrink-0 flex items-center">
          <button
            onClick={() => setIsDrawerOpen((prev) => !prev)}
            title="Más herramientas y opciones del visor 3D"
            className={`h-6 px-1.5 rounded-xs transition-colors flex items-center gap-1 text-xs font-medium border cursor-pointer ${
              isDrawerOpen
                ? 'bg-action/15 text-action border-action/40'
                : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-container border-transparent'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="font-primary font-bold uppercase tracking-wider text-[10px]">
              Ajustes
            </span>
          </button>
          <CompactToolbarDrawer
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
          />
        </div>
      )}

      {/* Pinned Sidebar Toggle on Right */}
      {!isLeftSidebar && <SidebarToggleItem position="right" />}

      {/* Context Menu for Spacer and Toolbar Item Customization */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        onClose={() => setContextMenu({ isOpen: false, position: null })}
      >
        <ContextMenuHeader>Personalizar Barra</ContextMenuHeader>

        {/* Quick icon-only toggle when right-clicking directly on an item that has text */}
        {isTargetWithText && (
          <ContextMenuCheckbox
            label="Solo icono"
            icon={<Type className="w-3.5 h-3.5 text-action" />}
            checked={iconOnlyToolbarItems.includes(contextMenu.targetItemId!)}
            onChange={() => toggleToolbarItemIconOnly(contextMenu.targetItemId!)}
          />
        )}

        {/* Quick hide option if right-clicked directly on a non-spacer tool */}
        {contextMenu.targetItemId && !isToolbarSpacer(contextMenu.targetItemId) && (
          <ContextMenuItem
            icon={<EyeOff className="w-3.5 h-3.5 text-ink-secondary" />}
            onClick={() => toggleToolbarItemVisibility(contextMenu.targetItemId!)}
          >
            Ocultar este botón
          </ContextMenuItem>
        )}

        {/* Quick swap to Status Bar */}
        {contextMenu.targetItemId && !isToolbarSpacer(contextMenu.targetItemId) && (
          <ContextMenuItem
            icon={<ArrowDownCircle className="w-3.5 h-3.5 text-action" />}
            onClick={() => moveItemToOtherBar(contextMenu.targetItemId!, 'toolbar')}
          >
            Mover a la barra de estado
          </ContextMenuItem>
        )}

        <ContextMenuItem
          icon={<Plus className="w-3.5 h-3.5 text-action" />}
          onClick={() => addToolbarSpacer(contextMenu.targetItemId)}
        >
          Añadir espaciador flexible
        </ContextMenuItem>

        {contextMenu.targetItemId && isToolbarSpacer(contextMenu.targetItemId) && (
          <ContextMenuItem
            icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
            danger
            onClick={() => removeToolbarSpacer(contextMenu.targetItemId!)}
          >
            Eliminar este espaciador
          </ContextMenuItem>
        )}

        <ContextMenuSeparator />

        {/* Submenu to toggle individual items into Icon-Only mode */}
        <ContextMenuSub
          label="Modo Solo Icono"
          icon={<Type className="w-3.5 h-3.5 text-action" />}
        >
          <ContextMenuHeader>Botones con Texto</ContextMenuHeader>
          <ContextMenuCheckbox
            label="Todos en solo icono"
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
          label="Herramientas Visibles"
          icon={<SlidersHorizontal className="w-3.5 h-3.5 text-action" />}
        >
          <ContextMenuHeader>Mostrar / Ocultar</ContextMenuHeader>
          {TOGGLEABLE_TOOLBAR_ITEMS.map((item) => {
            const isVisible = !hiddenToolbarItems.includes(item.id);
            return (
              <ContextMenuCheckbox
                key={item.id}
                label={item.label}
                checked={isVisible}
                onChange={() => toggleToolbarItemVisibility(item.id)}
              />
            );
          })}
        </ContextMenuSub>

        <ContextMenuSeparator />

        <ContextMenuItem
          icon={<RotateCcw className="w-3.5 h-3.5 text-ink-secondary" />}
          onClick={resetToolbarItems}
        >
          Restablecer barra predeterminada
        </ContextMenuItem>

        <ContextMenuItem
          icon={<RotateCcw className="w-3.5 h-3.5 text-ink-secondary" />}
          onClick={resetAllBars}
        >
          Restablecer ambas barras
        </ContextMenuItem>
      </ContextMenu>
    </header>
  );
};
