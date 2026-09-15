import React from 'react';
import { CanvasWidgetContainer } from './CanvasWidgetContainer';
import { CanvasAnimationWidget } from './CanvasAnimationWidget';
import { CanvasMetrologyWidget } from './CanvasMetrologyWidget';
import { CanvasVariantWidget } from './CanvasVariantWidget';
import { CanvasTransformWidget } from './CanvasTransformWidget';
import { CanvasLightingWidget } from './CanvasLightingWidget';
import { CanvasEnvironmentWidget } from './CanvasEnvironmentWidget';
import { CanvasCameraWidget } from './CanvasCameraWidget';
import { CanvasChannelWidget } from './CanvasChannelWidget';
import { TOOLBAR_ITEM_NAMES, StandardToolbarItemId } from '../ToolbarItems/types';

interface CanvasWidgetRendererProps {
  id: string;
  x: number;
  y: number;
  containerBounds?: { width: number; height: number };
}

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
          title="Estudio de Animación"
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
          title="Metrología Geométrica"
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
          title="Variantes de Modelo"
          x={x}
          y={y}
          containerBounds={containerBounds}
        >
          <CanvasVariantWidget />
        </CanvasWidgetContainer>
      );

    case 'transform-gizmo':
      return (
        <CanvasWidgetContainer
          id={id}
          title="Manipulación 3D"
          x={x}
          y={y}
          containerBounds={containerBounds}
        >
          <CanvasTransformWidget />
        </CanvasWidgetContainer>
      );

    case 'lighting-intensity':
      return (
        <CanvasWidgetContainer
          id={id}
          title="Estudio de Iluminación"
          x={x}
          y={y}
          containerBounds={containerBounds}
        >
          <CanvasLightingWidget />
        </CanvasWidgetContainer>
      );

    case 'environment-hdri':
      return (
        <CanvasWidgetContainer
          id={id}
          title="Entornos HDRI"
          x={x}
          y={y}
          containerBounds={containerBounds}
        >
          <CanvasEnvironmentWidget />
        </CanvasWidgetContainer>
      );

    case 'camera-orientation':
      return (
        <CanvasWidgetContainer
          id={id}
          title="Cámara & Vistas CAD"
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
          title="Diagnóstico de Canales PBR"
          x={x}
          y={y}
          containerBounds={containerBounds}
        >
          <CanvasChannelWidget />
        </CanvasWidgetContainer>
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
            Widget {title} activo en visor.
          </div>
        </CanvasWidgetContainer>
      );
  }
};
