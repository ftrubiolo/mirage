import React, { useEffect } from 'react';
import {
  Moon,
  Sun,
  Laptop,
  Palette,
  Type,
  FolderOpen,
  RefreshCw
} from 'lucide-react';
import { useAppStore, ThemeMode, FontDensity } from '../../store/appStore';
import { ThemeSourceKind } from '../../../../shared/themes';
import { Card } from '../UI/Card';
import { Badge } from '../UI/Badge';
import { Button } from '../UI/Button';
import { SectionHeader } from '../UI/SectionHeader';

interface ModeOption {
  mode: ThemeMode;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface DensityOption {
  id: FontDensity;
  label: string;
  desc: string;
}

const MODE_OPTIONS: ModeOption[] = [
  {
    mode: 'dark',
    label: 'Dark',
    desc: 'Low-glare dark surfaces calibrated for long 3D inspection sessions.',
    icon: Moon
  },
  {
    mode: 'light',
    label: 'Light',
    desc: 'High-key daylight surfaces with crisp architectural contrast.',
    icon: Sun
  },
  {
    mode: 'system',
    label: 'Automatic (System)',
    desc: 'Follows your OS preference, or the theme file’s preferredMode when specified.',
    icon: Laptop
  }
];

const DENSITY_OPTIONS: DensityOption[] = [
  { id: 'standard', label: 'Standard', desc: 'Balanced spacing for high-resolution displays' },
  { id: 'compact', label: 'Compact', desc: 'Higher information density and tighter controls' },
  { id: 'dense', label: 'Dense', desc: 'Maximum compression for telemetry and technical inspection' }
];

const SOURCE_LABELS: Record<ThemeSourceKind, string> = {
  builtin: 'Template',
  local: 'Custom / Linked'
};

export const AppearanceSection: React.FC = () => {
  const {
    settings,
    resolvedTheme,
    availableThemes,
    themesDirPath,
    setThemeId,
    setThemeMode,
    setFontDensity,
    refreshThemes
  } = useAppStore();

  useEffect(() => {
    void refreshThemes();
  }, [refreshThemes]);

  const handleOpenThemesFolder = async () => {
    if (!themesDirPath || !window.electronAPI?.openPathInExplorer) return;
    await window.electronAPI.openPathInExplorer(themesDirPath);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-100">
      <div>
        <h1 className="font-primary font-bold text-base tracking-tight uppercase text-ink-primary">
          Appearance &amp; Theme
        </h1>
        <p className="text-xs text-ink-secondary mt-0.5">
          Swap built-in, custom JSON, or symlinked generator palettes, color mode, and density.
        </p>
      </div>

      {/* Swappable Theme Presets */}
      <section className="space-y-3">
        <SectionHeader
          title="Theme Palette"
          subtitle="Watches ~/.config/mirage/themes for *.json files and symlinks"
          icon={<Palette className="w-4 h-4" />}
          bordered={false}
          action={
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="xs"
                icon={<RefreshCw className="w-3 h-3" />}
                onClick={() => void refreshThemes()}
                title="Rescan themes directory"
              >
                Refresh
              </Button>
              {themesDirPath && (
                <Button
                  variant="secondary"
                  size="xs"
                  icon={<FolderOpen className="w-3 h-3" />}
                  onClick={() => void handleOpenThemesFolder()}
                  title={themesDirPath}
                >
                  Themes Folder
                </Button>
              )}
            </div>
          }
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {availableThemes.map((theme) => {
            const isSelected = settings.themeId === theme.id;
            const previewMode =
              settings.themeMode === 'system' && theme.preferredMode
                ? theme.preferredMode
                : resolvedTheme;
            const palette = previewMode === 'dark' ? theme.dark : theme.light;

            return (
              <Card
                key={theme.id}
                selected={isSelected}
                hoverable={!isSelected}
                onClick={() => setThemeId(theme.id)}
                className="p-3.5 flex flex-col justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-primary font-bold text-xs uppercase tracking-wide text-ink-primary truncate">
                      {theme.name}
                    </h3>
                    <p className="text-[11px] text-ink-secondary mt-0.5 leading-snug line-clamp-2">
                      {theme.description}
                    </p>
                  </div>
                  <Badge variant={isSelected ? 'action' : 'neutral'} size="xs" className="shrink-0">
                    {SOURCE_LABELS[theme.source]}
                  </Badge>
                </div>

                {/* Architectural 4-swatch preview strip */}
                <div className="flex items-center justify-between pt-2 border-t border-hairline">
                  <div className="flex items-center gap-1" aria-hidden="true">
                    <span
                      className="w-4 h-4 rounded-xs border border-hairline-strong"
                      style={{ backgroundColor: palette.canvas }}
                      title={`Canvas: ${palette.canvas}`}
                    />
                    <span
                      className="w-4 h-4 rounded-xs border border-hairline-strong"
                      style={{ backgroundColor: palette.surfaceLowest }}
                      title={`Surface: ${palette.surfaceLowest}`}
                    />
                    <span
                      className="w-4 h-4 rounded-xs border border-hairline-strong"
                      style={{ backgroundColor: palette.inkPrimary }}
                      title={`Ink: ${palette.inkPrimary}`}
                    />
                    <span
                      className="w-4 h-4 rounded-xs border border-hairline-strong"
                      style={{ backgroundColor: palette.action }}
                      title={`Accent: ${palette.action}`}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-ink-tertiary uppercase">
                    {theme.id}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Color Mode (Dark / Light / System) */}
      <section className="space-y-3 pt-4 border-t border-hairline">
        <SectionHeader
          title="Color Mode"
          subtitle="Switch between dark, light, or system-matched polarity"
          icon={<Moon className="w-4 h-4" />}
          bordered={false}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {MODE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = settings.themeMode === opt.mode;

            return (
              <Card
                key={opt.mode}
                selected={isSelected}
                hoverable={!isSelected}
                onClick={() => setThemeMode(opt.mode)}
                className="p-4 flex flex-col justify-between cursor-pointer"
              >
                <div className="mb-3">
                  <div
                    className={`w-fit p-2 rounded-xs border transition-colors ${
                      isSelected
                        ? 'bg-action-subtle text-action border-action/30'
                        : 'bg-surface-container border-hairline text-ink-secondary'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="font-primary font-bold text-xs uppercase tracking-wide text-ink-primary">
                    {opt.label}
                  </h3>
                  <p className="text-[11px] text-ink-secondary mt-1 leading-relaxed">
                    {opt.desc}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Font Density */}
      <section className="space-y-3 pt-4 border-t border-hairline">
        <SectionHeader
          title="Interface Density"
          subtitle="UI scale and control compactness"
          icon={<Type className="w-4 h-4" />}
          bordered={false}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {DENSITY_OPTIONS.map((opt) => {
            const isSelected = settings.fontDensity === opt.id;

            return (
              <Card
                key={opt.id}
                selected={isSelected}
                hoverable={!isSelected}
                onClick={() => setFontDensity(opt.id)}
                className="p-3.5 cursor-pointer"
              >
                <h3 className="font-primary font-bold text-xs uppercase text-ink-primary">
                  {opt.label}
                </h3>
                <p className="text-[11px] text-ink-secondary mt-1">
                  {opt.desc}
                </p>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
};
