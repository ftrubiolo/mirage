import React from 'react';
import { ModelDropZone } from './ModelDropZone';
import { ModelManifestCard } from './ModelManifestCard';
import { ModelTransformControls } from './ModelTransformControls';
import { ScaleChecker } from '../Audit/ScaleChecker';

export const GeometryStudio: React.FC = () => {
  return (
    <div className="space-y-4 font-body select-none text-ink-primary">
      {/* Model Drop & File Selector */}
      <ModelDropZone />

      {/* Loaded Model Manifest Card */}
      <ModelManifestCard />

      {/* 3D Orientation & Transform Controls */}
      <ModelTransformControls />

      {/* Scale & Units Picker */}
      <ScaleChecker />
    </div>
  );
};
export default GeometryStudio;
