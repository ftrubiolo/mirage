import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Repeat, Film, ChevronDown } from 'lucide-react';
import { useViewportStore } from '../../../store/viewportStore';
import { viewportBridge } from '../../../utils/viewportBridge';
import { useDropdownPlacement, getDropdownPlacementClass } from './useDropdownPlacement';

interface AnimationControlsItemProps {
  compact?: boolean;
  iconOnly?: boolean;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  const paddedSecs = seconds % 60 < 10 ? `0${secs}` : secs;
  return `${mins > 0 ? `${mins}:` : ''}${paddedSecs}s`;
}

export const AnimationControlsItem: React.FC<AnimationControlsItemProps> = ({
  compact = false,
  iconOnly = false
}) => {
  const hasAnimations = useViewportStore((s) => s.hasAnimations);
  const animationClips = useViewportStore((s) => s.animationClips);
  const activeAnimationIndex = useViewportStore((s) => s.activeAnimationIndex);
  const isAnimationPlaying = useViewportStore((s) => s.isAnimationPlaying);
  const animationPlaybackSpeed = useViewportStore((s) => s.animationPlaybackSpeed);
  const isAnimationLooping = useViewportStore((s) => s.isAnimationLooping);
  const toggleAnimationPlayback = useViewportStore((s) => s.toggleAnimationPlayback);
  const seekAnimation = useViewportStore((s) => s.seekAnimation);
  const setActiveAnimationIndex = useViewportStore((s) => s.setActiveAnimationIndex);
  const setAnimationPlaybackSpeed = useViewportStore((s) => s.setAnimationPlaybackSpeed);
  const toggleAnimationLoop = useViewportStore((s) => s.toggleAnimationLoop);

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [clipMenuOpen, setClipMenuOpen] = useState<boolean>(false);
  const clipMenuRef = useRef<HTMLDivElement>(null);
  const clipTriggerRef = useRef<HTMLButtonElement>(null);

  const dropdownPlacement = useDropdownPlacement(clipTriggerRef, clipMenuOpen, 160);
  const placementClass = getDropdownPlacementClass(dropdownPlacement);

  const activeClip = animationClips[activeAnimationIndex] || null;
  const duration = activeClip?.duration || 0;

  // Poll animation time smoothly via requestAnimationFrame when playing
  useEffect(() => {
    let animId: number;
    const update = () => {
      if (!isScrubbing) {
        const t = viewportBridge.getAnimationTime();
        setCurrentTime(t);
      }
      animId = requestAnimationFrame(update);
    };
    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [isScrubbing]);

  // Global spacebar listener to toggle animation playback when not typing in an input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!hasAnimations) return;
      if (e.code === 'Space') {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
          return;
        }
        e.preventDefault();
        toggleAnimationPlayback();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasAnimations, toggleAnimationPlayback]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        clipMenuRef.current &&
        !clipMenuRef.current.contains(e.target as Node) &&
        !clipTriggerRef.current?.contains(e.target as Node)
      ) {
        setClipMenuOpen(false);
      }
    };
    if (clipMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [clipMenuOpen]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    seekAnimation(val);
  };

  const cycleSpeed = () => {
    const speeds = [0.5, 1.0, 1.5, 2.0];
    const currentIndex = speeds.indexOf(animationPlaybackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setAnimationPlaybackSpeed(speeds[nextIndex]);
  };

  if (!hasAnimations) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 h-7 px-1.5 rounded-xs bg-surface-container/60 border border-hairline text-ink-primary text-xs select-none">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={toggleAnimationPlayback}
          title={isAnimationPlaying ? 'Pause (Space)' : 'Play (Space)'}
          className={`flex items-center justify-center w-6 h-6 rounded-xs transition-colors ${
            isAnimationPlaying
              ? 'bg-action text-white hover:bg-action-hover'
              : 'bg-surface-high/80 text-ink-primary hover:bg-surface-high'
          }`}
        >
          {isAnimationPlaying ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
        </button>

        {/* Scrubber & Time */}
        {!iconOnly && (
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.01}
              value={currentTime}
              draggable={false}
              onDragStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                setIsScrubbing(true);
                (e.target as HTMLElement).closest('[data-toolbar-item]')?.setAttribute('draggable', 'false');
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                (e.target as HTMLElement).closest('[data-toolbar-item]')?.setAttribute('draggable', 'false');
              }}
              onMouseUp={() => setIsScrubbing(false)}
              onChange={handleSliderChange}
              data-interactive="true"
              className="w-20 md:w-28 h-1 bg-surface-high rounded-none appearance-none cursor-pointer accent-action"
            />
            <span className="font-mono text-[11px] tabular-nums text-ink-secondary whitespace-nowrap min-w-[72px]">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        )}

        {/* Clip selector dropdown (if multiple clips exist) */}
        {!compact && !iconOnly && animationClips.length > 1 && (
          <div className="relative">
            <button
              ref={clipTriggerRef}
              type="button"
              onClick={() => setClipMenuOpen((prev) => !prev)}
              className="flex items-center gap-1 px-1.5 py-0.5 h-6 rounded-xs bg-surface-high/60 hover:bg-surface-high text-[11px] text-ink-primary border border-hairline transition-colors"
              title="Select animation"
            >
              <Film size={11} className="text-ink-tertiary" />
              <span className="truncate max-w-[90px]">{activeClip?.name || 'Animation'}</span>
              <ChevronDown size={10} className="text-ink-tertiary" />
            </button>

            {clipMenuOpen && (
              <div
                ref={clipMenuRef}
                className={`absolute z-50 min-w-[140px] max-h-48 overflow-y-auto bg-surface-lowest border border-hairline rounded-xs shadow-lg py-1 text-xs ${placementClass}`}
              >
                {animationClips.map((clip, idx) => (
                  <button
                    key={clip.name + idx}
                    type="button"
                    onClick={() => {
                      setActiveAnimationIndex(idx);
                      setClipMenuOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1 flex items-center justify-between transition-colors ${
                      idx === activeAnimationIndex
                        ? 'bg-action/10 text-action font-medium'
                        : 'text-ink-primary hover:bg-surface-high/60'
                    }`}
                  >
                    <span className="truncate mr-2">{clip.name}</span>
                    <span className="font-mono text-[10px] text-ink-tertiary tabular-nums">
                      {formatTime(clip.duration)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Playback Speed */}
        {!compact && !iconOnly && (
          <button
            type="button"
            onClick={cycleSpeed}
            title={`Playback speed (${animationPlaybackSpeed}x)`}
            className="flex items-center justify-center px-1.5 h-6 rounded-xs bg-surface-high/50 hover:bg-surface-high text-[10px] font-mono tabular-nums text-ink-secondary hover:text-ink-primary transition-colors border border-hairline"
          >
            {animationPlaybackSpeed}x
          </button>
        )}

        {/* Loop Toggle */}
        <button
          type="button"
          onClick={toggleAnimationLoop}
          title={isAnimationLooping ? 'Loop playback (On)' : 'Play once (Off)'}
          className={`flex items-center justify-center w-6 h-6 rounded-xs transition-colors ${
            isAnimationLooping
              ? 'text-action bg-action/10 hover:bg-action/20'
              : 'text-ink-tertiary hover:bg-surface-high hover:text-ink-primary'
          }`}
        >
          <Repeat size={12} />
        </button>
      </div>
  );
};
