import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { useViewportStore, CameraPreset } from '../../store/viewportStore';
import { viewportBridge } from '../../utils/viewportBridge';

interface CameraControllerProps {
  orbitControlsRef: React.MutableRefObject<any>;
}

export const CameraController: React.FC<CameraControllerProps> = ({ orbitControlsRef }) => {
  const { camera, set, size, gl, scene, invalidate } = useThree();
  const {
    cameraPreset,
    cameraPresetCounter,
    cameraFov,
    isOrthographic,
    fitToModelCounter,
    resetCameraCounter,
    focusPoint,
    focusPointCounter
  } = useViewportStore();

  const isTransitioning = useRef(false);
  const targetPosition = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());
  const targetZoom = useRef<number | null>(null);

  const perspCamRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orthoCamRef = useRef<THREE.OrthographicCamera | null>(null);

  // Initialize and keep reference to initial camera
  useEffect(() => {
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera && !perspCamRef.current) {
      perspCamRef.current = camera as THREE.PerspectiveCamera;
      if (camera.near > 0.01) {
        camera.near = 0.01;
        camera.updateProjectionMatrix();
        invalidate();
      }
    }
  }, [camera, invalidate]);

  // Update PerspectiveCamera FOV
  useEffect(() => {
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const persCam = camera as THREE.PerspectiveCamera;
      if (persCam.fov !== cameraFov) {
        persCam.fov = cameraFov;
        persCam.updateProjectionMatrix();
        invalidate();
      }
    }
  }, [camera, cameraFov, invalidate]);

  // Handle switching between Perspective and Orthographic projection
  useEffect(() => {
    const isCurrentlyOrtho = Boolean((camera as THREE.OrthographicCamera).isOrthographicCamera);
    if (isOrthographic === isCurrentlyOrtho) {
      return;
    }

    const aspect = size.width > 0 && size.height > 0 ? size.width / size.height : 1;
    const target = orbitControlsRef.current?.target
      ? orbitControlsRef.current.target.clone()
      : new THREE.Vector3(0, 0.5, 0);

    if (isOrthographic) {
      // Switching: Perspective -> Orthographic
      const perspCam = (camera as THREE.PerspectiveCamera).isPerspectiveCamera
        ? (camera as THREE.PerspectiveCamera)
        : perspCamRef.current || new THREE.PerspectiveCamera(cameraFov || 50, aspect, 0.01, 100);
      perspCamRef.current = perspCam;

      const dist = Math.max(perspCam.position.distanceTo(target), 0.1);
      const fovRad = ((perspCam.fov || 50) * Math.PI) / 180;
      const visibleH = 2 * dist * Math.tan(fovRad / 2);
      const visibleW = visibleH * aspect;

      let orthoCam = orthoCamRef.current;
      if (!orthoCam) {
        orthoCam = new THREE.OrthographicCamera(
          -visibleW / 2,
          visibleW / 2,
          visibleH / 2,
          -visibleH / 2,
          -500,
          1000
        );
        orthoCamRef.current = orthoCam;
      } else {
        orthoCam.left = -visibleW / 2;
        orthoCam.right = visibleW / 2;
        orthoCam.top = visibleH / 2;
        orthoCam.bottom = -visibleH / 2;
        orthoCam.near = -500;
        orthoCam.far = 1000;
        orthoCam.zoom = 1;
      }

      orthoCam.position.copy(perspCam.position);
      orthoCam.quaternion.copy(perspCam.quaternion);
      orthoCam.updateProjectionMatrix();

      set({ camera: orthoCam });
      if (orbitControlsRef.current) {
        orbitControlsRef.current.object = orthoCam;
        orbitControlsRef.current.target.copy(target);
        orbitControlsRef.current.update();
      }
      viewportBridge.register(gl, scene, orthoCam);
      invalidate();
    } else {
      // Switching: Orthographic -> Perspective
      const orthoCam = (camera as THREE.OrthographicCamera).isOrthographicCamera
        ? (camera as THREE.OrthographicCamera)
        : orthoCamRef.current;
      if (orthoCam) {
        orthoCamRef.current = orthoCam;
      }

      let perspCam = perspCamRef.current;
      if (!perspCam) {
        perspCam = new THREE.PerspectiveCamera(cameraFov || 50, aspect, 0.01, 100);
        perspCamRef.current = perspCam;
      }

      perspCam.fov = cameraFov || 50;
      perspCam.aspect = aspect;

      if (orthoCam) {
        const visibleH = (orthoCam.top - orthoCam.bottom) / (orthoCam.zoom || 1);
        const fovRad = (perspCam.fov * Math.PI) / 180;
        const targetDist = Math.max((visibleH / 2) / Math.tan(fovRad / 2), 0.5);

        const dir = new THREE.Vector3().subVectors(orthoCam.position, target);
        if (dir.lengthSq() < 0.0001) {
          dir.set(0, 0, 1);
        } else {
          dir.normalize();
        }

        perspCam.position.copy(target).addScaledVector(dir, targetDist);
        perspCam.quaternion.copy(orthoCam.quaternion);
      }
      perspCam.updateProjectionMatrix();

      set({ camera: perspCam });
      if (orbitControlsRef.current) {
        orbitControlsRef.current.object = perspCam;
        orbitControlsRef.current.target.copy(target);
        orbitControlsRef.current.update();
      }
      viewportBridge.register(gl, scene, perspCam);
      invalidate();
    }
  }, [isOrthographic, camera, size, gl, scene, set, invalidate, cameraFov, orbitControlsRef]);

  const calculateTarget = (preset: CameraPreset | 'fit' | 'reset') => {
    const model = viewportBridge.modelGroup;
    const center = new THREE.Vector3(0, 0.5, 0);
    let maxDim = 1.2;

    if (model) {
      const box = new THREE.Box3().setFromObject(model);
      box.getCenter(center);
      const sizeVec = new THREE.Vector3();
      box.getSize(sizeVec);
      maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z, 0.2);
    }

    const persCam = (camera as THREE.PerspectiveCamera).isPerspectiveCamera
      ? (camera as THREE.PerspectiveCamera)
      : perspCamRef.current || { fov: 50 };
    const fovRad = (((persCam as any).fov || 50) * Math.PI) / 180;
    const fitDistance = Math.max(((maxDim / 2) / Math.tan(fovRad / 2)) * 1.35, 0.5);

    targetLookAt.current.copy(center);

    // Target zoom for orthographic camera on fit / reset
    if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
      const ortho = camera as THREE.OrthographicCamera;
      const baseFrustumH = ortho.top - ortho.bottom;
      const desiredH = Math.max(maxDim * 1.35, 0.4);
      targetZoom.current = baseFrustumH / desiredH;
    } else {
      targetZoom.current = null;
    }

    switch (preset) {
      case 'front':
        targetPosition.current.set(center.x, center.y, center.z + fitDistance);
        break;
      case 'back':
        targetPosition.current.set(center.x, center.y, center.z - fitDistance);
        break;
      case 'right':
        targetPosition.current.set(center.x + fitDistance, center.y, center.z);
        break;
      case 'left':
        targetPosition.current.set(center.x - fitDistance, center.y, center.z);
        break;
      case 'top':
        targetPosition.current.set(center.x, center.y + fitDistance, center.z + 0.001);
        break;
      case 'bottom':
        targetPosition.current.set(center.x, center.y - fitDistance, center.z + 0.001);
        break;
      case 'iso':
      case 'fit':
      case 'reset':
      default:
        targetPosition.current.set(
          center.x + fitDistance * 0.75,
          center.y + fitDistance * 0.45,
          center.z + fitDistance * 0.75
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

  // Focus on double-clicked point
  useEffect(() => {
    if (focusPointCounter > 0 && focusPoint) {
      targetLookAt.current.set(focusPoint[0], focusPoint[1], focusPoint[2]);

      const currentTarget = orbitControlsRef.current?.target || new THREE.Vector3(0, 0.5, 0);
      const offset = new THREE.Vector3().subVectors(camera.position, currentTarget);
      targetPosition.current.copy(targetLookAt.current).add(offset);
      targetZoom.current = null;
      isTransitioning.current = true;
    }
  }, [focusPointCounter]);

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

    if ((camera as THREE.OrthographicCamera).isOrthographicCamera && targetZoom.current !== null) {
      const ortho = camera as THREE.OrthographicCamera;
      ortho.zoom = THREE.MathUtils.lerp(ortho.zoom, targetZoom.current, alpha);
      ortho.updateProjectionMatrix();
    }

    const distPos = camera.position.distanceTo(targetPosition.current);
    const zoomFinished =
      targetZoom.current === null ||
      !((camera as THREE.OrthographicCamera).isOrthographicCamera) ||
      Math.abs((camera as THREE.OrthographicCamera).zoom - targetZoom.current) < 0.003;

    if (distPos < 0.003 && zoomFinished) {
      camera.position.copy(targetPosition.current);
      if (orbitControlsRef.current) {
        orbitControlsRef.current.target.copy(targetLookAt.current);
        orbitControlsRef.current.update();
      }
      if ((camera as THREE.OrthographicCamera).isOrthographicCamera && targetZoom.current !== null) {
        const ortho = camera as THREE.OrthographicCamera;
        ortho.zoom = targetZoom.current;
        ortho.updateProjectionMatrix();
        targetZoom.current = null;
      }
      isTransitioning.current = false;
    }
  });

  return null;
};

export default CameraController;
