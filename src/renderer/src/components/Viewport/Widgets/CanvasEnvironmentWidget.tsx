import React, { useEffect } from 'react';
import {
  Building2,
  SunMedium,
  Warehouse,
  Home,
  Landmark,
  Sunset,
  Moon,
  Trees,
  FolderOpen,
  Eye,
  EyeOff,
  Trash2,
  Check,
  Image,
  X,
  LayoutGrid,
  List
} from 'lucide-react';
import { useViewportStore, EnvironmentPreset } from '../../../store/viewportStore';

interface PresetDefinition {
  id: EnvironmentPreset;
  label: string;
  desc: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const ENVIRONMENT_PRESETS: PresetDefinition[] = [
  { id: 'city', label: 'City', desc: 'Urban, soft sunlight', icon: Building2 },
  { id: 'studio', label: 'Studio', desc: 'Neutral, high fidelity', icon: SunMedium },
  { id: 'warehouse', label: 'Warehouse', desc: 'Industrial, high contrast', icon: Warehouse },
  { id: 'apartment', label: 'Apartment', desc: 'Warm, indoor ambient', icon: Home },
  { id: 'lobby', label: 'Lobby', desc: 'Architectural, bright', icon: Landmark },
  { id: 'sunset', label: 'Sunset', desc: 'Golden hour tones', icon: Sunset },
  { id: 'night', label: 'Night', desc: 'Cool light & accents', icon: Moon },
  { id: 'park', label: 'Park', desc: 'Natural outdoor foliage', icon: Trees }
];

export const CanvasEnvironmentWidget: React.FC = () => {
  const environmentPreset = useViewportStore((s) => s.environmentPreset);
  const setEnvironmentPreset = useViewportStore((s) => s.setEnvironmentPreset);
  const showEnvironmentBackground = useViewportStore((s) => s.showEnvironmentBackground);
  const toggleEnvironmentBackground = useViewportStore((s) => s.toggleEnvironmentBackground);
  const customHdrName = useViewportStore((s) => s.customHdrName);
  const customHdrs = useViewportStore((s) => s.customHdrs);
  const loadCustomHdrs = useViewportStore((s) => s.loadCustomHdrs);
  const importCustomHdr = useViewportStore((s) => s.importCustomHdr);
  const deleteCustomHdr = useViewportStore((s) => s.deleteCustomHdr);
  const selectCustomHdr = useViewportStore((s) => s.selectCustomHdr);
  const canvasEnvironmentMode = useViewportStore((s) => s.canvasEnvironmentMode);
  const toggleCanvasEnvironmentMode = useViewportStore((s) => s.toggleCanvasEnvironmentMode);

  useEffect(() => {
    loadCustomHdrs();
  }, [loadCustomHdrs]);

  const handlePickCustomHdr = async () => {
    if (window.electronAPI) {
      const file = await window.electronAPI.openFileDialog({
        title: 'Select HDRI Environment Map (.hdr)',
        filters: [{ name: 'HDRI Environment Map', extensions: ['hdr'] }]
      });
      if (file) {
        await importCustomHdr(file);
      }
    }
  };

  const handleDeleteCustomHdr = async (e: React.MouseEvent, fileName: string) => {
    e.stopPropagation();
    await deleteCustomHdr(fileName);
  };

  // ----------------------------------------------------
  // COMPRESSED VERSION (ONLY BIG ICONS)
  // ----------------------------------------------------
  if (canvasEnvironmentMode === 'icons') {
    return (
      <div className="w-[188px] flex flex-col gap-2 text-xs antialiased" data-testid="canvas-env-compressed">
        {/* Quick Utility Actions Row */}
        <div className="flex items-center justify-between gap-1 pb-1 border-b border-hairline/60">
          <div className="flex items-center gap-1">
            {/* Background 3D Toggle */}
            <button
              type="button"
              onClick={toggleEnvironmentBackground}
              title={
                showEnvironmentBackground
                  ? '3D Background: Visible (Click to hide)'
                  : '3D Background: Hidden (Click to show)'
              }
              className={`w-7 h-7 rounded-xs border transition-colors flex items-center justify-center cursor-pointer ${
                showEnvironmentBackground
                  ? 'bg-action/20 border-action text-action shadow-xs'
                  : 'bg-surface-container/30 border-hairline text-ink-tertiary hover:text-ink-primary hover:bg-surface-container'
              }`}
            >
              {showEnvironmentBackground ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>

            {/* Load Custom HDR */}
            <button
              type="button"
              onClick={handlePickCustomHdr}
              title={customHdrName ? `Active HDR: ${customHdrName} (Browse...)` : 'Load custom .hdr file'}
              className="w-7 h-7 rounded-xs border border-hairline bg-surface-container/30 hover:bg-surface-container hover:border-hairline-strong text-ink-secondary hover:text-ink-primary transition-colors flex items-center justify-center cursor-pointer"
            >
              <FolderOpen size={14} className="text-action" />
            </button>
          </div>

          {/* Switch to detailed list view */}
          <button
            type="button"
            onClick={toggleCanvasEnvironmentMode}
            title="Switch to detailed list view"
            className="w-7 h-7 rounded-xs border border-hairline bg-surface-container/30 hover:bg-surface-container hover:border-hairline-strong text-ink-tertiary hover:text-ink-primary transition-colors flex items-center justify-center cursor-pointer"
          >
            <List size={13} />
          </button>
        </div>

        {/* Presets Grid: Big Icons */}
        <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="HDRI lighting presets">
          {ENVIRONMENT_PRESETS.map((preset) => {
            const isSelected = !customHdrName && environmentPreset === preset.id;
            const Icon = preset.icon;

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setEnvironmentPreset(preset.id)}
                title={`${preset.label}: ${preset.desc}`}
                aria-label={preset.label}
                className={`h-11 w-11 flex flex-col items-center justify-center rounded-none border transition-colors cursor-pointer relative group ${
                  isSelected
                    ? 'bg-action/20 border-action text-action shadow-xs ring-1 ring-action/50'
                    : 'bg-surface-container/30 border-hairline text-ink-secondary hover:text-ink-primary hover:bg-surface-high hover:border-hairline-strong'
                }`}
              >
                <Icon size={20} className={isSelected ? 'text-action' : 'text-ink-secondary group-hover:text-ink-primary'} />
              </button>
            );
          })}
        </div>

        {/* Mis Entornos (Custom HDRs - Big Icons Grid) */}
        {customHdrs.length > 0 && (
          <div className="flex flex-col gap-1 border-t border-hairline pt-1.5">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-ink-tertiary">
                My Environments
              </span>
              <span className="text-[9px] font-mono text-ink-tertiary">
                {customHdrs.length}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 max-h-28 overflow-y-auto pr-0.5">
              {customHdrs.map((hdr) => {
                const isSelected =
                  environmentPreset === `custom:${hdr.name}` ||
                  customHdrName === hdr.displayName ||
                  customHdrName === hdr.name;

                return (
                  <div
                    key={hdr.name}
                    onClick={() => selectCustomHdr(hdr)}
                    title={hdr.displayName || hdr.name}
                    aria-label={hdr.displayName || hdr.name}
                    className={`h-11 w-11 flex flex-col items-center justify-center rounded-none border transition-colors cursor-pointer relative group ${
                      isSelected
                        ? 'bg-action/20 border-action text-action shadow-xs ring-1 ring-action/50'
                        : 'bg-surface-container/30 border-hairline text-ink-secondary hover:text-ink-primary hover:bg-surface-high hover:border-hairline-strong'
                    }`}
                  >
                    <Image size={18} className={isSelected ? 'text-action' : 'text-ink-secondary group-hover:text-ink-primary'} />
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCustomHdr(e, hdr.name)}
                      title={`Delete ${hdr.displayName || hdr.name}`}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-surface-lowest border border-hairline text-ink-tertiary hover:text-rose-500 hover:border-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                    >
                      <X size={10} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // DETAILED LIST VERSION (DEFAULT)
  // ----------------------------------------------------
  return (
    <div className="w-64 flex flex-col gap-2 text-xs antialiased" data-testid="canvas-env-list">
      {/* Background Toggle & Mode Switch */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-surface-container/20 rounded-xs border border-hairline">
        <div className="flex items-center gap-1.5 text-ink-secondary">
          {showEnvironmentBackground ? <Eye size={13} className="text-action" /> : <EyeOff size={13} className="text-ink-tertiary" />}
          <span className="font-medium text-ink-primary">Show 3D sky/background</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleEnvironmentBackground}
            className={`px-2 py-0.5 rounded-xs font-primary text-[10px] font-bold uppercase tracking-wider transition-colors border cursor-pointer ${
              showEnvironmentBackground
                ? 'bg-action text-white border-action'
                : 'bg-surface-lowest text-ink-tertiary border-hairline hover:text-ink-primary'
            }`}
          >
            {showEnvironmentBackground ? 'Visible' : 'Hidden'}
          </button>
          <button
            type="button"
            onClick={toggleCanvasEnvironmentMode}
            title="Switch to compact large icon view"
            className="p-1 rounded-xs border border-hairline bg-surface-container/30 hover:bg-surface-container hover:text-action text-ink-tertiary transition-colors cursor-pointer"
          >
            <LayoutGrid size={11} />
          </button>
        </div>
      </div>

      {/* Studio Presets List (Scrollable) */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-primary font-bold uppercase tracking-wider text-ink-tertiary px-0.5">
          Studio Presets
        </span>
        <div className="max-h-36 overflow-y-auto flex flex-col gap-0.5 pr-0.5">
          {ENVIRONMENT_PRESETS.map((preset) => {
            const isSelected = !customHdrName && environmentPreset === preset.id;
            const Icon = preset.icon;

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setEnvironmentPreset(preset.id)}
                className={`w-full px-2 py-1.5 rounded-xs text-left text-xs flex items-center justify-between transition-colors border cursor-pointer ${
                  isSelected
                    ? 'bg-action/15 border-action/40 text-action font-semibold'
                    : 'bg-surface-container/20 border-transparent text-ink-primary hover:bg-surface-container'
                }`}
              >
                <div className="flex items-center gap-2 truncate flex-1 pr-1">
                  <Icon size={14} className={isSelected ? 'text-action' : 'text-ink-tertiary'} />
                  <span className="truncate font-medium">{preset.label}</span>
                </div>
                {isSelected && <Check size={13} className="text-action shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mis Entornos (Custom HDRs - Scrollable) */}
      {customHdrs.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-hairline pt-1.5">
          <span className="text-[10px] font-primary font-bold uppercase tracking-wider text-ink-tertiary px-0.5">
            My Environments
          </span>
          <div className="max-h-36 overflow-y-auto flex flex-col gap-0.5 pr-0.5">
            {customHdrs.map((hdr) => {
              const isSelected =
                environmentPreset === `custom:${hdr.name}` ||
                customHdrName === hdr.displayName ||
                customHdrName === hdr.name;

              return (
                <div
                  key={hdr.name}
                  onClick={() => selectCustomHdr(hdr)}
                  className={`w-full px-2 py-1.5 rounded-xs text-left text-xs flex items-center justify-between transition-colors border group cursor-pointer ${
                    isSelected
                      ? 'bg-action/15 border-action/40 text-action font-semibold'
                      : 'bg-surface-container/20 border-transparent text-ink-primary hover:bg-surface-container'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate flex-1 pr-1">
                    <Image size={14} className={isSelected ? 'text-action' : 'text-ink-tertiary'} />
                    <span className="truncate text-xs font-medium" title={hdr.displayName || hdr.name}>
                      {hdr.displayName || hdr.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isSelected && <Check size={13} className="text-action" />}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCustomHdr(e, hdr.name)}
                      title={`Delete ${hdr.displayName || hdr.name}`}
                      className="opacity-0 group-hover:opacity-100 hover:text-red-500 text-ink-tertiary p-0.5 rounded transition-opacity"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom HDR Button */}
      <button
        type="button"
        onClick={handlePickCustomHdr}
        className="flex items-center justify-between px-2 py-1.5 rounded-xs bg-surface-container/20 hover:bg-surface-container border border-hairline text-ink-secondary hover:text-ink-primary transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-1.5 truncate">
          <FolderOpen size={13} className="text-action shrink-0" />
          <span className="text-xs truncate font-medium">
            {customHdrName || 'Load custom .hdr file'}
          </span>
        </div>
        <span className="text-[10px] font-primary uppercase font-bold text-ink-tertiary shrink-0 ml-1">Browse</span>
      </button>
    </div>
  );
};
