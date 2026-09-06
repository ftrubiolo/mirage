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
    customHdrUrl
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

  return (
    <>
      {/* Parity Ambient Light */}
      <ambientLight intensity={0.6 * environmentIntensity} />

      {/* Parity Key Spot Light with Shadows */}
      <spotLight
        position={[10, 10, 10]}
        angle={0.15}
        penumbra={1}
        intensity={1.2 * environmentIntensity}
        castShadow
        shadow-bias={-0.0001}
      />

      {/* Parity Fill Lights */}
      <directionalLight position={[-5, 5, -5]} intensity={0.4 * environmentIntensity} />

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
          opacity={0.4}
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
