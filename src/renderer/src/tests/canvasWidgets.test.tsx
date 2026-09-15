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
import { CanvasWidgetContainer } from '../components/Viewport/Widgets/CanvasWidgetContainer';

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
      expect(container.textContent).toContain('Soltar en Visor 3D');

      // Abort drag globally (e.g. user releases outside or hits Esc)
      act(() => {
        window.dispatchEvent(new DragEvent('dragend', { bubbles: true }));
      });

      // Overlay MUST be dismissed and not stuck!
      expect(container.textContent).not.toContain('Soltar en Visor 3D');
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

      // Must NOT show external file import modal
      expect(container.textContent).not.toContain('SOLTAR EN VISOR 3D');
      // Instead shows canvas widget drop indicator
      expect(container.textContent).toContain('Soltar para anclar widget');
    });
  });

  describe('Expanded Floating Widgets Rendering', () => {
    it('renders CanvasAnimationWidget with wide timeline, step buttons, speed chips', () => {
      useViewportStore.getState().setAnimations([{ name: 'IdleDance', duration: 4.5 }]);

      act(() => {
        root.render(
          <CanvasWidgetContainer id="animation-controls" title="Estudio de Animación" x={50} y={50}>
            <CanvasAnimationWidget />
          </CanvasWidgetContainer>
        );
      });

      expect(container.textContent).toContain('Estudio de Animación');
      expect(container.textContent).toContain('04.50s');
      expect(container.querySelector('button[title*="Retroceder 0.1s"]')).toBeTruthy();
      expect(container.querySelector('button[title*="Avanzar 0.1s"]')).toBeTruthy();
      expect(container.querySelector('button[title*="Volver al inicio"]')).toBeTruthy();
      expect(container.textContent).toContain('1x');
      expect(container.textContent).toContain('1.5x');
    });

    it('renders CanvasMetrologyWidget with polys, verts, meshes, dimensions, and volume', () => {
      useModelStore.getState().setModelStats({
        triangleCount: 14200,
        vertexCount: 8500,
        meshCount: 4,
        materialCount: 2,
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
        useVariantStore.getState().createVariant('Rojo Carmín');
        useVariantStore.getState().createVariant('Azul Cobalto');
      });

      act(() => {
        root.render(
          <CanvasWidgetContainer id="variant-picker" title="Variantes de Modelo" x={80} y={80}>
            <CanvasVariantWidget />
          </CanvasWidgetContainer>
        );
      });

      expect(container.textContent).toContain('Rojo Carmín');
      expect(container.textContent).toContain('Azul Cobalto');
      expect(container.textContent).toContain('Nueva');
    });

    it('clicking dock back button on CanvasWidgetContainer returns widget to bar', () => {
      useViewportStore.getState().addCanvasWidget('model-stats', 100, 100);

      act(() => {
        root.render(
          <CanvasWidgetContainer id="model-stats" title="Metrología Geométrica" x={100} y={100}>
            <CanvasMetrologyWidget />
          </CanvasWidgetContainer>
        );
      });

      const dockBtn = container.querySelector('button[title*="Anclar nuevamente a la barra"]') as HTMLButtonElement;
      expect(dockBtn).toBeTruthy();

      act(() => {
        dockBtn.click();
      });

      expect(useViewportStore.getState().canvasWidgets).toEqual([]);
      expect(useViewportStore.getState().statusBarItems).toContain('model-stats');
    });
  });
});
