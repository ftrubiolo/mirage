import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { useViewportStore, DEFAULT_TOOLBAR_ITEMS, DEFAULT_STATUSBAR_ITEMS } from '../store/viewportStore';
import { useModelStore } from '../store/modelStore';
import { useVariantStore } from '../store/variantStore';
import { Canvas3D } from '../components/Viewport/Canvas3D';
import { CanvasAnimationWidget } from '../components/Viewport/Widgets/CanvasAnimationWidget';
import { CanvasMetrologyWidget } from '../components/Viewport/Widgets/CanvasMetrologyWidget';
import { CanvasVariantWidget } from '../components/Viewport/Widgets/CanvasVariantWidget';
import { CanvasTransformWidget } from '../components/Viewport/Widgets/CanvasTransformWidget';
import { CanvasLightingWidget } from '../components/Viewport/Widgets/CanvasLightingWidget';
import { CanvasEnvironmentWidget } from '../components/Viewport/Widgets/CanvasEnvironmentWidget';
import { CanvasCameraWidget } from '../components/Viewport/Widgets/CanvasCameraWidget';
import { CanvasChannelWidget } from '../components/Viewport/Widgets/CanvasChannelWidget';
import { CanvasWidgetContainer } from '../components/Viewport/Widgets/CanvasWidgetContainer';
import { CanvasWidgetRenderer } from '../components/Viewport/Widgets/CanvasWidgetRenderer';
import { CanvasOverlaysWidget } from '../components/Viewport/Widgets/CanvasOverlaysWidget';
import { CanvasProjectionWidget } from '../components/Viewport/Widgets/CanvasProjectionWidget';
import { CanvasFitModelWidget } from '../components/Viewport/Widgets/CanvasFitModelWidget';
import { CanvasAutoRotateWidget } from '../components/Viewport/Widgets/CanvasAutoRotateWidget';
import { CanvasThemeWidget } from '../components/Viewport/Widgets/CanvasThemeWidget';
import { CanvasSnapshotWidget } from '../components/Viewport/Widgets/CanvasSnapshotWidget';
import { ToolbarItemWrapper } from '../components/Viewport/ToolbarItems/ToolbarItemWrapper';
import { LightingIntensityItem } from '../components/Viewport/ToolbarItems/LightingIntensityItem';
import { FitModelItem } from '../components/Viewport/ToolbarItems/FitModelItem';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('Canvas Floating Widgets & Drag Overlay Isolation', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    useViewportStore.getState().resetAllBars();
    useViewportStore.getState().resetAnimationState();
    useViewportStore.setState({
      canvasTransformMode: 'full',
      canvasTransformOrientation: 'horizontal',
      canvasEnvironmentMode: 'list'
    });
    useModelStore.getState().resetModel();
    useVariantStore.getState().resetVariants();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  describe('ViewportStore Canvas Widgets State & Actions', () => {
    it('initializes with empty canvasWidgets', () => {
      expect(useViewportStore.getState().canvasWidgets).toEqual([]);
    });

    it('addCanvasWidget removes item from source bar and adds to canvasWidgets', () => {
      expect(useViewportStore.getState().statusBarItems).toContain('animation-controls');

      act(() => {
        useViewportStore.getState().addCanvasWidget('animation-controls', 150, 200);
      });

      const s = useViewportStore.getState();
      expect(s.statusBarItems).not.toContain('animation-controls');
      expect(s.canvasWidgets).toEqual([{ id: 'animation-controls', x: 150, y: 200 }]);
    });

    it('removeCanvasWidget docks widget back into default status bar and removes from canvas', () => {
      act(() => {
        useViewportStore.getState().addCanvasWidget('animation-controls', 100, 100);
      });

      expect(useViewportStore.getState().canvasWidgets.length).toBe(1);

      act(() => {
        useViewportStore.getState().removeCanvasWidget('animation-controls');
      });

      const s = useViewportStore.getState();
      expect(s.canvasWidgets).toEqual([]);
      expect(s.statusBarItems).toContain('animation-controls');
    });

    it('updateCanvasWidgetPosition modifies coordinates of existing widget', () => {
      act(() => {
        useViewportStore.getState().addCanvasWidget('model-stats', 50, 50);
        useViewportStore.getState().updateCanvasWidgetPosition('model-stats', 220, 310);
      });

      expect(useViewportStore.getState().canvasWidgets).toEqual([
        { id: 'model-stats', x: 220, y: 310 }
      ]);
    });

    it('moveBarItem removes item from canvasWidgets when item is dragged into a bar', () => {
      act(() => {
        useViewportStore.getState().addCanvasWidget('model-stats', 100, 100);
      });

      expect(useViewportStore.getState().canvasWidgets.length).toBe(1);

      act(() => {
        useViewportStore.getState().moveBarItem('model-stats', 'toolbar' as any, 'toolbar', 0);
      });

      expect(useViewportStore.getState().canvasWidgets).toEqual([]);
      expect(useViewportStore.getState().toolbarItems[0]).toBe('model-stats');
    });

    it('resetAllBars restores default bars and clears canvasWidgets', () => {
      act(() => {
        useViewportStore.getState().addCanvasWidget('variant-picker', 80, 80);
      });

      expect(useViewportStore.getState().canvasWidgets.length).toBe(1);

      act(() => {
        useViewportStore.getState().resetAllBars();
      });

      expect(useViewportStore.getState().canvasWidgets).toEqual([]);
      expect(useViewportStore.getState().statusBarItems).toEqual(DEFAULT_STATUSBAR_ITEMS);
      expect(useViewportStore.getState().toolbarItems).toEqual(DEFAULT_TOOLBAR_ITEMS);
    });

    it('persists and restores canvasTransformMode, canvasTransformOrientation, and canvasEnvironmentMode', () => {
      act(() => {
        useViewportStore.getState().setCanvasTransformMode('compressed');
        useViewportStore.getState().setCanvasTransformOrientation('vertical');
        useViewportStore.getState().setCanvasEnvironmentMode('icons');
      });

      const persistable = useViewportStore.getState().getPersistableSettings();
      expect(persistable.canvasTransformMode).toBe('compressed');
      expect(persistable.canvasTransformOrientation).toBe('vertical');
      expect(persistable.canvasEnvironmentMode).toBe('icons');

      // Reset to defaults
      act(() => {
        useViewportStore.setState({
          canvasTransformMode: 'full',
          canvasTransformOrientation: 'horizontal',
          canvasEnvironmentMode: 'list'
        });
      });

      // Apply saved settings
      act(() => {
        useViewportStore.getState().applyPersistedSettings(persistable);
      });

      expect(useViewportStore.getState().canvasTransformMode).toBe('compressed');
      expect(useViewportStore.getState().canvasTransformOrientation).toBe('vertical');
      expect(useViewportStore.getState().canvasEnvironmentMode).toBe('icons');
    });
  });

  describe('Canvas Drag Isolation & Anti-Stuck Reliability', () => {
    it('global window dragend or drop resets drag state to avoid stuck overlay', () => {
      act(() => {
        root.render(<Canvas3D />);
      });

      const stage = container.querySelector('[class*="flex-1 relative"]') as HTMLDivElement;
      expect(stage).toBeTruthy();

      // Simulate dragging an external file
      const dragEnterEv = new DragEvent('dragenter', { bubbles: true, cancelable: true });
      Object.defineProperty(dragEnterEv, 'dataTransfer', {
        value: { types: ['Files'] }
      });

      act(() => {
        stage.dispatchEvent(dragEnterEv);
      });

      // Overlay should show
      expect(container.textContent).toContain('Drop into 3D Viewport');

      // Abort drag globally (e.g. user releases outside or hits Esc)
      act(() => {
        window.dispatchEvent(new DragEvent('dragend', { bubbles: true }));
      });

      // Overlay MUST be dismissed and not stuck!
      expect(container.textContent).not.toContain('Drop into 3D Viewport');
    });

    it('dragging internal toolbar item does NOT trigger external file import modal', () => {
      act(() => {
        root.render(<Canvas3D />);
      });

      const stage = container.querySelector('[class*="flex-1 relative"]') as HTMLDivElement;

      // Simulate dragging a toolbar item
      const dragEnterEv = new DragEvent('dragenter', { bubbles: true, cancelable: true });
      Object.defineProperty(dragEnterEv, 'dataTransfer', {
        value: { types: ['application/x-mirage-bar', 'text/plain'] }
      });

      act(() => {
        stage.dispatchEvent(dragEnterEv);
      });

      // Must NOT show external file import modal or widget drop indicator
      expect(container.textContent).not.toContain('Drop into 3D Viewport');
      expect(container.textContent).not.toContain('Drop to dock widget');
    });
  });

  describe('Expanded Floating Widgets Rendering', () => {
    it('renders CanvasAnimationWidget with wide timeline, step buttons, speed chips', () => {
      useViewportStore.getState().setAnimations([{ name: 'IdleDance', duration: 4.5 }]);

      act(() => {
        root.render(
          <CanvasWidgetContainer id="animation-controls" title="Animation Studio" x={50} y={50}>
            <CanvasAnimationWidget />
          </CanvasWidgetContainer>
        );
      });

      expect(container.querySelector('[title*="Animation Studio"]')).toBeTruthy();
      expect(container.textContent).toContain('04.50s');
      expect(container.querySelector('button[title*="Step back 0.1s"]')).toBeTruthy();
      expect(container.querySelector('button[title*="Step forward 0.1s"]')).toBeTruthy();
      expect(container.querySelector('button[title*="Return to start"]')).toBeTruthy();
      expect(container.textContent).toContain('1x');
      expect(container.textContent).toContain('1.5x');
    });

    it('renders CanvasMetrologyWidget with polys, verts, meshes, dimensions, and volume', () => {
      useModelStore.getState().setModelStats({
        triangleCount: 14200,
        vertexCount: 8500,
        meshCount: 4,
        dimensions: { width: 1.5, height: 2.0, depth: 0.8 },
        materials: ['Wood', 'Metal']
      });

      act(() => {
        root.render(
          <CanvasWidgetContainer id="model-stats" title="Metrología Geométrica" x={100} y={100}>
            <CanvasMetrologyWidget />
          </CanvasWidgetContainer>
        );
      });

      expect(container.textContent).toContain('14,200');
      expect(container.textContent).toContain('8,500');
      expect(container.textContent).toContain('4');
      expect(container.textContent).toContain('1.500m');
      expect(container.textContent).toContain('2.000m');
      expect(container.textContent).toContain('0.800m');
      expect(container.textContent).toContain('2.4000 m³');
    });

    it('renders CanvasVariantWidget with variant cards and add action', () => {
      act(() => {
        useVariantStore.getState().createVariant('Crimson Oxide');
        useVariantStore.getState().createVariant('Cobalt Blue');
      });

      act(() => {
        root.render(
          <CanvasWidgetContainer id="variant-picker" title="Model Variants" x={80} y={80}>
            <CanvasVariantWidget />
          </CanvasWidgetContainer>
        );
      });

      expect(container.textContent).toContain('Crimson Oxide');
      expect(container.textContent).toContain('Cobalt Blue');
      expect(container.textContent).toContain('New');
    });

    it('clicking dock back button on CanvasWidgetContainer returns widget to bar', () => {
      useViewportStore.getState().addCanvasWidget('model-stats', 100, 100);

      act(() => {
        root.render(
          <CanvasWidgetContainer id="model-stats" title="Geometry Metrology" x={100} y={100}>
            <CanvasMetrologyWidget />
          </CanvasWidgetContainer>
        );
      });

      const dockBtn = container.querySelector('button[title*="Dock back to bar"]') as HTMLButtonElement;
      expect(dockBtn).toBeTruthy();

      act(() => {
        dockBtn.click();
      });

      expect(useViewportStore.getState().canvasWidgets).toEqual([]);
      expect(useViewportStore.getState().statusBarItems).toContain('model-stats');
    });

    it('renders CanvasTransformWidget with gizmo mode buttons and coordinate display', () => {
      act(() => {
        root.render(
          <CanvasWidgetContainer id="transform-gizmo" title="3D Gizmo" x={50} y={50}>
            <CanvasTransformWidget />
          </CanvasWidgetContainer>
        );
      });

      expect(container.textContent).toContain('Cursor');
      expect(container.textContent).toContain('Move');
      expect(container.textContent).toContain('Rotate');
      expect(container.textContent).toContain('Position (X, Y, Z)');
      expect(container.textContent).toContain('Snap base to floor');
    });

    it('renders CanvasTransformWidget in compressed mode with only the 3 big buttons (no text, no margin)', () => {
      useViewportStore.setState({ canvasTransformMode: 'compressed', canvasTransformOrientation: 'horizontal' });

      act(() => {
        root.render(
          <CanvasWidgetContainer id="transform-gizmo" title="3D Gizmo" x={50} y={50}>
            <CanvasTransformWidget />
          </CanvasWidgetContainer>
        );
      });

      const compressedView = container.querySelector('[data-testid="canvas-transform-compressed"]');
      expect(compressedView).not.toBeNull();
      expect(container.querySelector('[data-testid="canvas-transform-full"]')).toBeNull();

      // Exactly 3 big icon buttons, NO text
      const buttons = compressedView?.querySelectorAll('button');
      expect(buttons?.length).toBe(3);
      expect(compressedView?.textContent).toBe(''); // No text labels!

      // Verify no red dot indicator inside buttons
      expect(compressedView?.querySelectorAll('span.bg-action').length).toBe(0);

      // Check aria-labels
      const cursorBtn = compressedView?.querySelector('button[aria-label="Cursor"]');
      const moveBtn = compressedView?.querySelector('button[aria-label="Move"]');
      const rotateBtn = compressedView?.querySelector('button[aria-label="Rotate"]');
      expect(cursorBtn).toBeDefined();
      expect(moveBtn).toBeDefined();
      expect(rotateBtn).toBeDefined();

      // Default horizontal orientation
      expect(compressedView?.getAttribute('data-orientation')).toBe('horizontal');

      // Clicking Move button updates transformGizmoMode
      act(() => {
        (moveBtn as HTMLButtonElement)?.click();
      });

      expect(useViewportStore.getState().transformGizmoMode).toBe('translate');
      // Still no red dot indicator
      expect(compressedView?.querySelectorAll('span.bg-action').length).toBe(0);

      // Toggling orientation switches to vertical
      act(() => {
        useViewportStore.getState().toggleCanvasTransformOrientation();
      });

      expect(compressedView?.getAttribute('data-orientation')).toBe('vertical');
    });

    it('renders CanvasTransformWidget in vertical compressed mode with w-[46px] and no empty space', () => {
      useViewportStore.setState({
        canvasTransformMode: 'compressed',
        canvasTransformOrientation: 'vertical'
      });

      act(() => {
        root.render(<CanvasWidgetRenderer id="transform-gizmo" x={100} y={100} />);
      });

      const card = container.querySelector('[data-canvas-widget="transform-gizmo"]');
      expect(card).not.toBeNull();
      expect(card?.classList.contains('w-[46px]')).toBe(true);

      const compressedView = container.querySelector('[data-testid="canvas-transform-compressed"]');
      expect(compressedView?.getAttribute('data-orientation')).toBe('vertical');

      // Buttons have w-full to fill container width without empty space
      const buttons = compressedView?.querySelectorAll('button');
      expect(buttons?.length).toBe(3);
      buttons?.forEach((btn) => {
        expect(btn.classList.contains('w-full')).toBe(true);
      });

      // Expandable header: initially ONLY move handle and "..." icon are visible
      expect(card?.querySelector('[title*="Drag to move"]')).not.toBeNull();
      const moreBtn = card?.querySelector('button[aria-label="More options"]') as HTMLButtonElement;
      expect(moreBtn).not.toBeNull();

      // Action buttons are NOT visible initially
      expect(card?.querySelector('button[title*="Dock back to bar"]')).toBeNull();
      expect(card?.querySelector('button[title*="orientation"]')).toBeNull();
      expect(card?.querySelector('button[title*="coordinates"]')).toBeNull();

      // Click "..." to expand
      act(() => {
        moreBtn.click();
      });

      // Action buttons are NOW visible in the expanded row
      expect(card?.querySelector('button[title*="Dock back to bar"]')).not.toBeNull();
      expect(card?.querySelector('button[title*="orientation"]')).not.toBeNull();
      expect(card?.querySelector('button[title*="coordinates"]')).not.toBeNull();

      // Click "..." to collapse again
      act(() => {
        moreBtn.click();
      });

      // Actions are collapsed again
      expect(card?.querySelector('button[title*="Dock back to bar"]')).toBeNull();
      expect(card?.querySelector('button[title*="orientation"]')).toBeNull();
      expect(card?.querySelector('button[title*="coordinates"]')).toBeNull();
    });

    it('toggles CanvasTransformWidget between full and compressed mode', () => {
      useViewportStore.setState({ canvasTransformMode: 'full' });

      act(() => {
        root.render(
          <CanvasWidgetContainer id="transform-gizmo" title="Manipulación 3D" x={50} y={50}>
            <CanvasTransformWidget />
          </CanvasWidgetContainer>
        );
      });

      expect(container.querySelector('[data-testid="canvas-transform-full"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="canvas-transform-compressed"]')).toBeNull();

      act(() => {
        useViewportStore.getState().toggleCanvasTransformMode();
      });

      expect(container.querySelector('[data-testid="canvas-transform-compressed"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="canvas-transform-full"]')).toBeNull();
    });

    it('renders CanvasLightingWidget with presets and intensity slider', () => {
      act(() => {
        root.render(
          <CanvasWidgetContainer id="lighting-intensity" title="Lighting Studio" x={50} y={50}>
            <CanvasLightingWidget />
          </CanvasWidgetContainer>
        );
      });

      expect(container.textContent).toContain('Studio');
      expect(container.textContent).toContain('Natural');
      expect(container.textContent).toContain('Dramatic');
      expect(container.textContent).toContain('Environment Intensity');
      expect(container.textContent).toContain('Contact Shadows');
    });

    it('renders CanvasEnvironmentWidget with presets and background toggle', () => {
      act(() => {
        root.render(
          <CanvasWidgetContainer id="environment-hdri" title="HDRI Environments" x={50} y={50}>
            <CanvasEnvironmentWidget />
          </CanvasWidgetContainer>
        );
      });

      expect(container.textContent).toContain('Show 3D sky/background');
      expect(container.textContent).toContain('City');
      expect(container.textContent).toContain('Warehouse');
    });

    it('renders CanvasEnvironmentWidget in compressed mode with big icons only', () => {
      useViewportStore.setState({ canvasEnvironmentMode: 'icons' });

      act(() => {
        root.render(
          <CanvasWidgetContainer id="environment-hdri" title="HDRI Environments" x={50} y={50}>
            <CanvasEnvironmentWidget />
          </CanvasWidgetContainer>
        );
      });

      const compressedView = container.querySelector('[data-testid="canvas-env-compressed"]');
      expect(compressedView).not.toBeNull();

      // Check all 8 preset big-icon buttons exist
      const presetButtons = compressedView?.querySelectorAll('button[aria-label]');
      expect(presetButtons?.length).toBe(8);

      const cityBtn = Array.from(presetButtons || []).find((b) => b.getAttribute('aria-label') === 'City');
      const studioBtn = Array.from(presetButtons || []).find((b) => b.getAttribute('aria-label') === 'Studio');
      expect(cityBtn).toBeDefined();
      expect(studioBtn).toBeDefined();

      // Clicking a preset button updates environmentPreset
      act(() => {
        (studioBtn as HTMLButtonElement)?.click();
      });

      expect(useViewportStore.getState().environmentPreset).toBe('studio');
    });

    it('toggles between list and compressed icons mode via toggleCanvasEnvironmentMode', () => {
      useViewportStore.setState({ canvasEnvironmentMode: 'list' });

      act(() => {
        root.render(
          <CanvasWidgetContainer id="environment-hdri" title="Entornos HDRI" x={50} y={50}>
            <CanvasEnvironmentWidget />
          </CanvasWidgetContainer>
        );
      });

      expect(container.querySelector('[data-testid="canvas-env-list"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="canvas-env-compressed"]')).toBeNull();

      act(() => {
        useViewportStore.getState().toggleCanvasEnvironmentMode();
      });

      expect(container.querySelector('[data-testid="canvas-env-compressed"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="canvas-env-list"]')).toBeNull();
    });

    it('renders CanvasCameraWidget with CAD orientation buttons and FOV', () => {
      act(() => {
        root.render(
          <CanvasWidgetContainer id="camera-orientation" title="Camera & CAD Views" x={50} y={50}>
            <CanvasCameraWidget />
          </CanvasWidgetContainer>
        );
      });

      expect(container.textContent).toContain('Perspective');
      expect(container.textContent).toContain('Fit');
      expect(container.textContent).toContain('Standard CAD Views');
      expect(container.textContent).toContain('ISO');
    });

    it('renders CanvasChannelWidget with PBR diagnostic channel buttons', () => {
      act(() => {
        root.render(
          <CanvasWidgetContainer id="channel-dropdown" title="PBR Channel Diagnostics" x={50} y={50}>
            <CanvasChannelWidget />
          </CanvasWidgetContainer>
        );
      });

      expect(container.textContent).toContain('Full PBR');
      expect(container.textContent).toContain('Albedo (Color)');
      expect(container.textContent).toContain('Normals');
      expect(container.textContent).toContain('Wireframe');
    });
  });

  describe('Edge Snapping and Docking Mechanics', () => {
    it('snaps to edge when pointer drag is within threshold and allows edge sliding', () => {
      useViewportStore.getState().addCanvasWidget('model-stats', 100, 100);

      act(() => {
        root.render(
          <CanvasWidgetContainer
            id="model-stats"
            title="Metrología Geométrica"
            x={100}
            y={100}
            containerBounds={{ width: 800, height: 600 }}
          >
            <CanvasMetrologyWidget />
          </CanvasWidgetContainer>
        );
      });

      const handle = container.querySelector('.cursor-grab') as HTMLDivElement;
      expect(handle).toBeTruthy();

      // Start drag at x: 100, y: 100
      act(() => {
        handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 100 }));
      });

      // Move within snap threshold of left edge (x=10, which is < 20px threshold)
      act(() => {
        window.dispatchEvent(new PointerEvent('pointermove', { clientX: 10, clientY: 250 }));
      });

      // Should snap flush to x=0, while y slides to 250
      const card = container.querySelector('[data-canvas-widget="model-stats"]') as HTMLDivElement;
      expect(card.style.transform).toBe('translate3d(0px, 250px, 0)');

      act(() => {
        window.dispatchEvent(new PointerEvent('pointerup', { clientX: 10, clientY: 250 }));
      });

      expect(useViewportStore.getState().canvasWidgets[0]).toEqual({
        id: 'model-stats',
        x: 0,
        y: 250
      });
    });

    it('snaps widgets to each other (side-by-side and top-to-bottom) with magnetic alignment and highlights', () => {
      // Widget A (overlays) already on canvas at (100, 100)
      useViewportStore.getState().addCanvasWidget('overlays', 100, 100);
      // Widget B (fit-model) on canvas at (300, 300)
      useViewportStore.getState().addCanvasWidget('fit-model', 300, 300);

      act(() => {
        root.render(
          <div style={{ width: 800, height: 600, position: 'relative' }}>
            <CanvasWidgetRenderer id="overlays" x={100} y={100} containerBounds={{ width: 800, height: 600 }} />
            <CanvasWidgetRenderer id="fit-model" x={300} y={300} containerBounds={{ width: 800, height: 600 }} />
          </div>
        );
      });

      const cardA = container.querySelector('[data-canvas-widget="overlays"]') as HTMLElement;
      const cardB = container.querySelector('[data-canvas-widget="fit-model"]') as HTMLElement;
      expect(cardA).toBeTruthy();
      expect(cardB).toBeTruthy();
      expect(cardA.className).toContain('rounded-none');
      expect(cardA.className).not.toContain('rounded-xs');
      expect(cardB.className).toContain('rounded-none');
      expect(cardB.className).not.toContain('rounded-xs');

      // Mock bounds for cardA: left=100, top=100, width=46, height=120, right=146, bottom=220
      cardA.getBoundingClientRect = () => ({
        left: 100,
        right: 146,
        top: 100,
        bottom: 220,
        width: 46,
        height: 120,
        x: 100,
        y: 100,
        toJSON: () => {}
      });
      cardB.getBoundingClientRect = () => ({
        left: 300,
        right: 346,
        top: 300,
        bottom: 420,
        width: 46,
        height: 120,
        x: 300,
        y: 300,
        toJSON: () => {}
      });

      const handleB = cardB.querySelector('.cursor-grab') as HTMLDivElement;
      expect(handleB).toBeTruthy();

      // 1. Drag Card B near the right edge of Card A: rawX = 150 (near 146), rawY = 105 (near top=100)
      act(() => {
        handleB.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 300, clientY: 300 }));
      });

      act(() => {
        window.dispatchEvent(new PointerEvent('pointermove', { clientX: 150, clientY: 105 }));
      });

      // Card B should snap flush to right edge of Card A (x=146) and align top edges (y=100)
      expect(cardB.style.transform).toBe('translate3d(146px, 100px, 0)');
      expect(cardB.getAttribute('data-snapped')).toBe('widget');
      expect(cardB.className).toContain('border-action');

      // Release pointer to persist snapped position
      act(() => {
        window.dispatchEvent(new PointerEvent('pointerup', { clientX: 150, clientY: 105 }));
      });

      const widgetBState = useViewportStore.getState().canvasWidgets.find((w) => w.id === 'fit-model');
      expect(widgetBState).toEqual({ id: 'fit-model', x: 146, y: 100 });

      // 2. Drag Card B below Card A: rawX = 104 (near left=100), rawY = 228 (near bottom=220)
      act(() => {
        handleB.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 146, clientY: 100 }));
      });

      act(() => {
        window.dispatchEvent(new PointerEvent('pointermove', { clientX: 104, clientY: 228 }));
      });

      // Card B should snap below Card A (y=220) and align left edges (x=100)
      expect(cardB.style.transform).toBe('translate3d(100px, 220px, 0)');
      expect(cardB.getAttribute('data-snapped')).toBe('widget');

      act(() => {
        window.dispatchEvent(new PointerEvent('pointerup', { clientX: 104, clientY: 228 }));
      });

      expect(useViewportStore.getState().canvasWidgets.find((w) => w.id === 'fit-model')).toEqual({
        id: 'fit-model',
        x: 100,
        y: 220
      });
    });

    it('docks to top toolbar when pointer is dragged to screen top (y <= 52)', () => {
      useViewportStore.getState().addCanvasWidget('model-stats', 200, 200);

      act(() => {
        root.render(
          <CanvasWidgetContainer
            id="model-stats"
            title="Metrología Geométrica"
            x={200}
            y={200}
            containerBounds={{ width: 800, height: 600 }}
          >
            <CanvasMetrologyWidget />
          </CanvasWidgetContainer>
        );
      });

      const handle = container.querySelector('.cursor-grab') as HTMLDivElement;

      // Start drag
      act(() => {
        handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 200, clientY: 200 }));
      });

      // Drag up to top toolbar zone (clientY = 30 <= 52)
      act(() => {
        window.dispatchEvent(new PointerEvent('pointermove', { clientX: 200, clientY: 30 }));
      });

      // Card should have dock highlight class
      const card = container.querySelector('[data-canvas-widget="model-stats"]') as HTMLDivElement;
      expect(card.className).toContain('ring-action');

      // Release pointer
      act(() => {
        window.dispatchEvent(new PointerEvent('pointerup', { clientX: 200, clientY: 30 }));
      });

      // Widget should be docked into toolbar and removed from canvasWidgets
      expect(useViewportStore.getState().canvasWidgets).toEqual([]);
      expect(useViewportStore.getState().toolbarItems).toContain('model-stats');
    });

    it('docks to bottom statusbar when pointer is dragged to bottom screen area', () => {
      useViewportStore.getState().addCanvasWidget('animation-controls', 200, 200);

      act(() => {
        root.render(
          <CanvasWidgetContainer
            id="animation-controls"
            title="Estudio de Animación"
            x={200}
            y={200}
            containerBounds={{ width: 800, height: 600 }}
          >
            <CanvasAnimationWidget />
          </CanvasWidgetContainer>
        );
      });

      const handle = container.querySelector('.cursor-grab') as HTMLDivElement;

      // Start drag
      act(() => {
        handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 200, clientY: 200 }));
      });

      // Drag to bottom statusbar zone (rawY > maxH + 15)
      act(() => {
        window.dispatchEvent(new PointerEvent('pointermove', { clientX: 200, clientY: window.innerHeight - 30 }));
      });

      // Card should have dock highlight class
      const card = container.querySelector('[data-canvas-widget="animation-controls"]') as HTMLDivElement;
      expect(card.className).toContain('ring-action');

      // Release pointer
      act(() => {
        window.dispatchEvent(new PointerEvent('pointerup', { clientX: 200, clientY: window.innerHeight - 30 }));
      });

      // Widget should be docked into statusbar and removed from canvasWidgets
      expect(useViewportStore.getState().canvasWidgets).toEqual([]);
      expect(useViewportStore.getState().statusBarItems).toContain('animation-controls');
    });
  });

  describe('Toolbar Item Dragging vs Range Slider Scrubbing', () => {
    it('allows dragging buttons while keeping range sliders protected from drag', () => {
      act(() => {
        root.render(
          <div>
            <ToolbarItemWrapper itemId="fit-model" index={0} bar="toolbar">
              <FitModelItem />
            </ToolbarItemWrapper>
            <ToolbarItemWrapper itemId="lighting-intensity" index={1} bar="toolbar">
              <LightingIntensityItem />
            </ToolbarItemWrapper>
          </div>
        );
      });

      // Button wrapper should be draggable
      const fitWrapper = container.querySelector('[data-toolbar-item="fit-model"]') as HTMLDivElement;
      expect(fitWrapper.getAttribute('draggable')).toBe('true');

      const button = fitWrapper.querySelector('button') as HTMLButtonElement;
      expect(button).toBeTruthy();

      // Triggering pointer down on button keeps it draggable
      act(() => {
        button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      });
      expect(fitWrapper.getAttribute('draggable')).toBe('true');

      // Slider wrapper: interacting with input[type="range"] disables draggable synchronously
      const lightWrapper = container.querySelector('[data-toolbar-item="lighting-intensity"]') as HTMLDivElement;
      const rangeInput = lightWrapper.querySelector('input[type="range"]') as HTMLInputElement;
      expect(rangeInput).toBeTruthy();

      act(() => {
        rangeInput.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      });
      expect(lightWrapper.getAttribute('draggable')).toBe('false');

      // Releasing pointer restores draggable
      act(() => {
        window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      });
      expect(lightWrapper.getAttribute('draggable')).toBe('true');
    });
  });

  describe('Seamless Canvas-to-Bar Drag Transition', () => {
    it('pops into compact bar preview and highlights insertion slot when dragged to toolbar', () => {
      useViewportStore.getState().resetAllBars();
      useViewportStore.getState().addCanvasWidget('model-stats', 200, 200);

      act(() => {
        root.render(
          <div>
            <header aria-label="3D viewport toolbar">
              <ToolbarItemWrapper itemId="fit-model" index={0} bar="toolbar">
                <FitModelItem />
              </ToolbarItemWrapper>
              <ToolbarItemWrapper itemId="lighting-intensity" index={1} bar="toolbar">
                <LightingIntensityItem />
              </ToolbarItemWrapper>
            </header>
            <CanvasWidgetContainer
              id="model-stats"
              title="Metrología Geométrica"
              x={200}
              y={200}
              containerBounds={{ width: 800, height: 600 }}
            >
              <CanvasMetrologyWidget />
            </CanvasWidgetContainer>
          </div>
        );
      });

      // Mock getBoundingClientRect for header and items so slot calculation can test before/after
      const header = container.querySelector('header') as HTMLElement;
      header.getBoundingClientRect = () => ({
        left: 0,
        right: 800,
        width: 800,
        top: 0,
        bottom: 36,
        height: 36,
        x: 0,
        y: 0,
        toJSON: () => {}
      });

      const fitWrapper = container.querySelector('[data-bar-item="fit-model"]') as HTMLElement;
      const lightWrapper = container.querySelector('[data-bar-item="lighting-intensity"]') as HTMLElement;
      fitWrapper.getBoundingClientRect = () => ({
        left: 10,
        right: 50,
        width: 40,
        top: 0,
        bottom: 36,
        height: 36,
        x: 10,
        y: 0,
        toJSON: () => {}
      });
      lightWrapper.getBoundingClientRect = () => ({
        left: 60,
        right: 120,
        width: 60,
        top: 0,
        bottom: 36,
        height: 36,
        x: 60,
        y: 0,
        toJSON: () => {}
      });

      const handle = container.querySelector('.cursor-grab') as HTMLDivElement;

      // Start drag
      act(() => {
        handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 200, clientY: 200 }));
      });

      // Drag into toolbar zone at clientX = 20 (before midpoint of fit-model: 10 + 20 = 30)
      act(() => {
        window.dispatchEvent(new PointerEvent('pointermove', { clientX: 20, clientY: 20 }));
      });

      // Big canvas card should be hidden (popped)
      const card = container.querySelector('[data-canvas-widget="model-stats"]') as HTMLDivElement;
      expect(card.style.opacity).toBe('0');

      // Compact preview should exist in document.body
      const preview = document.querySelector('[data-canvas-widget-drag-preview="model-stats"]') as HTMLDivElement;
      expect(preview).toBeTruthy();
      expect(preview.style.display).not.toBe('none');

      // Slot indicator should be active on fit-model
      expect(useViewportStore.getState().barDropTarget).toEqual({
        bar: 'toolbar',
        targetItemId: 'fit-model',
        position: 'before',
        targetIndex: 0
      });

      // Dropping should insert model-stats at beginning
      act(() => {
        window.dispatchEvent(new PointerEvent('pointerup', { clientX: 20, clientY: 20 }));
      });

      expect(useViewportStore.getState().canvasWidgets).toEqual([]);
      const fitIdx = useViewportStore.getState().toolbarItems.indexOf('fit-model');
      expect(fitIdx).toBeGreaterThan(0);
      expect(useViewportStore.getState().toolbarItems[fitIdx - 1]).toBe('model-stats');
    });

    it('cancels popped preview and restores canvas card when dragged back into canvas', () => {
      useViewportStore.getState().resetAllBars();
      useViewportStore.getState().addCanvasWidget('model-stats', 200, 200);

      act(() => {
        root.render(
          <div>
            <header aria-label="3D viewport toolbar">
              <ToolbarItemWrapper itemId="fit-model" index={0} bar="toolbar">
                <FitModelItem />
              </ToolbarItemWrapper>
            </header>
            <CanvasWidgetContainer
              id="model-stats"
              title="Metrología Geométrica"
              x={200}
              y={200}
              containerBounds={{ width: 800, height: 600 }}
            >
              <CanvasMetrologyWidget />
            </CanvasWidgetContainer>
          </div>
        );
      });

      const header = container.querySelector('header') as HTMLElement;
      header.getBoundingClientRect = () => ({
        left: 0,
        right: 800,
        width: 800,
        top: 0,
        bottom: 36,
        height: 36,
        x: 0,
        y: 0,
        toJSON: () => {}
      });

      const handle = container.querySelector('.cursor-grab') as HTMLDivElement;

      // Start drag
      act(() => {
        handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 200, clientY: 200 }));
      });

      // Move into toolbar zone (clientY = 10 <= 36)
      act(() => {
        window.dispatchEvent(new PointerEvent('pointermove', { clientX: 20, clientY: 10 }));
      });
      const card = container.querySelector('[data-canvas-widget="model-stats"]') as HTMLDivElement;
      expect(card.style.opacity).toBe('0');

      // Move back down into canvas (clientY = 250)
      act(() => {
        window.dispatchEvent(new PointerEvent('pointermove', { clientX: 250, clientY: 250 }));
      });

      // Card should be visible again
      expect(card.style.opacity).toBe('1');
      expect(useViewportStore.getState().barDropTarget).toBeNull();

      // Release in canvas
      act(() => {
        window.dispatchEvent(new PointerEvent('pointerup', { clientX: 250, clientY: 250 }));
      });

      // Widget remains on canvas at new position
      expect(useViewportStore.getState().canvasWidgets.length).toBe(1);
      expect(useViewportStore.getState().canvasWidgets[0].id).toBe('model-stats');
    });
  });

  describe('Dedicated Canvas Widgets (Overlays, Projection, FitModel, AutoRotate, Theme, Snapshot)', () => {
    it('renders overlays in compressed mode by default and expands actions on clicking ...', () => {
      act(() => {
        root.render(<CanvasWidgetRenderer id="overlays" x={50} y={50} />);
      });

      // Default compressed rendering
      const compressed = container.querySelector('[data-testid="canvas-overlays-compressed"]');
      expect(compressed).toBeTruthy();

      // Only Grip and "..." button are visible initially
      expect(container.querySelector('button[aria-label="More options"]')).toBeTruthy();
      expect(container.querySelector('button[aria-label="Toggle orientation"]')).toBeFalsy();

      // Click "..." to expand header actions
      const moreBtn = container.querySelector('button[aria-label="More options"]') as HTMLButtonElement;
      act(() => {
        moreBtn.click();
      });

      // Now orientation and mode toggle buttons are visible
      const orientBtn = container.querySelector('button[aria-label="Toggle orientation"]') as HTMLButtonElement;
      const modeBtn = container.querySelector('button[aria-label="Toggle widget mode"]') as HTMLButtonElement;
      expect(orientBtn).toBeTruthy();
      expect(modeBtn).toBeTruthy();

      // Toggle orientation to vertical
      act(() => {
        orientBtn.click();
      });
      expect(useViewportStore.getState().getCanvasWidgetOrientation('overlays')).toBe('vertical');
      const card = container.querySelector('[data-canvas-widget="overlays"]') as HTMLElement;
      expect(card.className).toContain('w-[46px]');

      // Toggle mode to full using the freshly rendered button in the vertical header
      const liveModeBtn = container.querySelector('button[aria-label="Toggle widget mode"]') as HTMLButtonElement;
      expect(liveModeBtn).toBeTruthy();
      act(() => {
        liveModeBtn.click();
      });
      expect(useViewportStore.getState().getCanvasWidgetMode('overlays')).toBe('full');
      expect(container.querySelector('[data-testid="canvas-overlays-full"]')).toBeTruthy();
    });

    it('CanvasOverlaysWidget controls work in both compressed and full mode', () => {
      // Test compressed mode toggles
      act(() => {
        root.render(<CanvasOverlaysWidget id="overlays" mode="compressed" orientation="horizontal" />);
      });

      const gridBtn = container.querySelector('button[aria-label="Viewport grid"]') as HTMLButtonElement;
      const dimBtn = container.querySelector('button[aria-label="3D dimensions & guides"]') as HTMLButtonElement;
      const shadowBtn = container.querySelector('button[aria-label="Contact shadows"]') as HTMLButtonElement;
      const wireBtn = container.querySelector('button[aria-label="Wireframe mesh"]') as HTMLButtonElement;

      expect(gridBtn).toBeTruthy();
      expect(dimBtn).toBeTruthy();
      expect(shadowBtn).toBeTruthy();
      expect(wireBtn).toBeTruthy();

      const initialDim = useViewportStore.getState().showDimensions;
      act(() => {
        dimBtn.click();
      });
      expect(useViewportStore.getState().showDimensions).toBe(!initialDim);

      const initialWire = useViewportStore.getState().showWireframe;
      act(() => {
        wireBtn.click();
      });
      expect(useViewportStore.getState().showWireframe).toBe(!initialWire);

      // Test full mode slider and reset defaults
      act(() => {
        root.render(<CanvasOverlaysWidget id="overlays" mode="full" orientation="horizontal" />);
      });

      expect(container.querySelector('[data-testid="canvas-overlays-full"]')).toBeTruthy();
      const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
      expect(slider).toBeTruthy();

      act(() => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        setter?.call(slider, '0.85');
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        slider.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(useViewportStore.getState().contactShadowOpacity).toBeCloseTo(0.85);

      const resetBtn = container.querySelector('button[title*="Reset"]') as HTMLButtonElement;
      expect(resetBtn).toBeTruthy();
      act(() => {
        resetBtn.click();
      });
      expect(useViewportStore.getState().showGrid).toBe(true);
      expect(useViewportStore.getState().showDimensions).toBe(false);
      expect(useViewportStore.getState().contactShadowOpacity).toBe(0.4);
    });

    it('CanvasProjectionWidget toggles between perspective and orthographic with optical focal chips', () => {
      act(() => {
        root.render(<CanvasProjectionWidget id="projection-toggle" mode="compressed" orientation="horizontal" />);
      });

      const perspBtn = container.querySelector('button[aria-label="Perspective"]') as HTMLButtonElement;
      const ortoBtn = container.querySelector('button[aria-label="Orthographic"]') as HTMLButtonElement;
      expect(perspBtn).toBeTruthy();
      expect(ortoBtn).toBeTruthy();

      act(() => {
        ortoBtn.click();
      });
      expect(useViewportStore.getState().isOrthographic).toBe(true);

      act(() => {
        perspBtn.click();
      });
      expect(useViewportStore.getState().isOrthographic).toBe(false);

      // Render full mode
      act(() => {
        root.render(<CanvasProjectionWidget id="projection-toggle" mode="full" orientation="horizontal" />);
      });

      expect(container.textContent).toContain('Field of View (FOV)');
      const chip85 = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('85mm'));
      expect(chip85).toBeTruthy();
      act(() => {
        chip85?.click();
      });
      expect(useViewportStore.getState().cameraFov).toBe(24);
      expect(useViewportStore.getState().isOrthographic).toBe(false);
    });

    it('CanvasFitModelWidget triggers fit, origin center, camera reset, and zoom actions', () => {
      act(() => {
        root.render(<CanvasFitModelWidget id="fit-model" mode="compressed" orientation="horizontal" />);
      });

      const fitBtn = container.querySelector('button[aria-label="Reframe 1:1"]') as HTMLButtonElement;
      const originBtn = container.querySelector('button[aria-label="Center to origin"]') as HTMLButtonElement;
      const resetCamBtn = container.querySelector('button[aria-label="Reset camera"]') as HTMLButtonElement;
      expect(fitBtn).toBeTruthy();
      expect(originBtn).toBeTruthy();
      expect(resetCamBtn).toBeTruthy();

      const prevFit = useViewportStore.getState().fitToModelCounter;
      act(() => {
        fitBtn.click();
      });
      expect(useViewportStore.getState().fitToModelCounter).toBe(prevFit + 1);

      act(() => {
        originBtn.click();
      });
      expect(useViewportStore.getState().focusPoint).toEqual([0, 0, 0]);

      const prevReset = useViewportStore.getState().resetCameraCounter;
      act(() => {
        resetCamBtn.click();
      });
      expect(useViewportStore.getState().resetCameraCounter).toBe(prevReset + 1);

      // Full mode zoom buttons
      act(() => {
        root.render(<CanvasFitModelWidget id="fit-model" mode="full" orientation="horizontal" />);
      });

      const zoomInBtn = container.querySelector('button[aria-label="Zoom in"]') as HTMLButtonElement;
      const zoomOutBtn = container.querySelector('button[aria-label="Zoom out"]') as HTMLButtonElement;
      const prevZoom = useViewportStore.getState().cameraZoomAction;

      act(() => {
        zoomInBtn.click();
      });
      expect(useViewportStore.getState().cameraZoomAction).toBe(prevZoom + 1);

      act(() => {
        zoomOutBtn.click();
      });
      expect(useViewportStore.getState().cameraZoomAction).toBe(prevZoom);
    });

    it('CanvasAutoRotateWidget controls turntable playback, signed direction, and speed presets', () => {
      act(() => {
        root.render(<CanvasAutoRotateWidget id="auto-rotate" mode="compressed" orientation="horizontal" />);
      });

      const playBtn = container.querySelector('button[aria-label="Play or pause orbit"]') as HTMLButtonElement;
      const dirBtn = container.querySelector('button[aria-label="Reverse direction"]') as HTMLButtonElement;
      const speedBtn = container.querySelector('button[aria-label="Toggle speed"]') as HTMLButtonElement;

      expect(playBtn).toBeTruthy();
      expect(dirBtn).toBeTruthy();
      expect(speedBtn).toBeTruthy();

      const prevAuto = useViewportStore.getState().autoRotate;
      act(() => {
        playBtn.click();
      });
      expect(useViewportStore.getState().autoRotate).toBe(!prevAuto);

      const prevSpeed = useViewportStore.getState().autoRotateSpeed;
      act(() => {
        dirBtn.click();
      });
      expect(useViewportStore.getState().autoRotateSpeed).toBe(-prevSpeed);

      act(() => {
        speedBtn.click();
      });
      expect(Math.abs(useViewportStore.getState().autoRotateSpeed)).toBeGreaterThan(1);

      // Full mode speed presets
      act(() => {
        root.render(<CanvasAutoRotateWidget id="auto-rotate" mode="full" orientation="horizontal" />);
      });

      const chip025 = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.trim() === '0.25x');
      expect(chip025).toBeTruthy();
      act(() => {
        chip025?.click();
      });
      expect(Math.abs(useViewportStore.getState().autoRotateSpeed)).toBeCloseTo(0.25);
    });

    it('CanvasThemeWidget switches dark/light studio backdrop and toggles HDRI sky', () => {
      act(() => {
        root.render(<CanvasThemeWidget id="theme-toggle" mode="compressed" orientation="horizontal" />);
      });

      const darkBtn = container.querySelector('button[aria-label="Dark Mode"]') as HTMLButtonElement;
      const lightBtn = container.querySelector('button[aria-label="Light Mode"]') as HTMLButtonElement;

      expect(darkBtn).toBeTruthy();
      expect(lightBtn).toBeTruthy();

      act(() => {
        lightBtn.click();
      });
      expect(useViewportStore.getState().viewportTheme).toBe('light');

      act(() => {
        darkBtn.click();
      });
      expect(useViewportStore.getState().viewportTheme).toBe('dark');

      // Full mode
      act(() => {
        root.render(<CanvasThemeWidget id="theme-toggle" mode="full" orientation="horizontal" />);
      });

      const skyBtn = (container.querySelector('button[type="button"]:has-text("ACTIVE"), button[type="button"]:has-text("SOLID")') ||
        Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('ACTIVE') || b.textContent?.includes('SOLID'))) as HTMLButtonElement | undefined;
      expect(skyBtn).toBeTruthy();

      const prevSky = useViewportStore.getState().showEnvironmentBackground;
      act(() => {
        skyBtn?.click();
      });
      expect(useViewportStore.getState().showEnvironmentBackground).toBe(!prevSky);
    });

    it('CanvasSnapshotWidget provides instant capture, format selection, and transparency toggle', () => {
      act(() => {
        root.render(<CanvasSnapshotWidget id="snapshot-button" mode="compressed" orientation="horizontal" />);
      });

      const transBtn = container.querySelector('button[aria-label="Toggle transparent background"]') as HTMLButtonElement;
      expect(transBtn).toBeTruthy();

      const prevTrans = useViewportStore.getState().snapshotTransparent;
      act(() => {
        transBtn.click();
      });
      expect(useViewportStore.getState().snapshotTransparent).toBe(!prevTrans);

      // Full mode
      act(() => {
        root.render(<CanvasSnapshotWidget id="snapshot-button" mode="full" orientation="horizontal" />);
      });

      // Select 4K resolution
      const chip4k = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('4K UHD'));
      expect(chip4k).toBeTruthy();
      act(() => {
        chip4k?.click();
      });
      expect(useViewportStore.getState().snapshotResolution).toBe('4k');

      // Select WebP format
      const webpBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'WEBP');
      expect(webpBtn).toBeTruthy();
      act(() => {
        webpBtn?.click();
      });
      expect(useViewportStore.getState().snapshotFormat).toBe('webp');
    });

    it('persists and restores all canvas widget modes, orientations, autoRotateSpeed, and snapshot options', () => {
      act(() => {
        useViewportStore.getState().setCanvasWidgetMode('overlays', 'full');
        useViewportStore.getState().setCanvasWidgetOrientation('overlays', 'vertical');
        useViewportStore.getState().setCanvasWidgetMode('projection-toggle', 'compressed');
        useViewportStore.getState().setAutoRotateSpeed(2.4);
        useViewportStore.getState().setSnapshotResolution('square');
        useViewportStore.getState().setSnapshotTransparent(true);
        useViewportStore.getState().setSnapshotFormat('webp');
      });

      const persistable = useViewportStore.getState().getPersistableSettings();
      expect(persistable.canvasWidgetModes?.['overlays']).toBe('full');
      expect(persistable.canvasWidgetOrientations?.['overlays']).toBe('vertical');
      expect(persistable.autoRotateSpeed).toBe(2.4);
      expect(persistable.snapshotResolution).toBe('square');
      expect(persistable.snapshotTransparent).toBe(true);
      expect(persistable.snapshotFormat).toBe('webp');

      // Reset store
      act(() => {
        useViewportStore.setState({
          canvasWidgetModes: {},
          canvasWidgetOrientations: {},
          autoRotateSpeed: 0.7,
          snapshotResolution: '1080p',
          snapshotTransparent: false,
          snapshotFormat: 'png'
        });
      });

      // Apply settings
      act(() => {
        useViewportStore.getState().applyPersistedSettings(persistable);
      });

      expect(useViewportStore.getState().getCanvasWidgetMode('overlays')).toBe('full');
      expect(useViewportStore.getState().getCanvasWidgetOrientation('overlays')).toBe('vertical');
      expect(useViewportStore.getState().autoRotateSpeed).toBe(2.4);
      expect(useViewportStore.getState().snapshotResolution).toBe('square');
      expect(useViewportStore.getState().snapshotTransparent).toBe(true);
      expect(useViewportStore.getState().snapshotFormat).toBe('webp');
    });
  });
});

