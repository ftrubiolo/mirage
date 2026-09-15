import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import * as THREE from 'three';
import { GLTFAnimationPointerExtension } from '@needle-tools/three-animation-pointer';
import { useViewportStore } from '../store/viewportStore';
import { viewportBridge } from '../utils/viewportBridge';
import { AnimationControlsItem } from '../components/Viewport/ToolbarItems/AnimationControlsItem';
import { ViewportStatusBar } from '../components/Viewport/ViewportStatusBar';
import { ViewportToolbar } from '../components/Viewport/ViewportToolbar';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('glTF Animation Playback & Controls System', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    // Reset store and bridge
    useViewportStore.getState().resetAllBars();
    useViewportStore.getState().resetAnimationState();
    viewportBridge.unregister();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    viewportBridge.unregister();
  });

  describe('KHR_animation_pointer Extension & Three.js AnimationMixer', () => {
    it('GLTFAnimationPointerExtension class exists and can be instantiated with parser mock', () => {
      expect(GLTFAnimationPointerExtension).toBeDefined();
      const mockParser: any = {
        json: {
          extensionsUsed: ['KHR_animation_pointer']
        },
        getDependency: vi.fn()
      };
      const ext = new GLTFAnimationPointerExtension(mockParser);
      expect(ext.name).toBe('KHR_animation_pointer');
    });

    it('updates object transforms and material properties during mixer ticks', () => {
      const scene = new THREE.Scene();
      const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(), mat);
      mesh.name = 'AnimatedBox';
      scene.add(mesh);

      // Track moving mesh on X axis from 0 to 10 over 2 seconds
      const posTrack = new THREE.VectorKeyframeTrack('AnimatedBox.position', [0, 2], [0, 0, 0, 10, 0, 0]);
      const clip = new THREE.AnimationClip('MoveClip', 2, [posTrack]);

      const mixer = new THREE.AnimationMixer(scene);
      viewportBridge.registerAnimations(mixer, [clip]);

      expect(viewportBridge.mixer).toBe(mixer);
      expect(viewportBridge.actions.length).toBe(1);
      expect(viewportBridge.getAnimationDuration()).toBe(2);

      // Tick 1 second (halfway)
      mixer.update(1.0);
      expect(mesh.position.x).toBeCloseTo(5.0, 1);
      expect(viewportBridge.getAnimationTime()).toBeCloseTo(1.0, 1);

      // Seek to 1.5 seconds while paused
      viewportBridge.pauseAnimation();
      viewportBridge.seekAnimation(1.5);
      expect(mesh.position.x).toBeCloseTo(7.5, 1);
      expect(viewportBridge.getAnimationTime()).toBeCloseTo(1.5, 1);
    });

    it('handles looping and finished callbacks accurately', () => {
      const rootObj = new THREE.Group();
      const posTrack = new THREE.VectorKeyframeTrack('.position', [0, 1], [0, 0, 0, 2, 0, 0]);
      const clip = new THREE.AnimationClip('TestLoop', 1, [posTrack]);

      const mixer = new THREE.AnimationMixer(rootObj);
      const finishedSpy = vi.fn();
      viewportBridge.onAnimationFinished = finishedSpy;
      viewportBridge.registerAnimations(mixer, [clip]);

      // Set to LoopOnce
      viewportBridge.setAnimationLoop(false);
      mixer.update(1.0);

      expect(finishedSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('ViewportStore Animation State Machine', () => {
    it('sets animation clips and updates store state', () => {
      const clips = [
        { name: 'Walk', duration: 1.5 },
        { name: 'Run', duration: 0.8 }
      ];

      useViewportStore.getState().setAnimations(clips);
      const s = useViewportStore.getState();

      expect(s.hasAnimations).toBe(true);
      expect(s.animationClips).toEqual(clips);
      expect(s.activeAnimationIndex).toBe(0);
      expect(s.animationDuration).toBe(1.5);
      expect(s.isAnimationPlaying).toBe(true);
    });

    it('toggles playback, cycles speed, and toggles loop', () => {
      const clips = [{ name: 'Default', duration: 2.0 }];
      useViewportStore.getState().setAnimations(clips);

      // Playback toggle
      useViewportStore.getState().toggleAnimationPlayback();
      expect(useViewportStore.getState().isAnimationPlaying).toBe(false);

      useViewportStore.getState().toggleAnimationPlayback();
      expect(useViewportStore.getState().isAnimationPlaying).toBe(true);

      // Speed change
      useViewportStore.getState().setAnimationPlaybackSpeed(1.5);
      expect(useViewportStore.getState().animationPlaybackSpeed).toBe(1.5);

      // Loop toggle
      expect(useViewportStore.getState().isAnimationLooping).toBe(true);
      useViewportStore.getState().toggleAnimationLoop();
      expect(useViewportStore.getState().isAnimationLooping).toBe(false);

      // Reset
      useViewportStore.getState().resetAnimationState();
      expect(useViewportStore.getState().hasAnimations).toBe(false);
      expect(useViewportStore.getState().animationClips).toEqual([]);
    });

    it('switches active animation index and updates duration', () => {
      const clips = [
        { name: 'Idle', duration: 2.5 },
        { name: 'Action', duration: 4.0 }
      ];
      useViewportStore.getState().setAnimations(clips);

      useViewportStore.getState().setActiveAnimationIndex(1);
      expect(useViewportStore.getState().activeAnimationIndex).toBe(1);
      expect(useViewportStore.getState().animationDuration).toBe(4.0);
    });
  });

  describe('AnimationControlsItem Component Rendering & UI', () => {
    it('renders null when there are no animations loaded', () => {
      act(() => {
        root.render(<AnimationControlsItem />);
      });

      expect(container.innerHTML).toBe('');
    });

    it('renders playback controls, scrubber, and time readout when animations exist', () => {
      useViewportStore.getState().setAnimations([{ name: 'Rotation', duration: 3.5 }]);

      act(() => {
        root.render(<AnimationControlsItem />);
      });

      // Play/Pause button
      const playPauseBtn = container.querySelector('button[title*="Pausar"]');
      expect(playPauseBtn).toBeTruthy();

      // Scrubber slider
      const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
      expect(slider).toBeTruthy();
      expect(parseFloat(slider.max)).toBeCloseTo(3.5, 1);

      // Tabular time readout
      expect(container.textContent).toContain('03.5s');

      // Speed multiplier button
      expect(container.textContent).toContain('1x');

      // Loop button
      const loopBtn = container.querySelector('button[title*="Repetir en bucle"]');
      expect(loopBtn).toBeTruthy();
    });

    it('clicking Play/Pause toggles store playback state', () => {
      useViewportStore.getState().setAnimations([{ name: 'Test', duration: 1.0 }]);

      act(() => {
        root.render(<AnimationControlsItem />);
      });

      const playPauseBtn = container.querySelector('button[title*="Pausar"]') as HTMLButtonElement;
      expect(playPauseBtn).toBeTruthy();

      act(() => {
        playPauseBtn.click();
      });

      expect(useViewportStore.getState().isAnimationPlaying).toBe(false);
      expect(container.querySelector('button[title*="Reproducir"]')).toBeTruthy();
    });

    it('renders multi-clip selector dropdown when more than 1 clip is present', () => {
      useViewportStore.getState().setAnimations([
        { name: 'Clip A', duration: 1.0 },
        { name: 'Clip B', duration: 2.0 }
      ]);

      act(() => {
        root.render(<AnimationControlsItem />);
      });

      // Dropdown trigger button
      const dropdownBtn = container.querySelector('button[title="Seleccionar animación"]') as HTMLButtonElement;
      expect(dropdownBtn).toBeTruthy();
      expect(dropdownBtn.textContent).toContain('Clip A');

      // Click to open dropdown
      act(() => {
        dropdownBtn.click();
      });

      expect(container.textContent).toContain('Clip B');
    });

    it('supports Spacebar keybind to toggle playback', () => {
      useViewportStore.getState().setAnimations([{ name: 'Spin', duration: 1.0 }]);

      act(() => {
        root.render(<AnimationControlsItem />);
      });

      expect(useViewportStore.getState().isAnimationPlaying).toBe(true);

      // Dispatch spacebar keydown on window
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
      });

      expect(useViewportStore.getState().isAnimationPlaying).toBe(false);

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
      });

      expect(useViewportStore.getState().isAnimationPlaying).toBe(true);
    });
  });

  describe('Toolbar and StatusBar Integration', () => {
    it('renders animation-controls in ViewportStatusBar when animations exist', () => {
      useViewportStore.getState().setAnimations([{ name: 'ColorCycle', duration: 2.0 }]);

      act(() => {
        root.render(<ViewportStatusBar />);
      });

      const item = container.querySelector('[data-bar-item="animation-controls"]');
      expect(item).toBeTruthy();
    });

    it('renders animation-controls in ViewportToolbar when moved there', () => {
      useViewportStore.getState().setAnimations([{ name: 'ColorCycle', duration: 2.0 }]);

      act(() => {
        useViewportStore.getState().moveBarItem('animation-controls', 'statusbar', 'toolbar');
      });

      act(() => {
        root.render(<ViewportToolbar />);
      });

      const item = container.querySelector('[data-bar-item="animation-controls"]');
      expect(item).toBeTruthy();
    });
  });
});
