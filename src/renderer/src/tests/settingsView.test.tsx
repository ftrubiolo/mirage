import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { SettingsView } from '../views/SettingsView';
import { SettingsSidebar } from '../components/Settings/SettingsSidebar';
import { AppearanceSection } from '../components/Settings/AppearanceSection';
import { ViewportSection } from '../components/Settings/ViewportSection';
import { StorageSection } from '../components/Settings/StorageSection';
import { SystemInfoSection } from '../components/Settings/SystemInfoSection';
import { useAppStore } from '../store/appStore';
import { useViewportStore } from '../store/viewportStore';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('SettingsView and Decoupled Settings Components', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    (window as any).electronAPI = {
      getLibraryPath: vi.fn().mockResolvedValue('/home/user/.local/share/mirage/'),
      openPathInExplorer: vi.fn(),
      listCustomHdrs: vi.fn().mockResolvedValue([]),
      saveCustomHdr: vi.fn(),
      deleteCustomHdr: vi.fn()
    };

    useAppStore.setState({
      settings: {
        themeId: 'mirage',
        themeMode: 'dark',
        defaultContactShadows: true,
        defaultGroundGrid: true,
        defaultAutoRotate: false,
        defaultExportFormat: 'webp'
      },
      libraryPath: '/home/user/.local/share/mirage/',
      workbenchSidebarPosition: 'left'
    });

    useViewportStore.setState({
      environmentPreset: 'city',
      customHdrs: [
        {
          name: 'test_sunset.hdr',
          displayName: 'Test Sunset',
          filePath: '/home/user/.local/share/mirage/environments/test_sunset.hdr',
          assetUrl: 'local-asset:///test_sunset.hdr',
          size: 1024
        }
      ]
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  describe('SettingsSidebar Component', () => {
    it('renders all navigation tabs and version badge', () => {
      const handleSelect = vi.fn();
      act(() => {
        root.render(<SettingsSidebar activeTab="appearance" onSelectTab={handleSelect} />);
      });

      expect(container.textContent).toContain('Settings');
      expect(container.textContent).toContain('Appearance & Theme');
      expect(container.textContent).toContain('3D Viewport & Defaults');
      expect(container.textContent).toContain('Keyboard Shortcuts');
      expect(container.textContent).toContain('Local Storage');
      expect(container.textContent).toContain('AI Models & Agents');
      expect(container.textContent).toContain('System Information');
      expect(container.textContent).toContain('v1.0.1');
    });

    it('triggers onSelectTab when clicking a tab button', () => {
      const handleSelect = vi.fn();
      act(() => {
        root.render(<SettingsSidebar activeTab="appearance" onSelectTab={handleSelect} />);
      });

      const buttons = container.querySelectorAll('button');
      const viewportBtn = Array.from(buttons).find((b) => b.textContent?.includes('3D Viewport'));
      expect(viewportBtn).toBeDefined();

      act(() => {
        viewportBtn?.click();
      });

      expect(handleSelect).toHaveBeenCalledWith('viewport');
    });
  });

  describe('AppearanceSection Component', () => {
    it('allows changing theme preset and color mode', () => {
      act(() => {
        root.render(<AppearanceSection />);
      });

      expect(container.textContent).toContain('Appearance & Theme');
      expect(container.textContent).toContain('Mirage Slate');
      expect(container.textContent).toContain('Basalt Crimson');
      expect(container.textContent).toContain('Dark');
      expect(container.textContent).toContain('Light');
      expect(container.textContent).toContain('Automatic (System)');

      const basaltCard = Array.from(container.querySelectorAll('h3')).find(
        (h) => h.textContent?.includes('Basalt Crimson')
      )?.closest('div');
      expect(basaltCard).toBeDefined();
      act(() => {
        (basaltCard as HTMLElement)?.click();
      });
      expect(useAppStore.getState().settings.themeId).toBe('basalt');

      const lightCard = Array.from(container.querySelectorAll('h3')).find(
        (h) => h.textContent?.trim() === 'Light'
      )?.closest('div');
      expect(lightCard).toBeDefined();
      act(() => {
        (lightCard as HTMLElement)?.click();
      });
      expect(useAppStore.getState().settings.themeMode).toBe('light');
    });
  });

  describe('ViewportSection Component', () => {
    it('renders 3D viewport parameters and toggles contact shadows', () => {
      act(() => {
        root.render(<ViewportSection />);
      });

      expect(container.textContent).toContain('3D Viewport Defaults');
      expect(container.textContent).toContain('Ground Contact Shadows');
      expect(container.textContent).toContain('Metric Reference Grid');
      expect(container.textContent).toContain('Smooth Auto-Rotation');

      const switchButton = container.querySelector('button[role="switch"]') as HTMLButtonElement;
      expect(switchButton).not.toBeNull();
      expect(switchButton.getAttribute('aria-checked')).toBe('true');

      act(() => {
        switchButton.click();
      });

      expect(useAppStore.getState().settings.defaultContactShadows).toBe(false);
    });

    it('displays HDRI dropdown with presets and custom HDRIs', () => {
      act(() => {
        root.render(<ViewportSection />);
      });

      const select = container.querySelector('select[aria-label="Default HDRI Environment"]') as HTMLSelectElement;
      expect(select).not.toBeNull();
      expect(select.innerHTML).toContain('Studio Presets');
      expect(select.innerHTML).toContain('Custom Environments');
      expect(select.innerHTML).toContain('Test Sunset');

      act(() => {
        select.value = 'custom:test_sunset.hdr';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });

      expect(useViewportStore.getState().environmentPreset).toBe('custom:test_sunset.hdr');
    });

    it('allows changing workbench sidebar position', () => {
      act(() => {
        root.render(<ViewportSection />);
      });

      expect(container.textContent).toContain('Workbench Side Panel Position');
      const rightButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Right'
      );
      expect(rightButton).toBeDefined();

      act(() => {
        rightButton?.click();
      });

      expect(useAppStore.getState().workbenchSidebarPosition).toBe('right');
    });
  });

  describe('StorageSection Component', () => {
    it('displays library path and calls openPathInExplorer when button is clicked', () => {
      act(() => {
        root.render(<StorageSection />);
      });

      expect(container.textContent).toContain('Local Library Storage');
      expect(container.textContent).toContain('/home/user/.local/share/mirage/');

      const revealBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('Reveal in Explorer')
      );
      expect(revealBtn).toBeDefined();

      act(() => {
        revealBtn?.click();
      });

      expect((window as any).electronAPI.openPathInExplorer).toHaveBeenCalledWith(
        '/home/user/.local/share/mirage/'
      );
    });
  });

  describe('SystemInfoSection Component', () => {
    it('displays system specs and build badges', () => {
      act(() => {
        root.render(<SystemInfoSection />);
      });

      expect(container.textContent).toContain('System Information');
      expect(container.textContent).toContain('Mirage 3D Workbench');
      expect(container.textContent).toContain('Three.js r184');
      expect(container.textContent).toContain('Sharp ORM Packer');
      expect(container.textContent).toContain('Electron 34');
      expect(container.textContent).toContain('v1.0.1');
      expect(container.textContent).toContain('Production');
    });
  });

  describe('SettingsView Orchestrator Component', () => {
    it('switches sections when sidebar tabs are clicked', () => {
      act(() => {
        root.render(<SettingsView />);
      });

      // Default tab: Appearance
      expect(container.textContent).toContain('Appearance & Theme');

      // Click Viewport tab
      const navButtons = container.querySelectorAll<HTMLButtonElement>('nav button');
      const viewportBtn = Array.from(navButtons).find((b) => b.textContent?.includes('3D Viewport'));
      act(() => {
        viewportBtn?.click();
      });
      expect(container.textContent).toContain('3D Viewport Defaults');

      // Click Storage tab
      const storageBtn = Array.from(navButtons).find((b) => b.textContent?.includes('Local Storage'));
      act(() => {
        storageBtn?.click();
      });
      expect(container.textContent).toContain('Local Library Storage');

      // Click System tab
      const systemBtn = Array.from(navButtons).find((b) => b.textContent?.includes('System Information'));
      act(() => {
        systemBtn?.click();
      });
      expect(container.textContent).toContain('System Information');
    });
  });
});
