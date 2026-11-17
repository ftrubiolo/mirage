import React from 'react';
import {
  LayoutGrid,
  List,
  Minimize2,
  Maximize2,
  RectangleHorizontal,
  RectangleVertical
} from 'lucide-react';
import { useViewportStore } from '../../../store/viewportStore';
import { CanvasWidgetContainer } from './CanvasWidgetContainer';
import { CanvasAnimationWidget } from './CanvasAnimationWidget';
import { CanvasMetrologyWidget } from './CanvasMetrologyWidget';
import { CanvasVariantWidget } from './CanvasVariantWidget';
import { CanvasTransformWidget } from './CanvasTransformWidget';
import { CanvasLightingWidget } from './CanvasLightingWidget';
import { CanvasEnvironmentWidget } from './CanvasEnvironmentWidget';
import { CanvasCameraWidget } from './CanvasCameraWidget';
import { CanvasChannelWidget } from './CanvasChannelWidget';
import { CanvasOverlaysWidget } from './CanvasOverlaysWidget';
import { CanvasProjectionWidget } from './CanvasProjectionWidget';
import { CanvasFitModelWidget } from './CanvasFitModelWidget';
import { CanvasAutoRotateWidget } from './CanvasAutoRotateWidget';
import { CanvasThemeWidget } from './CanvasThemeWidget';
import { CanvasSnapshotWidget } from './CanvasSnapshotWidget';
import { TOOLBAR_ITEM_NAMES, StandardToolbarItemId } from '../ToolbarItems/types';

interface CanvasWidgetRendererProps {
  id: string;
  x: number;
  y: number;
  containerBounds?: { width: number; height: number };
}

const CanvasEnvironmentWidgetWrapper: React.FC<{
  id: string;
  x: number;
  y: number;
  containerBounds?: { width: number; height: number };
}> = ({ id, x, y, containerBounds }) => {
  const canvasEnvironmentMode = useViewportStore((s) => s.canvasEnvironmentMode);
  const toggleCanvasEnvironmentMode = useViewportStore((s) => s.toggleCanvasEnvironmentMode);

  return (
    <CanvasWidgetContainer
      id={id}
      title="HDRI Environments"
      x={x}
      y={y}
      containerBounds={containerBounds}
      headerActions={
        <button
          type="button"
          onClick={toggleCanvasEnvironmentMode}
          title={
            canvasEnvironmentMode === 'list'
              ? 'Switch to compact mode (large icons)'
              : 'Switch to detailed mode (list)'
          }
          className="flex items-center justify-center w-4 h-4 rounded-none text-ink-tertiary hover:text-action hover:bg-surface-high/80 transition-colors cursor-pointer"
        >
          {canvasEnvironmentMode === 'list' ? <LayoutGrid size={10} /> : <List size={10} />}
        </button>
      }
    >
      <CanvasEnvironmentWidget />
    </CanvasWidgetContainer>
  );
};

interface StandardCanvasWidgetWrapperProps {
  id: string;
  title: string;
  x: number;
  y: number;
  containerBounds?: { width: number; height: number };
  children: (props: { mode: 'full' | 'compressed'; orientation: 'horizontal' | 'vertical' }) => React.ReactNode;
}

