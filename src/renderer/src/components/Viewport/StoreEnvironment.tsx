import React, { useEffect, useState, useRef, useMemo, Suspense } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { HorizontalBlurShader, VerticalBlurShader } from 'three-stdlib';
import { useViewportStore } from '../../store/viewportStore';

let cachedHdrUrl: string | null = null;

interface MirageContactShadowsProps {
  scale?: number | [number, number];
  opacity?: number;
  width?: number;
  height?: number;
  blur?: number;
  near?: number;
  far?: number;
  resolution?: number;
  smooth?: boolean;
  color?: string;
  position?: [number, number, number];
}

const MirageContactShadows: React.FC<MirageContactShadowsProps> = ({
  scale = 10,
  opacity = 1,
  width = 1,
  height = 1,
  blur = 1,
  near = 0,
  far = 4,
  resolution = 512,
  smooth = true,
  color = '#000000',
  position = [0, 0, 0]
}) => {
  const scene = useThree((state) => state.scene);
  const gl = useThree((state) => state.gl);
  const groupRef = useRef<THREE.Group>(null);
  const planeRef = useRef<THREE.Mesh>(null);
  const shadowCamera = useRef<THREE.OrthographicCamera>(null);

  const w = width * (Array.isArray(scale) ? scale[0] : scale || 1);
  const h = height * (Array.isArray(scale) ? scale[1] : scale || 1);

  const [
    renderTarget,
    planeGeometry,
    depthMaterial,
    blurPlane,
    horizontalBlurMaterial,
    verticalBlurMaterial,
    renderTargetBlur
  ] = useMemo(() => {
    const rt = new THREE.WebGLRenderTarget(resolution, resolution);
    const rtBlur = new THREE.WebGLRenderTarget(resolution, resolution);
    rt.texture.generateMipmaps = false;
    rtBlur.texture.generateMipmaps = false;

    const geo = new THREE.PlaneGeometry(w, h).rotateX(Math.PI / 2);
    const bp = new THREE.Mesh(geo);

    const dm = new THREE.MeshDepthMaterial();
    dm.depthTest = false;
    dm.depthWrite = false;
    dm.onBeforeCompile = (shader) => {
      shader.uniforms = {
        ...shader.uniforms,
        ucolor: { value: new THREE.Color(color) }
      };
      shader.fragmentShader = shader.fragmentShader.replace(
        'void main() {',
        'uniform vec3 ucolor;\nvoid main() {'
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        'vec4( vec3( 1.0 - fragCoordZ ), opacity );',
        'vec4( ucolor * fragCoordZ * 2.0, ( 1.0 - fragCoordZ ) * 1.0 );'
      );
    };

    const hbm = new THREE.ShaderMaterial(HorizontalBlurShader);
    const vbm = new THREE.ShaderMaterial(VerticalBlurShader);
    hbm.depthTest = false;
    vbm.depthTest = false;

    return [rt, geo, dm, bp, hbm, vbm, rtBlur];
  }, [resolution, w, h, color]);

  useEffect(() => {
    return () => {
      renderTarget.dispose();
      renderTargetBlur.dispose();
      planeGeometry.dispose();
      depthMaterial.dispose();
      horizontalBlurMaterial.dispose();
      verticalBlurMaterial.dispose();
    };
  }, [
    renderTarget,
    renderTargetBlur,
    planeGeometry,
    depthMaterial,
    horizontalBlurMaterial,
    verticalBlurMaterial
  ]);

  const blurShadows = (blurAmount: number) => {
    if (!shadowCamera.current) return;
    blurPlane.visible = true;

    blurPlane.material = horizontalBlurMaterial;
    horizontalBlurMaterial.uniforms.tDiffuse.value = renderTarget.texture;
    horizontalBlurMaterial.uniforms.h.value = (blurAmount * 1) / 256;
    gl.setRenderTarget(renderTargetBlur);
    gl.render(blurPlane, shadowCamera.current);

    blurPlane.material = verticalBlurMaterial;
    verticalBlurMaterial.uniforms.tDiffuse.value = renderTargetBlur.texture;
    verticalBlurMaterial.uniforms.v.value = (blurAmount * 1) / 256;
    gl.setRenderTarget(renderTarget);
    gl.render(blurPlane, shadowCamera.current);

    blurPlane.visible = false;
  };

  useFrame(({ camera }) => {
    if (!shadowCamera.current || !planeRef.current || !groupRef.current) return;

    // 1. Hide floor contact shadow completely when camera is underneath floor (Y < 0.0)
    if (camera.position.y < 0.0) {
      planeRef.current.visible = false;
      return;
    }
    planeRef.current.visible = true;

    // 2. Temporarily exclude transmissive and transparent meshes from shadow depth pass.
    // Transmissive glass should never cast a solid black opaque block onto the floor.
    const hiddenMeshes: THREE.Mesh[] = [];
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        if (m === planeRef.current || m === blurPlane) return;

        const mats = Array.isArray(m.material) ? m.material : [m.material];
        const isTransmissiveOrTransparent = mats.some((mat) => {
          const isPhys = mat instanceof THREE.MeshPhysicalMaterial;
          const transmission = isPhys ? mat.transmission : (mat as any).transmission;
          return (
            (transmission !== undefined && transmission > 0.05) ||
            mat.transparent ||
            mat.opacity < 0.95
          );
        });

        if (isTransmissiveOrTransparent && m.visible) {
          m.visible = false;
          hiddenMeshes.push(m);
        }
      }
    });

    // 3. Render depth pass with upward-facing shadow camera
    planeRef.current.visible = false;
    const initialBg = scene.background;
    const initialOverride = scene.overrideMaterial;

    scene.background = null;
    scene.overrideMaterial = depthMaterial;

    gl.setRenderTarget(renderTarget);
    gl.render(scene, shadowCamera.current);

    blurShadows(blur);
    if (smooth) blurShadows(blur * 0.4);

    gl.setRenderTarget(null);

    planeRef.current.visible = true;
    scene.overrideMaterial = initialOverride;
    scene.background = initialBg;

    // 4. Restore visibility of transmissive & transparent meshes
    for (const m of hiddenMeshes) {
      m.visible = true;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation-x={Math.PI / 2}>
      <mesh
        ref={planeRef}
        geometry={planeGeometry}
        scale={[1, -1, 1]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <meshBasicMaterial
          transparent
          map={renderTarget.texture}
          opacity={opacity}
          depthWrite={false}
          side={THREE.FrontSide}
        />
      </mesh>
      <orthographicCamera
        ref={shadowCamera}
        args={[-w / 2, w / 2, h / 2, -h / 2, near, far]}
      />
    </group>
  );
};

