import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { useViewportStore, DEFAULT_TOOLBAR_ITEMS } from '../store/viewportStore';
import { useAppStore } from '../store/appStore';
import { ViewportToolbar } from '../components/Viewport/ViewportToolbar';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('ViewportToolbar Decoupling & Reorderable Items with Dynamic Spacers', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    useViewportStore.getState().resetToolbarItems();
    useAppStore.setState({
      workbenchSidebarPosition: 'left',
      isWorkbenchSidebarCollapsed: false
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  describe('Initial Default Configuration', () => {
    it('initializes with default toolbar order containing exactly 2 expanding spacers', () => {
      const items = useViewportStore.getState().toolbarItems;
      expect(items).toEqual(DEFAULT_TOOLBAR_ITEMS);

      const spacers = items.filter((id) => id.startsWith('spacer'));
      expect(spacers.length).toBe(2);
      expect(items.indexOf('spacer-1')).toBe(4);
      expect(items.indexOf('spacer-2')).toBe(9);
    });

    it('renders all default toolbar items in the DOM', () => {
      act(() => {
        root.render(<ViewportToolbar />);
      });

      const renderedItems = container.querySelectorAll('[data-toolbar-item]');
      expect(renderedItems.length).toBe(DEFAULT_TOOLBAR_ITEMS.length);

      // Verify presence of core items
      expect(container.querySelector('[data-toolbar-item="channel-dropdown"]')).toBeTruthy();
      expect(container.querySelector('[data-toolbar-item="overlays"]')).toBeTruthy();
      expect(container.querySelector('[data-toolbar-item="transform-gizmo"]')).toBeTruthy();
      expect(container.querySelector('[data-toolbar-item="theme-toggle"]')).toBeTruthy();
      expect(container.querySelector('[data-toolbar-item="spacer-1"]')).toBeTruthy();
      expect(container.querySelector('[data-toolbar-item="camera-orientation"]')).toBeTruthy();
      expect(container.querySelector('[data-toolbar-item="projection-toggle"]')).toBeTruthy();
      expect(container.querySelector('[data-toolbar-item="fit-model"]')).toBeTruthy();
      expect(container.querySelector('[data-toolbar-item="auto-rotate"]')).toBeTruthy();
      expect(container.querySelector('[data-toolbar-item="spacer-2"]')).toBeTruthy();
      expect(container.querySelector('[data-toolbar-item="environment-hdri"]')).toBeTruthy();
      expect(container.querySelector('[data-toolbar-item="lighting-intensity"]')).toBeTruthy();
      expect(container.querySelector('[data-toolbar-item="snapshot-button"]')).toBeTruthy();
    });
  });

  describe('Reordering Items', () => {
    it('reorders toolbar items and updates the rendered DOM sequence', () => {
      act(() => {
        root.render(<ViewportToolbar />);
      });

      // Move snapshot-button to the very first position
      const customOrder = [
        'snapshot-button',
        ...DEFAULT_TOOLBAR_ITEMS.filter((id) => id !== 'snapshot-button')
      ];

      act(() => {
        useViewportStore.getState().reorderToolbarItems(customOrder);
      });

      expect(useViewportStore.getState().toolbarItems[0]).toBe('snapshot-button');

      // Check rendered DOM order
      const renderedItems = Array.from(container.querySelectorAll('[data-toolbar-item]')).map(
        (el) => el.getAttribute('data-toolbar-item')
      );
      expect(renderedItems[0]).toBe('snapshot-button');
    });

    it('handles HTML5 drag and drop simulation between items', () => {
      act(() => {
        root.render(<ViewportToolbar />);
      });

      const themeToggleEl = container.querySelector('[data-toolbar-item="theme-toggle"]') as HTMLElement;
      const fitModelEl = container.querySelector('[data-toolbar-item="fit-model"]') as HTMLElement;

      expect(themeToggleEl).toBeTruthy();
      expect(fitModelEl).toBeTruthy();

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

      // Drag start on theme-toggle
      act(() => {
        const dragStartEvent = new Event('dragstart', { bubbles: true }) as any;
        dragStartEvent.dataTransfer = dataTransfer;
        themeToggleEl.dispatchEvent(dragStartEvent);
      });

      expect(dataTransfer.getData('text/plain')).toBe('theme-toggle');

      // Drag over fit-model
      act(() => {
        const dragOverEvent = new Event('dragover', { bubbles: true }) as any;
        dragOverEvent.dataTransfer = dataTransfer;
        dragOverEvent.clientX = 500;
        fitModelEl.getBoundingClientRect = () => ({
          left: 400,
          right: 600,
          top: 0,
          bottom: 36,
          width: 200,
          height: 36,
          x: 400,
          y: 0,
          toJSON: () => {}
        });
        fitModelEl.dispatchEvent(dragOverEvent);
      });

      // Drop on fit-model
      act(() => {
        const dropEvent = new Event('drop', { bubbles: true }) as any;
        dropEvent.dataTransfer = dataTransfer;
        fitModelEl.dispatchEvent(dropEvent);
      });

      const currentItems = useViewportStore.getState().toolbarItems;
      const themeIdx = currentItems.indexOf('theme-toggle');
      const fitIdx = currentItems.indexOf('fit-model');

      // theme-toggle should now be adjacent to fit-model
      expect(Math.abs(themeIdx - fitIdx)).toBe(1);
    });
  });

  describe('Dynamic Spacers Management', () => {
    it('adds a new spacer to the end or after a specific item', () => {
      act(() => {
        useViewportStore.getState().addToolbarSpacer();
      });

      let items = useViewportStore.getState().toolbarItems;
      expect(items.filter((id) => id.startsWith('spacer')).length).toBe(3);
      expect(items[items.length - 1].startsWith('spacer-')).toBe(true);

      // Add a spacer after channel-dropdown
      act(() => {
        useViewportStore.getState().addToolbarSpacer('channel-dropdown');
      });

      items = useViewportStore.getState().toolbarItems;
      expect(items.filter((id) => id.startsWith('spacer')).length).toBe(4);
      expect(items[1].startsWith('spacer-')).toBe(true);
    });

    it('removes a spacer and collapses space', () => {
      act(() => {
        useViewportStore.getState().removeToolbarSpacer('spacer-1');
      });

      const items = useViewportStore.getState().toolbarItems;
      expect(items.includes('spacer-1')).toBe(false);
      expect(items.filter((id) => id.startsWith('spacer')).length).toBe(1);
    });

    it('resets toolbar items back to default layout', () => {
      act(() => {
        useViewportStore.getState().reorderToolbarItems(['fit-model', 'auto-rotate']);
      });
      expect(useViewportStore.getState().toolbarItems.length).toBe(2);

      act(() => {
        useViewportStore.getState().resetToolbarItems();
      });

      expect(useViewportStore.getState().toolbarItems).toEqual(DEFAULT_TOOLBAR_ITEMS);
    });
  });

  describe('Sidebar Toggle Button Fixed Pinning', () => {
    it('remains pinned to the far left when sidebar position is left, regardless of item reordering', () => {
      act(() => {
        useAppStore.setState({ workbenchSidebarPosition: 'left' });
        // Reorder all items backwards
        useViewportStore.getState().reorderToolbarItems([...DEFAULT_TOOLBAR_ITEMS].reverse());
        root.render(<ViewportToolbar />);
      });

      const header = container.querySelector('header');
      const firstChild = header?.firstElementChild;

      // The very first child in header must be the sidebar toggle container, not a toolbar item
      expect(firstChild?.getAttribute('data-toolbar-item')).toBeNull();
      const sidebarBtn = firstChild?.querySelector('button');
      expect(sidebarBtn?.getAttribute('title')).toContain('Collapse workbench sidebar');
    });

    it('remains pinned to the far right when sidebar position is right, regardless of item reordering', () => {
      act(() => {
        useAppStore.setState({ workbenchSidebarPosition: 'right' });
        useViewportStore.getState().reorderToolbarItems([...DEFAULT_TOOLBAR_ITEMS].reverse());
        root.render(<ViewportToolbar />);
      });

      const header = container.querySelector('header');
      const lastChild = header?.lastElementChild;

      // The last child in header must be the sidebar toggle container, not a toolbar item
      expect(lastChild?.getAttribute('data-toolbar-item')).toBeNull();
      const sidebarBtn = lastChild?.querySelector('button');
      expect(sidebarBtn?.getAttribute('title')).toContain('Collapse workbench sidebar');
    });
  });

  describe('Togglable Items Visibility', () => {
    it('allows toggling item visibility on and off without losing custom position', () => {
      act(() => {
        root.render(<ViewportToolbar />);
      });

      expect(container.querySelector('[data-toolbar-item="auto-rotate"]')).toBeTruthy();

      // Toggle auto-rotate off
      act(() => {
        useViewportStore.getState().toggleToolbarItemVisibility('auto-rotate');
      });

      expect(useViewportStore.getState().hiddenToolbarItems).toContain('auto-rotate');
      expect(container.querySelector('[data-toolbar-item="auto-rotate"]')).toBeNull();

      // Toggle auto-rotate back on
      act(() => {
        useViewportStore.getState().toggleToolbarItemVisibility('auto-rotate');
      });

      expect(useViewportStore.getState().hiddenToolbarItems).not.toContain('auto-rotate');
      expect(container.querySelector('[data-toolbar-item="auto-rotate"]')).toBeTruthy();
    });

    it('resets hidden items when resetting toolbar layout', () => {
      act(() => {
        useViewportStore.getState().toggleToolbarItemVisibility('snapshot-button');
        useViewportStore.getState().toggleToolbarItemVisibility('theme-toggle');
      });

      expect(useViewportStore.getState().hiddenToolbarItems.length).toBe(2);

      act(() => {
        useViewportStore.getState().resetToolbarItems();
      });

      expect(useViewportStore.getState().hiddenToolbarItems).toEqual([]);
    });
  });

  describe('Context Menu Isolation', () => {
    it('marks toolbar header with data-no-canvas-menu and prevents propagation', () => {
      act(() => {
        root.render(<ViewportToolbar />);
      });

      const header = container.querySelector('header');
      expect(header?.getAttribute('data-no-canvas-menu')).toBe('true');

      let contextMenuFired = false;
      const onContextMenu = () => {
        contextMenuFired = true;
      };
      container.addEventListener('contextmenu', onContextMenu);

      act(() => {
        const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
        header?.dispatchEvent(event);
      });

      container.removeEventListener('contextmenu', onContextMenu);
    });
  });

  describe('Icon-Only Mode for Items with Text', () => {
    it('toggles items with text to icon-only mode and hides text labels', () => {
      act(() => {
        root.render(<ViewportToolbar />);
      });

      const channelItem = container.querySelector('[data-toolbar-item="channel-dropdown"]');
      expect(channelItem?.textContent).toContain('Full PBR');

      // Toggle channel-dropdown to icon-only
      act(() => {
        useViewportStore.getState().toggleToolbarItemIconOnly('channel-dropdown');
      });

      expect(useViewportStore.getState().iconOnlyToolbarItems).toContain('channel-dropdown');
      expect(channelItem?.textContent).not.toContain('Full PBR');

      // Toggle channel-dropdown back to full text
      act(() => {
        useViewportStore.getState().toggleToolbarItemIconOnly('channel-dropdown');
      });

      expect(useViewportStore.getState().iconOnlyToolbarItems).not.toContain('channel-dropdown');
      expect(channelItem?.textContent).toContain('Full PBR');
    });

    it('sets all items with text to icon-only via setAllToolbarItemsIconOnly', () => {
      act(() => {
        root.render(<ViewportToolbar />);
      });

      expect(container.textContent).toContain('Isometric');
      expect(container.textContent).toContain('Full PBR');

      // Switch all to icon-only
      act(() => {
        useViewportStore.getState().setAllToolbarItemsIconOnly(true);
      });

      expect(container.textContent).not.toContain('Isometric');
      expect(container.textContent).not.toContain('Full PBR');

      // Reset restores all text
      act(() => {
        useViewportStore.getState().resetToolbarItems();
      });

      expect(useViewportStore.getState().iconOnlyToolbarItems).toEqual([]);
      expect(container.textContent).toContain('Isometric');
      expect(container.textContent).toContain('Full PBR');
    });
  });
});
