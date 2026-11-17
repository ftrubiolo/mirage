import React, { useState } from 'react';
import { Html, Line } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useViewportStore } from '../../store/viewportStore';
import { useModelStore } from '../../store/modelStore';

interface DynamicDimensionsProps {
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
}

export const DynamicDimensions: React.FC<DynamicDimensionsProps> = ({ dimensions }) => {
  const showDimensions = useViewportStore((state) => state.showDimensions);
  const unitType = useModelStore((state) => state.unitType);
  const viewportTheme = useViewportStore((state) => state.viewportTheme);
  const { camera } = useThree();

  // Dynamic camera quadrant: signX (+1 or -1) and signZ (+1 or -1)
  const [quadrant, setQuadrant] = useState<{ signX: number; signZ: number }>({ signX: 1, signZ: 1 });

  useFrame(() => {
    // Determine which side of the model the camera is viewing from
    const camX = camera.position.x;
    const camZ = camera.position.z;

    const newSignX = camX >= 0 ? 1 : -1;
    const newSignZ = camZ >= 0 ? 1 : -1;

    if (newSignX !== quadrant.signX || newSignZ !== quadrant.signZ) {
      setQuadrant({ signX: newSignX, signZ: newSignZ });
    }
  });

  if (!showDimensions) return null;

  const { width, height, depth } = dimensions;
  if (!width || !height || !depth || isNaN(width) || isNaN(height) || isNaN(depth)) return null;

  const halfW = width / 2;
  const halfD = depth / 2;

  // Dynamic margin scaled to model size to prevent z-fighting
  const maxDim = Math.max(width, height, depth);
  const offset = Math.max(maxDim * 0.04, 0.05);

  // Brick Carmine / Terracotta accent
  const lineColor = viewportTheme === 'dark' ? '#b53420' : '#9a2716';
  const { signX, signZ } = quadrant;

  // Format dimension cleanly according to scale
  const fmt = (meters: number) => {
    if (unitType === 'cm') {
      return `${(meters * 100).toFixed(1)} cm`;
    }
    if (unitType === 'mm') {
      return `${Math.round(meters * 1000)} mm`;
    }
    if (meters < 1.0) {
      return `${(meters * 100).toFixed(1)} cm`;
    }
    return `${meters.toFixed(2)} m (${Math.round(meters * 100)} cm)`;
  };

  const currentZEdge = signZ * (halfD + offset);
  const currentXEdge = signX * (halfW + offset);

  return (
    <group>
      {/* 1. Width Dimension (Snaps to the camera-facing Z edge) */}
      <group position={[0, 0, currentZEdge]}>
        <Line
          points={[
            [-halfW, 0, 0],
            [halfW, 0, 0]
          ]}
          color={lineColor}
          lineWidth={1.8}
        />
        {/* End ticks */}
        <Line points={[[-halfW, 0, -offset * 0.4], [-halfW, 0, offset * 0.4]]} color={lineColor} lineWidth={1.5} />
        <Line points={[[halfW, 0, -offset * 0.4], [halfW, 0, offset * 0.4]]} color={lineColor} lineWidth={1.5} />

        <Html
          position={[0, -0.04, 0]}
          center
          distanceFactor={Math.max(maxDim * 3.5, 4)}
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-surface-lowest border border-action/40 text-action font-mono tabular-nums text-[11px] font-semibold px-2 py-0.5 rounded-xs shadow-md whitespace-nowrap">
            ↔ Width: {fmt(width)}
          </div>
        </Html>
      </group>

      {/* 2. Depth Dimension (Snaps to the camera-facing X edge) */}
      <group position={[currentXEdge, 0, 0]}>
        <Line
          points={[
            [0, 0, -halfD],
            [0, 0, halfD]
          ]}
          color={lineColor}
          lineWidth={1.8}
        />
        {/* End ticks */}
        <Line points={[[-offset * 0.4, 0, -halfD], [offset * 0.4, 0, -halfD]]} color={lineColor} lineWidth={1.5} />
        <Line points={[[-offset * 0.4, 0, halfD], [offset * 0.4, 0, halfD]]} color={lineColor} lineWidth={1.5} />

        <Html
          position={[0, -0.04, 0]}
          center
          distanceFactor={Math.max(maxDim * 3.5, 4)}
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-surface-lowest border border-action/40 text-action font-mono tabular-nums text-[11px] font-semibold px-2 py-0.5 rounded-xs shadow-md whitespace-nowrap">
            ⤢ Depth: {fmt(depth)}
          </div>
        </Html>
      </group>

      {/* 3. Height Dimension (Snaps to the nearest camera corner: currentXEdge, currentZEdge) */}
      <group position={[currentXEdge, 0, currentZEdge]}>
        <Line
          points={[
            [0, 0, 0],
            [0, height, 0]
          ]}
          color={lineColor}
          lineWidth={1.8}
        />
        {/* End ticks */}
        <Line points={[[-offset * 0.3, 0, 0], [offset * 0.3, 0, 0]]} color={lineColor} lineWidth={1.5} />
        <Line points={[[-offset * 0.3, height, 0], [offset * 0.3, height, 0]]} color={lineColor} lineWidth={1.5} />

        <Html
          position={[signX * (offset * 0.5), height / 2, signZ * (offset * 0.5)]}
          center
          distanceFactor={Math.max(maxDim * 3.5, 4)}
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-surface-lowest border border-action/40 text-action font-mono tabular-nums text-[11px] font-semibold px-2 py-0.5 rounded-xs shadow-md whitespace-nowrap">
            ↕ Height: {fmt(height)}
          </div>
        </Html>
      </group>
    </group>
  );
};
