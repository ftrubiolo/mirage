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

      // Must NOT show external file import modal or widget drop indicator
      expect(container.textContent).not.toContain('SOLTAR EN VISOR 3D');
      expect(container.textContent).not.toContain('Soltar para anclar widget');
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

    it('renders CanvasTransformWidget with gizmo mode buttons and coordinate display', () => {
      act(() => {
        root.render(
          <CanvasWidgetContainer id="transform-gizmo" title="Manipulación 3D" x={50} y={50}>
            <CanvasTransformWidget />
          </CanvasWidgetContainer>
        );
      });

      expect(container.textContent).toContain('Cursor');
      expect(container.textContent).toContain('Mover');
      expect(container.textContent).toContain('Rotar');
      expect(container.textContent).toContain('Posición (X, Y, Z)');
      expect(container.textContent).toContain('Alinear base al piso');
    });

    it('renders CanvasLightingWidget with presets and intensity slider', () => {
      act(() => {
        root.render(
          <CanvasWidgetContainer id="lighting-intensity" title="Estudio de Iluminación" x={50} y={50}>
            <CanvasLightingWidget />
          </CanvasWidgetContainer>
        );
      });

      expect(container.textContent).toContain('Estudio');
      expect(container.textContent).toContain('Natural');
      expect(container.textContent).toContain('Dramático');
      expect(container.textContent).toContain('Intensidad de Entorno');
      expect(container.textContent).toContain('Sombras de Contacto');
    });

    it('renders CanvasEnvironmentWidget with presets and background toggle', () => {
      act(() => {
        root.render(
          <CanvasWidgetContainer id="environment-hdri" title="Entornos HDRI" x={50} y={50}>
            <CanvasEnvironmentWidget />
          </CanvasWidgetContainer>
        );
      });

      expect(container.textContent).toContain('Mostrar cielo/fondo 3D');
      expect(container.textContent).toContain('Ciudad');
      expect(container.textContent).toContain('Almacén');
    });

    it('renders CanvasCameraWidget with CAD orientation buttons and FOV', () => {
      act(() => {
        root.render(
          <CanvasWidgetContainer id="camera-orientation" title="Cámara & Vistas CAD" x={50} y={50}>
            <CanvasCameraWidget />
          </CanvasWidgetContainer>
        );
      });

      expect(container.textContent).toContain('Perspectiva');
      expect(container.textContent).toContain('Encuadrar');
      expect(container.textContent).toContain('Orientaciones Estándar CAD');
      expect(container.textContent).toContain('ISO');
    });

    it('renders CanvasChannelWidget with PBR diagnostic channel buttons', () => {
      act(() => {
        root.render(
          <CanvasWidgetContainer id="channel-dropdown" title="Diagnóstico de Canales PBR" x={50} y={50}>
            <CanvasChannelWidget />
          </CanvasWidgetContainer>
        );
      });

      expect(container.textContent).toContain('PBR Completo');
      expect(container.textContent).toContain('Albedo (Color)');
      expect(container.textContent).toContain('Normales');
      expect(container.textContent).toContain('Malla Alámbrica');
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
            <header aria-label="Barra de herramientas del visor 3D">
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
            <header aria-label="Barra de herramientas del visor 3D">
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
});
