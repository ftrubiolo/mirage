import React from 'react';
import { ChannelDropdownItem } from './ChannelDropdownItem';
import { OverlaysItemGroup } from './OverlaysItemGroup';
import { TransformGizmoItem } from './TransformGizmoItem';
import { ThemeToggleItem } from './ThemeToggleItem';
import { CameraOrientationItem } from './CameraOrientationItem';
import { ProjectionToggleItem } from './ProjectionToggleItem';
import { FitModelItem } from './FitModelItem';
import { AutoRotateItem } from './AutoRotateItem';
import { EnvironmentHdriItem } from './EnvironmentHdriItem';
import { LightingIntensityItem } from './LightingIntensityItem';
import { SnapshotButtonItem } from './SnapshotButtonItem';
import { VariantPickerItem } from './VariantPickerItem';
import { ModelStatsItem } from './ModelStatsItem';
import { AnimationControlsItem } from './AnimationControlsItem';
import { ToolbarSpacerItem } from './ToolbarSpacerItem';
import { isToolbarSpacer } from './types';

interface BarItemRendererProps {
  id: string;
  compact?: boolean;
  iconOnly?: boolean;
}

export const BarItemRenderer: React.FC<BarItemRendererProps> = ({
  id,
  compact = true,
  iconOnly = false
}) => {
  if (isToolbarSpacer(id)) {
    return <ToolbarSpacerItem id={id} />;
  }

  switch (id) {
    case 'channel-dropdown':
      return <ChannelDropdownItem compact={compact} iconOnly={iconOnly} />;
    case 'overlays':
      return <OverlaysItemGroup />;
    case 'transform-gizmo':
      return <TransformGizmoItem />;
    case 'theme-toggle':
      return <ThemeToggleItem />;
    case 'camera-orientation':
      return <CameraOrientationItem compact={compact} iconOnly={iconOnly} />;
    case 'projection-toggle':
      return <ProjectionToggleItem iconOnly={iconOnly} />;
    case 'fit-model':
      return <FitModelItem />;
    case 'auto-rotate':
      return <AutoRotateItem />;
    case 'environment-hdri':
      return <EnvironmentHdriItem compact={compact} iconOnly={iconOnly} />;
    case 'lighting-intensity':
      return <LightingIntensityItem />;
    case 'snapshot-button':
      return <SnapshotButtonItem />;
    case 'variant-picker':
      return <VariantPickerItem compact={compact} iconOnly={iconOnly} />;
    case 'model-stats':
      return <ModelStatsItem compact={compact} iconOnly={iconOnly} />;
    case 'animation-controls':
      return <AnimationControlsItem compact={compact} iconOnly={iconOnly} />;
    default:
      return null;
  }
};
