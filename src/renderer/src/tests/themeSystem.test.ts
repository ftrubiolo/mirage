import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  BASALT_CLASSIC_THEME,
  DEFAULT_THEME_ID,
  PORTFOLIO_MIRAGE_THEME,
  getContrastRatio,
  normalizePalette,
  parseThemeFileJson
} from '../../../shared/themes';
import { discoverThemes, seedDefaultThemes } from '../../../main/themeService';
import { useAppStore } from '../store/appStore';

describe('Theme System, Local Templates, and Symlinked Generator Themes', () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'mirage-theme-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
  });

  it('derives the default Mirage Slate theme from the portfolio palette with accessible contrast', () => {
    expect(DEFAULT_THEME_ID).toBe('mirage');
    expect(PORTFOLIO_MIRAGE_THEME.dark.canvas).toBe('#1e2123');
    expect(PORTFOLIO_MIRAGE_THEME.dark.surfaceLowest).toBe('#24282b');
    expect(PORTFOLIO_MIRAGE_THEME.dark.action).toBe('#41c9b4');
    expect(PORTFOLIO_MIRAGE_THEME.dark.onAction).toBe('#0e1715');

    expect(PORTFOLIO_MIRAGE_THEME.light.canvas).toBe('#fcfcfd');
    expect(PORTFOLIO_MIRAGE_THEME.light.surfaceLowest).toBe('#ffffff');
    expect(PORTFOLIO_MIRAGE_THEME.light.action).toBe('#2cb696');
    expect(PORTFOLIO_MIRAGE_THEME.light.onAction).toBe('#0e1715');

    expect(
      getContrastRatio(PORTFOLIO_MIRAGE_THEME.dark.onAction, PORTFOLIO_MIRAGE_THEME.dark.action)
    ).toBeGreaterThanOrEqual(7);
    expect(
      getContrastRatio(PORTFOLIO_MIRAGE_THEME.light.onAction, PORTFOLIO_MIRAGE_THEME.light.action)
    ).toBeGreaterThanOrEqual(7);

    // Classic Basalt Crimson remains intact as a template preset
    expect(BASALT_CLASSIC_THEME.dark.canvas).toBe('#111110');
    expect(BASALT_CLASSIC_THEME.dark.action).toBe('#b53420');
    expect(BASALT_CLASSIC_THEME.dark.onAction).toBe('#ffffff');
  });

  it('auto-derives full surfaces, hairlines, contrast ink, and viewport colors from minimal seeds', () => {
    const darkTokens = normalizePalette(
      {
        canvas: '#16181d',
        inkPrimary: '#f1f5f9',
        action: '#38bdf8'
      },
      true
    );

    expect(darkTokens.canvas).toBe('#16181d');
    expect(darkTokens.surfaceLowest).toMatch(/^#[0-9a-f]{6}$/);
    expect(darkTokens.viewport.background).toBe('#16181d');
    expect(darkTokens.viewport.dimensionLine).toBe('#38bdf8');
    expect(getContrastRatio(darkTokens.onAction, darkTokens.action)).toBeGreaterThanOrEqual(4.5);
  });

  it('parses minimal and single-mode JSON theme files (including preferredMode + palette)', () => {
    const raw = JSON.stringify({
      name: 'Nordic Slate',
      dark: {
        canvas: '#2e3440',
        inkPrimary: '#eceff4',
        action: '#88c0d0'
      }
    });

    const parsed = parseThemeFileJson(raw, 'nordic-slate');
    expect(parsed).not.toBeNull();
    expect(parsed?.id).toBe('nordic-slate');
    expect(parsed?.name).toBe('Nordic Slate');
    expect(parsed?.dark.canvas).toBe('#2e3440');
    expect(parsed?.light.canvas).toBe('#fcfcfd');
    expect(parsed?.dark.onAction).toBe('#0e1715');

    const generated = parseThemeFileJson(
      JSON.stringify({
        id: 'omarchy',
        name: 'Omarchy',
        preferredMode: 'light',
        palette: {
          canvas: '#eff1f5',
          inkPrimary: '#4c4f69',
          action: '#1e66f5'
        }
      }),
      'omarchy'
    );
    expect(generated?.preferredMode).toBe('light');
    expect(generated?.light.canvas).toBe('#eff1f5');
    expect(generated?.light.action).toBe('#1e66f5');
    expect(generated?.light.onAction).toBe('#ffffff');
  });

  it('seeds templates without clobbering edits and discovers custom + symlinked themes', async () => {
    const themesDir = path.join(tmpRoot, 'themes');
    const externalDir = path.join(tmpRoot, 'external-generator');

    await fs.mkdir(externalDir, { recursive: true });
    await seedDefaultThemes(themesDir);

    const seededFiles = await fs.readdir(themesDir);
    expect(seededFiles).toContain('mirage.json');
    expect(seededFiles).toContain('basalt.json');
    expect(seededFiles).toContain('_template.json');
    expect(seededFiles).toContain('README.txt');

    // User customizes basalt.json -> seedDefaultThemes must NOT overwrite it
    const customBasalt = JSON.parse(await fs.readFile(path.join(themesDir, 'basalt.json'), 'utf-8'));
    customBasalt.name = 'Basalt Custom Edit';
    await fs.writeFile(path.join(themesDir, 'basalt.json'), JSON.stringify(customBasalt, null, 2));
    await seedDefaultThemes(themesDir);

    // User drops a custom JSON file
    await fs.writeFile(
      path.join(themesDir, 'studio-olive.json'),
      JSON.stringify({
        name: 'Studio Olive',
        dark: { canvas: '#161915', inkPrimary: '#eef2eb', action: '#84cc16' }
      })
    );

    // User symlinks an externally generated theme (e.g. Omarchy / Pywal) into themesDir
    const externalThemePath = path.join(externalDir, 'mirage.json');
    await fs.writeFile(
      externalThemePath,
      JSON.stringify({
        id: 'omarchy',
        name: 'Omarchy',
        preferredMode: 'dark',
        palette: {
          canvas: '#191724',
          inkPrimary: '#e0def4',
          action: '#ebbcba'
        }
      })
    );
    await fs.symlink(externalThemePath, path.join(themesDir, 'omarchy.json'));

    // Broken symlink must be skipped gracefully without breaking discovery
    await fs.symlink(path.join(externalDir, 'missing.json'), path.join(themesDir, 'broken.json'));

    const discovered = await discoverThemes(themesDir);
    const ids = discovered.map((t) => t.id);
    expect(ids).toContain('mirage');
    expect(ids).toContain('basalt');
    expect(ids).toContain('studio-olive');
    expect(ids).toContain('omarchy');
    expect(ids).not.toContain('broken');
    expect(ids).not.toContain('_template');

    const editedBasalt = discovered.find((t) => t.id === 'basalt');
    expect(editedBasalt?.name).toBe('Basalt Custom Edit');

    const linkedOmarchy = discovered.find((t) => t.id === 'omarchy');
    expect(linkedOmarchy?.dark.canvas).toBe('#191724');
    expect(linkedOmarchy?.dark.action).toBe('#ebbcba');
    expect(linkedOmarchy?.dark.onAction).toBe('#0e1715');
  });

  it('updates CSS variables on documentElement when swapping themes and modes in useAppStore', () => {
    useAppStore.getState().setThemeId('mirage');
    useAppStore.getState().setThemeMode('dark');

    expect(document.documentElement.getAttribute('data-theme')).toBe('mirage');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.getPropertyValue('--canvas')).toBe('#1e2123');
    expect(document.documentElement.style.getPropertyValue('--action')).toBe('#41c9b4');
    expect(document.documentElement.style.getPropertyValue('--on-action')).toBe('#0e1715');

    useAppStore.getState().setThemeId('basalt');
    expect(document.documentElement.getAttribute('data-theme')).toBe('basalt');
    expect(document.documentElement.style.getPropertyValue('--canvas')).toBe('#111110');
    expect(document.documentElement.style.getPropertyValue('--action')).toBe('#b53420');
    expect(document.documentElement.style.getPropertyValue('--on-action')).toBe('#ffffff');

    useAppStore.getState().setThemeMode('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.style.getPropertyValue('--canvas')).toBe('#fdfdfd');
    expect(document.documentElement.style.getPropertyValue('--action')).toBe('#9a2716');
  });
});
