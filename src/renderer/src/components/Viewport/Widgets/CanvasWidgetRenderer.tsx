import React from 'react';
import { CanvasWidgetContainer } from './CanvasWidgetContainer';
import { CanvasAnimationWidget } from './CanvasAnimationWidget';
import { CanvasMetrologyWidget } from './CanvasMetrologyWidget';
import { CanvasVariantWidget } from './CanvasVariantWidget';
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
