import React, { useState, useEffect } from 'react';
import { Play, Pause, Repeat, RotateCcw, StepBack, StepForward, Film } from 'lucide-react';
import { useViewportStore } from '../../../store/viewportStore';
import { viewportBridge } from '../../../utils/viewportBridge';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(2);
  const paddedSecs = seconds % 60 < 10 ? `0${secs}` : secs;
  return `${mins > 0 ? `${mins}:` : ''}${paddedSecs}s`;
}

export const CanvasAnimationWidget: React.FC = () => {
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

  const activeClip = animationClips[activeAnimationIndex] || null;
  const duration = activeClip?.duration || 0;

  // 60 FPS time polling
  useEffect(() => {
    let animId: number;
    const update = () => {
      if (!isScrubbing) {
        setCurrentTime(viewportBridge.getAnimationTime());
      }
      animId = requestAnimationFrame(update);
    };
    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [isScrubbing]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    seekAnimation(val);
  };

  const stepTime = (delta: number) => {
    const next = Math.max(0, Math.min(duration, currentTime + delta));
    setCurrentTime(next);
    seekAnimation(next);
  };

  const resetToStart = () => {
    setCurrentTime(0);
    seekAnimation(0);
  };

  const speeds = [0.5, 1.0, 1.5, 2.0];

  return (
    <div className="w-72 flex flex-col gap-2.5">
      {/* Clip Selector (if >1 clip) */}
      {animationClips.length > 1 && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-hairline">
          <Film size={11} className="text-ink-tertiary shrink-0 mr-0.5" />
          {animationClips.map((clip, idx) => (
            <button
              key={clip.name + idx}
              type="button"
              onClick={() => setActiveAnimationIndex(idx)}
              className={`px-2 py-0.5 rounded-xs text-[10px] font-mono whitespace-nowrap transition-colors border ${
                idx === activeAnimationIndex
                  ? 'bg-action/15 text-action border-action/40 font-medium'
                  : 'text-ink-secondary border-hairline hover:bg-surface-high'
              }`}
            >
              {clip.name} ({clip.duration.toFixed(1)}s)
            </button>
          ))}
        </div>
      )}

      {/* Large Tabular Time Display */}
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-base font-bold tabular-nums text-ink-primary tracking-tight">
          {formatTime(currentTime)}
        </span>
        <span className="font-mono text-xs tabular-nums text-ink-tertiary">
          Total: {formatTime(duration)}
        </span>
      </div>

      {/* Interactive Timeline Scrubber with tick background */}
      <div className="relative flex items-center">
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
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseUp={() => setIsScrubbing(false)}
          onChange={handleSliderChange}
          data-interactive="true"
          className="w-full h-1.5 bg-surface-high rounded-none appearance-none cursor-pointer accent-action"
        />
      </div>

      {/* Studio Transport Buttons */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1">
          {/* Reset / Return to 0 */}
          <button
            type="button"
            onClick={resetToStart}
            title="Return to start (0s)"
            className="flex items-center justify-center w-7 h-7 rounded-xs text-ink-secondary hover:text-ink-primary hover:bg-surface-high border border-hairline transition-colors"
          >
            <RotateCcw size={12} />
          </button>

          {/* Step Back -0.1s */}
          <button
            type="button"
            onClick={() => stepTime(-0.1)}
            title="Step back 0.1s"
            className="flex items-center justify-center w-7 h-7 rounded-xs text-ink-secondary hover:text-ink-primary hover:bg-surface-high border border-hairline transition-colors"
          >
            <StepBack size={12} />
          </button>

          {/* Prominent Play/Pause */}
          <button
            type="button"
            onClick={toggleAnimationPlayback}
            title={isAnimationPlaying ? 'Pause (Space)' : 'Play (Space)'}
            className={`flex items-center justify-center w-8 h-7 rounded-xs transition-colors shadow-xs ${
              isAnimationPlaying
                ? 'bg-action text-on-action hover:bg-action-hover'
                : 'bg-surface-high text-ink-primary hover:bg-surface-container border border-hairline'
            }`}
          >
            {isAnimationPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
          </button>

          {/* Step Forward +0.1s */}
          <button
            type="button"
            onClick={() => stepTime(0.1)}
            title="Step forward 0.1s"
            className="flex items-center justify-center w-7 h-7 rounded-xs text-ink-secondary hover:text-ink-primary hover:bg-surface-high border border-hairline transition-colors"
          >
            <StepForward size={12} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {/* Speed Chips */}
          <div className="flex items-center rounded-xs border border-hairline overflow-hidden">
            {speeds.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setAnimationPlaybackSpeed(s)}
                className={`px-1.5 py-0.5 text-[10px] font-mono tabular-nums transition-colors ${
                  s === animationPlaybackSpeed
                    ? 'bg-action text-on-action font-bold'
                    : 'text-ink-secondary hover:bg-surface-high'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Loop Toggle */}
          <button
            type="button"
            onClick={toggleAnimationLoop}
            title={isAnimationLooping ? 'Loop playback (On)' : 'Play once'}
            className={`flex items-center justify-center w-7 h-7 rounded-xs transition-colors border ${
              isAnimationLooping
                ? 'text-action bg-action/10 border-action/30'
                : 'text-ink-tertiary border-hairline hover:bg-surface-high'
            }`}
          >
            <Repeat size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};