const StandardCanvasWidgetWrapper: React.FC<StandardCanvasWidgetWrapperProps> = ({
  id,
  title,
  x,
  y,
  containerBounds,
  children
}) => {
  const mode = useViewportStore((s) => s.getCanvasWidgetMode(id));
  const orientation = useViewportStore((s) => s.getCanvasWidgetOrientation(id));
  const toggleCanvasWidgetMode = useViewportStore((s) => s.toggleCanvasWidgetMode);
  const toggleCanvasWidgetOrientation = useViewportStore((s) => s.toggleCanvasWidgetOrientation);

  const isCompressed = mode === 'compressed';
  const isVertical = isCompressed && orientation === 'vertical';

  const btnSize = isVertical ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const iconSize = isVertical ? 9 : 10;
  const isTransform = id === 'transform-gizmo';

  return (
    <CanvasWidgetContainer
      id={id}
      title={title}
      x={x}
      y={y}
      containerBounds={containerBounds}
      noPadding={isCompressed}
      verticalHeader={isVertical}
      expandableHeader={isCompressed}
      headerActions={
        <>
          {isCompressed && (
            <button
              type="button"
              onClick={() => toggleCanvasWidgetOrientation(id)}
              title={
                orientation === 'horizontal'
                  ? 'Switch to vertical orientation'
                  : 'Switch to horizontal orientation'
              }
              aria-label="Toggle orientation"
              className={`flex items-center justify-center ${btnSize} rounded-none text-ink-tertiary hover:text-action hover:bg-surface-high/80 transition-colors cursor-pointer`}
            >
              {orientation === 'horizontal' ? (
                <RectangleVertical size={iconSize} />
              ) : (
                <RectangleHorizontal size={iconSize} />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => toggleCanvasWidgetMode(id)}
            title={
              isCompressed
                ? (isTransform ? 'Switch to detailed mode (coordinates)' : 'Switch to detailed mode')
                : (isTransform ? 'Switch to compact mode (3 buttons only)' : 'Switch to compact mode')
            }
            aria-label="Toggle widget mode"
            className={`flex items-center justify-center ${btnSize} rounded-none text-ink-tertiary hover:text-action hover:bg-surface-high/80 transition-colors cursor-pointer`}
          >
            {isCompressed ? <Maximize2 size={iconSize} /> : <Minimize2 size={iconSize} />}
          </button>
        </>
      }
    >
      {children({ mode, orientation })}
    </CanvasWidgetContainer>
  );
};

export const CanvasWidgetRenderer: React.FC<CanvasWidgetRendererProps> = ({
  id,
  x,
  y,
  containerBounds
}) => {
  const title = TOOLBAR_ITEM_NAMES[id as StandardToolbarItemId] || id;

  switch (id) {
    case 'animation-controls':
      return (
        <CanvasWidgetContainer
          id={id}
          title="Animation Studio"
          x={x}
          y={y}
          containerBounds={containerBounds}
        >
          <CanvasAnimationWidget />
        </CanvasWidgetContainer>
      );

    case 'model-stats':
      return (
        <CanvasWidgetContainer
          id={id}
          title="Geometry Metrology"
          x={x}
          y={y}
          containerBounds={containerBounds}
        >
          <CanvasMetrologyWidget />
        </CanvasWidgetContainer>
      );

    case 'variant-picker':
      return (
        <CanvasWidgetContainer
          id={id}
          title="Model Variants"
          x={x}
          y={y}
          containerBounds={containerBounds}
        >
          <CanvasVariantWidget />
        </CanvasWidgetContainer>
      );

    case 'lighting-intensity':
      return (
        <CanvasWidgetContainer
          id={id}
          title="Lighting Studio"
          x={x}
          y={y}
          containerBounds={containerBounds}
        >
          <CanvasLightingWidget />
        </CanvasWidgetContainer>
      );

    case 'camera-orientation':
      return (
        <CanvasWidgetContainer
          id={id}
          title="Camera & CAD Views"
          x={x}
          y={y}
          containerBounds={containerBounds}
        >
          <CanvasCameraWidget />
        </CanvasWidgetContainer>
      );

    case 'channel-dropdown':
      return (
        <CanvasWidgetContainer
          id={id}
          title="PBR Channel Diagnostics"
          x={x}
          y={y}
          containerBounds={containerBounds}
        >
          <CanvasChannelWidget />
        </CanvasWidgetContainer>
      );

    case 'environment-hdri':
      return (
        <CanvasEnvironmentWidgetWrapper
          id={id}
          x={x}
          y={y}
          containerBounds={containerBounds}
        />
      );

    case 'transform-gizmo':
      return (
        <StandardCanvasWidgetWrapper
          id={id}
          title="3D Gizmo"
          x={x}
          y={y}
          containerBounds={containerBounds}
        >
          {() => <CanvasTransformWidget />}
        </StandardCanvasWidgetWrapper>
      );

    case 'overlays':
      return (
        <StandardCanvasWidgetWrapper
          id={id}
          title="Guides & Shadows"
          x={x}
          y={y}
          containerBounds={containerBounds}
        >
          {({ mode, orientation }) => (
            <CanvasOverlaysWidget id={id} mode={mode} orientation={orientation} />
          )}
        </StandardCanvasWidgetWrapper>
      );

    case 'projection-toggle':
      return (
        <StandardCanvasWidgetWrapper
          id={id}
          title="Camera Mode (ORTHO/PERSP)"
          x={x}
          y={y}
          containerBounds={containerBounds}
        >
          {({ mode, orientation }) => (
            <CanvasProjectionWidget id={id} mode={mode} orientation={orientation} />
          )}
        </StandardCanvasWidgetWrapper>
      );

    case 'fit-model':
      return (
        <StandardCanvasWidgetWrapper
          id={id}
          title="Reframe Model (1:1)"
          x={x}
          y={y}
          containerBounds={containerBounds}
        >
          {({ mode, orientation }) => (
            <CanvasFitModelWidget id={id} mode={mode} orientation={orientation} />
          )}
        </StandardCanvasWidgetWrapper>
      );

    case 'auto-rotate':
      return (
        <StandardCanvasWidgetWrapper
          id={id}
          title="360° Auto Orbit"
          x={x}
          y={y}
          containerBounds={containerBounds}
        >
          {({ mode, orientation }) => (
            <CanvasAutoRotateWidget id={id} mode={mode} orientation={orientation} />
          )}
        </StandardCanvasWidgetWrapper>
      );

    case 'theme-toggle':
      return (
        <StandardCanvasWidgetWrapper
          id={id}
          title="Viewport Theme"
          x={x}
          y={y}
          containerBounds={containerBounds}
        >
          {({ mode, orientation }) => (
            <CanvasThemeWidget id={id} mode={mode} orientation={orientation} />
          )}
        </StandardCanvasWidgetWrapper>
      );

    case 'snapshot-button':
      return (
        <StandardCanvasWidgetWrapper
          id={id}
          title="PNG Snapshot"
          x={x}
          y={y}
          containerBounds={containerBounds}
        >
          {({ mode, orientation }) => (
            <CanvasSnapshotWidget id={id} mode={mode} orientation={orientation} />
          )}
        </StandardCanvasWidgetWrapper>
      );

    default:
      return (
        <CanvasWidgetContainer
          id={id}
          title={title}
          x={x}
          y={y}
          containerBounds={containerBounds}
        >
          <div className="text-xs text-ink-secondary py-1">
            Widget {title} active in viewport.
          </div>
        </CanvasWidgetContainer>
      );
  }
};
