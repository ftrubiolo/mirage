import React, { useEffect, useState, Suspense } from 'react';
import { ContactShadows, Environment } from '@react-three/drei';
import { useViewportStore } from '../../store/viewportStore';

let cachedHdrUrl: string | null = null;

export const StoreEnvironment: React.FC = () => {
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
        ) : environmentPreset === 'city' && offlineHdrUrl ? (
          <Environment
            files={offlineHdrUrl}
            environmentIntensity={environmentIntensity}
            background={showEnvironmentBackground}
          />
        ) : (
          <Environment
            preset={environmentPreset}
            environmentIntensity={environmentIntensity}
            background={showEnvironmentBackground}
          />
        )}
      </Suspense>

      {/* Floor Snapped Contact Shadows */}
      {showContactShadows && (
        <ContactShadows
          position={[0, 0, 0]}
          opacity={contactShadowOpacity}
          scale={10}
          blur={2}
          far={4}
          resolution={512}
        />
      )}

      {/* Engineering Ground Grid */}
      {showGrid && (
        <gridHelper
          args={[10, 20, gridPrimary, gridSecondary]}
          position={[0, -0.001, 0]}
        />
      )}
    </>
  );
};
