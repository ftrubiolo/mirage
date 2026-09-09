import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import {
  useResizableSidebar,
  calculateSidebarResize,
  ResizeCalculationOptions,
  ResizeCalculationResult
} from '@renderer/hooks/useResizableSidebar';

// Configure React 19 testing environment for act(...)
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('useResizableSidebar', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Resize drag math and clamping', () => {
    it('calculates width expansion for left sidebar when dragging rightwards', () => {
      const res = calculateSidebarResize({
        startX: 100,
        currentX: 150, // +50px right
        startWidth: 300,
        minWidth: 200,
        maxWidth: 500,
        side: 'left'
      });

      expect(res.nextWidth).toBe(350);
      expect(res.shouldCollapse).toBe(false);
    });

    it('calculates width reduction for left sidebar when dragging leftwards', () => {
      const res = calculateSidebarResize({
        startX: 200,
        currentX: 150, // -50px left
        startWidth: 300,
        minWidth: 200,
        maxWidth: 500,
        side: 'left'
      });

      expect(res.nextWidth).toBe(250);
    });

    it('calculates width expansion for right sidebar when dragging leftwards', () => {
      // Right sidebar: dragging left (decreasing clientX) widens the sidebar
      const res = calculateSidebarResize({
        startX: 800,
        currentX: 740, // dragged left by 60px
        startWidth: 320,
        minWidth: 240,
        maxWidth: 600,
        side: 'right'
      });

      expect(res.nextWidth).toBe(380);
    });

    it('calculates width reduction for right sidebar when dragging rightwards', () => {
      // Right sidebar: dragging right (increasing clientX) narrows the sidebar
      const res = calculateSidebarResize({
        startX: 800,
        currentX: 850, // dragged right by 50px
        startWidth: 320,
        minWidth: 240,
        maxWidth: 600,
        side: 'right'
      });

      expect(res.nextWidth).toBe(270);
    });

    it('clamps to minWidth when drag attempts to shrink below minimum', () => {
      const res = calculateSidebarResize({
        startX: 300,
        currentX: 100, // -200px drag
        startWidth: 300,
        minWidth: 250,
        maxWidth: 600,
        side: 'left',
        collapsible: false
      });

      expect(res.nextWidth).toBe(250);
    });

    it('clamps to maxWidth when drag attempts to expand beyond maximum', () => {
      const res = calculateSidebarResize({
        startX: 100,
        currentX: 800, // +700px drag
        startWidth: 300,
        minWidth: 200,
        maxWidth: 500,
        side: 'left'
      });

      expect(res.nextWidth).toBe(500);
    });

    it('evaluates dynamic maxWidth function correctly', () => {
      const dynamicMax = () => 450;
      const res = calculateSidebarResize({
        startX: 100,
        currentX: 600,
        startWidth: 300,
        minWidth: 200,
        maxWidth: dynamicMax,
        side: 'left'
      });

      expect(res.nextWidth).toBe(450);
    });
  });

  describe('Collapse thresholds and callback triggers', () => {
    it('triggers shouldCollapse when dragging below minWidth - collapseThreshold', () => {
      const res = calculateSidebarResize({
        startX: 300,
        currentX: 200, // -100px drag: 300 - 100 = 200px. minWidth is 280, threshold is 60 (280 - 60 = 220).
        startWidth: 300,
        minWidth: 280,
        maxWidth: 600,
        side: 'left',
        collapsible: true,
        collapseThreshold: 60
      });

      expect(res.shouldCollapse).toBe(true);
      expect(res.nextWidth).toBe(0);
    });

    it('does not collapse if collapsible is false even if dragged below threshold', () => {
      const res = calculateSidebarResize({
        startX: 300,
        currentX: 200,
        startWidth: 300,
        minWidth: 280,
        maxWidth: 600,
        side: 'left',
        collapsible: false,
        collapseThreshold: 60
      });

      expect(res.shouldCollapse).toBe(false);
      expect(res.nextWidth).toBe(280); // clamped to minWidth
    });

    it('triggers shouldUncollapse when dragging outward from collapsed state past threshold', () => {
      const res = calculateSidebarResize({
        startX: 0,
        currentX: 45, // delta is +45px (> 30px threshold)
        startWidth: 0,
        minWidth: 280,
        maxWidth: 600,
        side: 'left',
        collapsible: true,
        isCollapsed: true
      });

      expect(res.shouldUncollapse).toBe(true);
      expect(res.nextWidth).toBeGreaterThanOrEqual(280);
    });
  });

  describe('React Hook integration (useResizableSidebar)', () => {
    it('initializes with defaultWidth when localStorage is empty', () => {
      let hookReturn: any;

      function TestComponent() {
        hookReturn = useResizableSidebar({
          storageKey: 'test_sidebar_width',
          defaultWidth: 340,
          minWidth: 250,
          maxWidth: 600
        });
        return React.createElement('div', { style: { width: hookReturn.width } }, 'Sidebar');
      }

      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      act(() => {
        root.render(React.createElement(TestComponent));
      });

      expect(hookReturn.width).toBe(340);
      expect(hookReturn.isDragging).toBe(false);

      act(() => {
        root.unmount();
      });
      document.body.removeChild(container);
    });

    it('loads saved width from localStorage if valid and >= minWidth', () => {
      localStorage.setItem('saved_sidebar_key', '420');

      let hookReturn: any;

      function TestComponent() {
        hookReturn = useResizableSidebar({
          storageKey: 'saved_sidebar_key',
          defaultWidth: 300,
          minWidth: 200,
          maxWidth: 600
        });
        return React.createElement('div', null, 'Sidebar');
      }

      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      act(() => {
        root.render(React.createElement(TestComponent));
      });

      expect(hookReturn.width).toBe(420);

      act(() => {
        root.unmount();
      });
      document.body.removeChild(container);
    });

    it('falls back to defaultWidth if localStorage contains corrupted or below-minimum value', () => {
      localStorage.setItem('corrupted_key', 'not_a_number');

      let hookReturn: any;

      function TestComponent() {
        hookReturn = useResizableSidebar({
          storageKey: 'corrupted_key',
          defaultWidth: 310,
          minWidth: 200,
          maxWidth: 600
        });
        return React.createElement('div', null, 'Sidebar');
      }

      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      act(() => {
        root.render(React.createElement(TestComponent));
      });

      expect(hookReturn.width).toBe(310);

      act(() => {
        root.unmount();
      });
      document.body.removeChild(container);
    });

    it('handleReset restores defaultWidth and updates localStorage', () => {
      localStorage.setItem('reset_key', '500');

      let hookReturn: any;

      function TestComponent() {
        hookReturn = useResizableSidebar({
          storageKey: 'reset_key',
          defaultWidth: 320,
          minWidth: 200,
          maxWidth: 600
        });
        return React.createElement('div', null, 'Sidebar');
      }

      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      act(() => {
        root.render(React.createElement(TestComponent));
      });

      expect(hookReturn.width).toBe(500);

      act(() => {
        hookReturn.handleReset();
      });

      expect(hookReturn.width).toBe(320);
      expect(localStorage.getItem('reset_key')).toBe('320');

      act(() => {
        root.unmount();
      });
      document.body.removeChild(container);
    });

    it('supports controlled width and calls onWidthChange when setWidth is invoked', () => {
      let hookReturn: any;
      const onWidthChange = vi.fn();

      function ControlledComponent({ width }: { width: number }) {
        hookReturn = useResizableSidebar({
          defaultWidth: 340,
          minWidth: 200,
          maxWidth: 600,
          width,
          onWidthChange
        });
        return React.createElement('div', null, 'Sidebar');
      }

      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      act(() => {
        root.render(React.createElement(ControlledComponent, { width: 450 }));
      });

      expect(hookReturn.width).toBe(450);

      act(() => {
        hookReturn.setWidth(520);
      });

      expect(onWidthChange).toHaveBeenCalledWith(520);

      act(() => {
        root.unmount();
      });
      document.body.removeChild(container);
    });

    it('handles reset in collapsible controlled mode by notifying onCollapseChange', () => {
      let hookReturn: any;
      const onCollapseChange = vi.fn();
      const onWidthChange = vi.fn();

      function CollapsibleComponent() {
        hookReturn = useResizableSidebar({
          defaultWidth: 380,
          minWidth: 250,
          maxWidth: 600,
          width: 0,
          onWidthChange,
          collapsible: true,
          isCollapsed: true,
          onCollapseChange
        });
        return React.createElement('div', null, 'Sidebar');
      }

      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      act(() => {
        root.render(React.createElement(CollapsibleComponent));
      });

      act(() => {
        hookReturn.handleReset();
      });

      expect(onCollapseChange).toHaveBeenCalledWith(false);
      expect(onWidthChange).toHaveBeenCalledWith(380);

      act(() => {
        root.unmount();
      });
      document.body.removeChild(container);
    });
  });
});
