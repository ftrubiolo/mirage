import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { useViewportStore, CameraPreset } from '../../store/viewportStore';
import { viewportBridge } from '../../utils/viewportBridge';

interface CameraControllerProps {
  orbitControlsRef: React.MutableRefObject<any>;
}

export const CameraController: React.FC<CameraControllerProps> = ({ orbitControlsRef }) => {
  const { camera } = useThree();
  const {
    cameraPreset,
    cameraPresetCounter,
    cameraFov,
    fitToModelCounter,
    resetCameraCounter
  } = useViewportStore();

  const isTransitioning = useRef(false);
  const targetPosition = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());

  // Update PerspectiveCamera FOV
  useEffect(() => {
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const persCam = camera as THREE.PerspectiveCamera;
      if (persCam.fov !== cameraFov) {
        persCam.fov = cameraFov;
        persCam.updateProjectionMatrix();
      }
    }
  }, [camera, cameraFov]);

  const calculateTarget = (preset: CameraPreset | 'fit' | 'reset') => {
    const model = viewportBridge.modelGroup;
    let centerY = 0.5;
    let maxDim = 1.2;

    if (model) {
      const box = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      box.getCenter(center);
      const size = new THREE.Vector3();
      box.getSize(size);
      centerY = size.y / 2;
      maxDim = Math.max(size.x, size.y, size.z, 0.2);
    }

    const persCam = camera as THREE.PerspectiveCamera;
    const fovRad = ((persCam.fov || 50) * Math.PI) / 180;
    const fitDistance = Math.max(((maxDim / 2) / Math.tan(fovRad / 2)) * 1.35, 0.5);

    targetLookAt.current.set(0, centerY, 0);

    switch (preset) {
      case 'front':
        targetPosition.current.set(0, centerY, fitDistance);
        break;
      case 'back':
        targetPosition.current.set(0, centerY, -fitDistance);
        break;
      case 'right':
        targetPosition.current.set(fitDistance, centerY, 0);
        break;
      case 'left':
        targetPosition.current.set(-fitDistance, centerY, 0);
        break;
      case 'top':
        targetPosition.current.set(0, centerY + fitDistance, 0.001);
        break;
      case 'bottom':
        targetPosition.current.set(0, centerY - fitDistance, 0.001);
        break;
      case 'iso':
      case 'fit':
      case 'reset':
      default:
        targetPosition.current.set(
          fitDistance * 0.75,
          centerY + fitDistance * 0.45,
          fitDistance * 0.75
        );
        break;
    }

    isTransitioning.current = true;
  };

  // Preset triggered
  useEffect(() => {
    if (cameraPresetCounter > 0 && cameraPreset) {
      calculateTarget(cameraPreset);
    }
  }, [cameraPresetCounter]);

  // Fit to model triggered
  useEffect(() => {
    if (fitToModelCounter > 0) {
      calculateTarget('fit');
    }
  }, [fitToModelCounter]);

  // Reset camera triggered
  useEffect(() => {
    if (resetCameraCounter > 0) {
      calculateTarget('reset');
    }
  }, [resetCameraCounter]);

  // Smooth lerp frame loop
  useFrame((_, delta) => {
    if (!isTransitioning.current) return;

    // Frame-rate independent lerp factor
    const alpha = Math.min(1.0, 1.0 - Math.exp(-12 * delta));

    camera.position.lerp(targetPosition.current, alpha);

    if (orbitControlsRef.current) {
      orbitControlsRef.current.target.lerp(targetLookAt.current, alpha);
      orbitControlsRef.current.update();
    }

    const distPos = camera.position.distanceTo(targetPosition.current);
    if (distPos < 0.003) {
      camera.position.copy(targetPosition.current);
      if (orbitControlsRef.current) {
        orbitControlsRef.current.target.copy(targetLookAt.current);
        orbitControlsRef.current.update();
      }
      isTransitioning.current = false;
    }
  });

  return null;
};
