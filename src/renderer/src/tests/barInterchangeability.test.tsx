import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import {
  useViewportStore,
  DEFAULT_TOOLBAR_ITEMS,
  DEFAULT_STATUSBAR_ITEMS
} from '../store/viewportStore';
import { ViewportToolbar } from '../components/Viewport/ViewportToolbar';
import { ViewportStatusBar } from '../components/Viewport/ViewportStatusBar';
import { getDropdownPlacementClass } from '../components/Viewport/ToolbarItems/useDropdownPlacement';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('Toolbar and StatusBar Interchangeability & Dynamic Items', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    useViewportStore.getState().resetAllBars();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  describe('StatusBar Default Configuration', () => {
    it('initializes with default statusbar order containing variant-picker, spacer, and model-stats', () => {
      const sbItems = useViewportStore.getState().statusBarItems;
      expect(sbItems).toEqual(DEFAULT_STATUSBAR_ITEMS);
      expect(sbItems).toContain('variant-picker');
      expect(sbItems).toContain('spacer-sb-1');
      expect(sbItems).toContain('model-stats');
    });

    it('renders all default status bar items in the DOM', () => {
      act(() => {
        root.render(<ViewportStatusBar />);
      });

      expect(container.querySelector('[data-bar-item="variant-picker"]')).toBeTruthy();
      expect(container.querySelector('[data-bar-item="spacer-sb-1"]')).toBeTruthy();
      expect(container.querySelector('[data-bar-item="model-stats"]')).toBeTruthy();
    });
  });

  describe('Reordering & Interchanging Items Across Bars', () => {
    it('moves an item from Toolbar to StatusBar via moveBarItem', () => {
      act(() => {
        useViewportStore.getState().moveBarItem('transform-gizmo', 'toolbar', 'statusbar', 1);
      });

      const tbItems = useViewportStore.getState().toolbarItems;
      const sbItems = useViewportStore.getState().statusBarItems;

      expect(tbItems).not.toContain('transform-gizmo');
      expect(sbItems).toContain('transform-gizmo');
      expect(sbItems[1]).toBe('transform-gizmo');
    });

    it('moves an item from StatusBar to Toolbar via moveBarItem', () => {
      act(() => {
        useViewportStore.getState().moveBarItem('variant-picker', 'statusbar', 'toolbar', 0);
      });

      const tbItems = useViewportStore.getState().toolbarItems;
      const sbItems = useViewportStore.getState().statusBarItems;

      expect(sbItems).not.toContain('variant-picker');
      expect(tbItems).toContain('variant-picker');
      expect(tbItems[0]).toBe('variant-picker');
    });

    it('swaps an item to the other bar via moveItemToOtherBar', () => {
      // Move camera-orientation from toolbar to statusbar
      act(() => {
        useViewportStore.getState().moveItemToOtherBar('camera-orientation', 'toolbar');
      });

      expect(useViewportStore.getState().toolbarItems).not.toContain('camera-orientation');
      expect(useViewportStore.getState().statusBarItems).toContain('camera-orientation');

      // Move model-stats from statusbar to toolbar
      act(() => {
        useViewportStore.getState().moveItemToOtherBar('model-stats', 'statusbar');
      });

      expect(useViewportStore.getState().statusBarItems).not.toContain('model-stats');
      expect(useViewportStore.getState().toolbarItems).toContain('model-stats');
    });

    it('renders swapped items correctly in the target bar DOM', () => {
      act(() => {
        useViewportStore.getState().moveBarItem('variant-picker', 'statusbar', 'toolbar', 0);
        useViewportStore.getState().moveBarItem('theme-toggle', 'toolbar', 'statusbar', 0);
      });

      act(() => {
        root.render(
          <div>
            <ViewportToolbar />
            <ViewportStatusBar />
          </div>
        );
      });

      const toolbarEl = container.querySelector('header');
      const statusbarEl = container.querySelector('footer');

      expect(toolbarEl?.querySelector('[data-bar-item="variant-picker"]')).toBeTruthy();
      expect(statusbarEl?.querySelector('[data-bar-item="theme-toggle"]')).toBeTruthy();
    });

    it('simulates HTML5 drag and drop between Toolbar and StatusBar', () => {
      act(() => {
        root.render(
          <div>
            <ViewportToolbar />
            <ViewportStatusBar />
          </div>
        );
      });

      const sourceEl = container.querySelector('[data-bar-item="theme-toggle"]') as HTMLElement;
      const targetEl = container.querySelector('[data-bar-item="model-stats"]') as HTMLElement;

      expect(sourceEl).toBeTruthy();
      expect(targetEl).toBeTruthy();

      const dataTransfer = {
        data: {} as Record<string, string>,
        setData(key: string, val: string) {
          this.data[key] = val;
        },
        getData(key: string) {
          return this.data[key] || '';
        },
        effectAllowed: 'move',
        dropEffect: 'move'
      };

      // Drag start from Toolbar item
      act(() => {
        const dragStartEvent = new Event('dragstart', { bubbles: true }) as any;
        dragStartEvent.dataTransfer = dataTransfer;
        sourceEl.dispatchEvent(dragStartEvent);
      });

      expect(dataTransfer.getData('text/plain')).toBe('theme-toggle');
      expect(dataTransfer.getData('application/x-mirage-bar')).toBe('toolbar');

      // Drag over and drop on StatusBar item
      act(() => {
        const dragOverEvent = new Event('dragover', { bubbles: true }) as any;
        dragOverEvent.dataTransfer = dataTransfer;
        dragOverEvent.clientX = 500;
        targetEl.getBoundingClientRect = () => ({
          left: 400,
          right: 600,
          top: 900,
          bottom: 936,
          width: 200,
          height: 36,
          x: 400,
          y: 900,
          toJSON: () => {}
        });
        targetEl.dispatchEvent(dragOverEvent);

        const dropEvent = new Event('drop', { bubbles: true }) as any;
        dropEvent.dataTransfer = dataTransfer;
        targetEl.dispatchEvent(dropEvent);
      });

      expect(useViewportStore.getState().toolbarItems).not.toContain('theme-toggle');
      expect(useViewportStore.getState().statusBarItems).toContain('theme-toggle');
    });
  });

  describe('Spacers and Visibility in StatusBar', () => {
    it('adds and removes flexible spacers in the statusbar', () => {
      act(() => {
        useViewportStore.getState().addStatusBarSpacer('variant-picker');
      });

      const sbItems = useViewportStore.getState().statusBarItems;
      expect(sbItems.length).toBe(DEFAULT_STATUSBAR_ITEMS.length + 1);
      expect(sbItems[1].startsWith('spacer-sb')).toBe(true);

      const newSpacerId = sbItems[1];
      act(() => {
        useViewportStore.getState().removeStatusBarSpacer(newSpacerId);
      });

      expect(useViewportStore.getState().statusBarItems).not.toContain(newSpacerId);
    });

    it('toggles visibility of status bar items without losing position', () => {
      act(() => {
        useViewportStore.getState().toggleStatusBarItemVisibility('model-stats');
      });

      expect(useViewportStore.getState().hiddenStatusBarItems).toContain('model-stats');

      act(() => {
        root.render(<ViewportStatusBar />);
      });

      expect(container.querySelector('[data-bar-item="model-stats"]')).toBeNull();

      act(() => {
        useViewportStore.getState().toggleStatusBarItemVisibility('model-stats');
      });

      expect(useViewportStore.getState().hiddenStatusBarItems).not.toContain('model-stats');

      act(() => {
        root.render(<ViewportStatusBar />);
      });

      expect(container.querySelector('[data-bar-item="model-stats"]')).toBeTruthy();
    });

    it('toggles icon-only mode on status bar items', () => {
      act(() => {
        useViewportStore.getState().toggleToolbarItemIconOnly('variant-picker');
      });

      expect(useViewportStore.getState().iconOnlyToolbarItems).toContain('variant-picker');

      act(() => {
        useViewportStore.getState().setAllToolbarItemsIconOnly(true);
      });

      expect(useViewportStore.getState().iconOnlyToolbarItems).toContain('variant-picker');
      expect(useViewportStore.getState().iconOnlyToolbarItems).toContain('model-stats');
    });

    it('resets all bars back to default configuration', () => {
      act(() => {
        useViewportStore.getState().moveBarItem('transform-gizmo', 'toolbar', 'statusbar', 0);
        useViewportStore.getState().toggleStatusBarItemVisibility('variant-picker');
        useViewportStore.getState().resetAllBars();
      });

      expect(useViewportStore.getState().toolbarItems).toEqual(DEFAULT_TOOLBAR_ITEMS);
      expect(useViewportStore.getState().statusBarItems).toEqual(DEFAULT_STATUSBAR_ITEMS);
      expect(useViewportStore.getState().hiddenToolbarItems).toEqual([]);
      expect(useViewportStore.getState().hiddenStatusBarItems).toEqual([]);
    });
  });

  describe('Adaptive Multi-directional Dropdown Placement', () => {
    it('computes top-down classes when placement is downward (Toolbar)', () => {
      const clsCenter = getDropdownPlacementClass({ horizontal: 'center', vertical: 'down' });
      expect(clsCenter).toContain('top-full mt-1');
      expect(clsCenter).toContain('left-1/2 -translate-x-1/2');

      const clsLeft = getDropdownPlacementClass({ horizontal: 'left', vertical: 'down' });
      expect(clsLeft).toContain('top-full mt-1');
      expect(clsLeft).toContain('left-0');

      const clsRight = getDropdownPlacementClass({ horizontal: 'right', vertical: 'down' });
      expect(clsRight).toContain('top-full mt-1');
      expect(clsRight).toContain('right-0');
    });

    it('computes bottom-up classes when placement is upward (StatusBar)', () => {
      const clsCenter = getDropdownPlacementClass({ horizontal: 'center', vertical: 'up' });
      expect(clsCenter).toContain('bottom-full mb-1.5');
      expect(clsCenter).toContain('left-1/2 -translate-x-1/2');

      const clsLeft = getDropdownPlacementClass({ horizontal: 'left', vertical: 'up' });
      expect(clsLeft).toContain('bottom-full mb-1.5');
      expect(clsLeft).toContain('left-0');

      const clsRight = getDropdownPlacementClass({ horizontal: 'right', vertical: 'up' });
      expect(clsRight).toContain('bottom-full mb-1.5');
      expect(clsRight).toContain('right-0');
    });
  });

  describe('Context Menu Dynamic Vertical Positioning', () => {
    it('spawns upward from cursor when clicked on the status bar', () => {
      act(() => {
        root.render(<ViewportStatusBar />);
      });

      const footer = container.querySelector('footer') as HTMLElement;
      expect(footer).toBeTruthy();

      // Right click at the bottom of the window (e.g. y = 1050)
      act(() => {
        const contextMenuEvent = new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: 300,
          clientY: 1050
        });
        footer.dispatchEvent(contextMenuEvent);
      });

      // ContextMenu creates a portal in document.body
      const menuPortal = document.body.querySelector('[style*="position: fixed"]') as HTMLElement;
      expect(menuPortal).toBeTruthy();

      const topStyle = parseFloat(menuPortal.style.top);
      // Since clientY was 1050, menu opens upward from 1050
      expect(topStyle).toBeLessThan(1050);
      expect(topStyle).toBeGreaterThan(0);
    });
  });
});