const EngineeringGrid: React.FC<{ primary: string; secondary: string }> = ({
  primary,
  secondary
}) => {
  const gridRef = useRef<THREE.GridHelper>(null);

  useFrame(({ camera }) => {
    if (gridRef.current) {
      // Hide grid when camera is underneath the ground plane to avoid visual obstruction
      gridRef.current.visible = camera.position.y >= 0.005;
    }
  });

  return (
    <gridHelper
      ref={gridRef}
      args={[10, 20, primary, secondary]}
      position={[0, -0.001, 0]}
    />
  );
};

export const StoreEnvironment: React.FC = () => {
  const { scene } = useThree();
  const {
    showContactShadows,
    showGrid,
    environmentIntensity,
    showEnvironmentBackground,
    viewportTheme,
    environmentPreset,
    customHdrUrl,
    sunAzimuth,
    sunElevation,
    keyLightIntensity,
    ambientLightIntensity,
    fillLightIntensity,
    directionalShadows,
    contactShadowOpacity
  } = useViewportStore();

  const [offlineHdrUrl, setOfflineHdrUrl] = useState<string | null>(cachedHdrUrl);

  // Synchronize scene background with viewport theme to prevent transmission render targets
  // from defaulting to black when looking at glass against the canvas background.
  useEffect(() => {
    if (!showEnvironmentBackground) {
      scene.background = new THREE.Color(viewportTheme === 'dark' ? '#111110' : '#f7f5f2');
    }
  }, [scene, showEnvironmentBackground, viewportTheme]);

  useEffect(() => {
    if (cachedHdrUrl) return;
    async function resolveHdr() {
      if (window.electronAPI) {
        try {
          const fullPath = await window.electronAPI.getResourcePath('environments/city.hdr');
          const assetUrl = window.electronAPI.toAssetUrl(fullPath);
          cachedHdrUrl = assetUrl;
          setOfflineHdrUrl(assetUrl);
        } catch (err) {
          console.error('[StoreEnvironment] Error resolving offline HDR:', err);
        }
      }
    }
    resolveHdr();
  }, []);

  const gridPrimary = viewportTheme === 'dark' ? '#272523' : '#d5cfc5';
  const gridSecondary = viewportTheme === 'dark' ? '#181816' : '#efece6';

  // Convert azimuth & elevation to Cartesian coordinates for Key Light
  const radAzimuth = (sunAzimuth * Math.PI) / 180;
  const radElevation = (sunElevation * Math.PI) / 180;
  const lightDistance = 14;

  const keyLightPos: [number, number, number] = [
    lightDistance * Math.cos(radElevation) * Math.sin(radAzimuth),
    lightDistance * Math.sin(radElevation),
    lightDistance * Math.cos(radElevation) * Math.cos(radAzimuth)
  ];

  // Fill light positioned opposite to key light
  const fillLightPos: [number, number, number] = [
    -keyLightPos[0] * 0.6,
    Math.max(2, keyLightPos[1] * 0.5),
    -keyLightPos[2] * 0.6
  ];

  return (
    <>
      {/* Ambient Light */}
      <ambientLight intensity={ambientLightIntensity * environmentIntensity} />

      {/* Soft Ground Bounce Hemisphere Light for viewing underside without darkness */}
      <hemisphereLight
        args={[
          viewportTheme === 'dark' ? '#2a2825' : '#ffffff',
          viewportTheme === 'dark' ? '#1c1b19' : '#dfd9cc',
          0.45 * environmentIntensity
        ]}
      />

      {/* Soft Upward Ground Bounce Light to illuminate undersides when orbiting below */}
      <directionalLight
        position={[0, -6, 0]}
        target-position={[0, 1, 0]}
        intensity={0.5 * environmentIntensity}
        castShadow={false}
      />

      {/* Key Directional Sunlight with Shadows */}
      <directionalLight
        position={keyLightPos}
        intensity={keyLightIntensity * environmentIntensity}
        castShadow={directionalShadows}
        shadow-bias={-0.0001}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* Fill Light */}
      <directionalLight
        position={fillLightPos}
        intensity={fillLightIntensity * environmentIntensity}
      />

      {/* Environment Map Reflections & Background */}
      <Suspense fallback={null}>
        {customHdrUrl ? (
          <Environment
            files={customHdrUrl}
            environmentIntensity={environmentIntensity}
            background={showEnvironmentBackground}
          />
        ) : (environmentPreset === 'city' || environmentPreset.startsWith('custom:')) && offlineHdrUrl ? (
          <Environment
            files={offlineHdrUrl}
            environmentIntensity={environmentIntensity}
            background={showEnvironmentBackground}
          />
        ) : (
          <Environment
            preset={(['city', 'studio', 'warehouse', 'apartment', 'lobby', 'sunset', 'night', 'park'].includes(environmentPreset) ? environmentPreset : 'city') as any}
            environmentIntensity={environmentIntensity}
            background={showEnvironmentBackground}
          />
        )}
      </Suspense>

      {/* Floor Snapped Contact Shadows with Glass Exclusion and Underneath Culling */}
      {showContactShadows && (
        <MirageContactShadows
          position={[0, 0, 0]}
          opacity={contactShadowOpacity}
          scale={10}
          blur={2}
          far={4}
          resolution={512}
        />
      )}

      {/* Engineering Ground Grid with Underneath Auto-Hide */}
      {showGrid && (
        <EngineeringGrid
          primary={gridPrimary}
          secondary={gridSecondary}
        />
      )}
    </>
  );
};
