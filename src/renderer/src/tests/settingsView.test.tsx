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
        themeMode: 'dark',
        fontDensity: 'standard',
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

      expect(container.textContent).toContain('Configuración');
      expect(container.textContent).toContain('Apariencia & Tema');
      expect(container.textContent).toContain('Visor 3D & Parámetros');
      expect(container.textContent).toContain('Atajos de Teclado');
      expect(container.textContent).toContain('Almacenamiento Local');
      expect(container.textContent).toContain('Modelos IA & Agentes');
      expect(container.textContent).toContain('Información del Sistema');
      expect(container.textContent).toContain('v1.0.0');
    });

    it('triggers onSelectTab when clicking a tab button', () => {
      const handleSelect = vi.fn();
      act(() => {
        root.render(<SettingsSidebar activeTab="appearance" onSelectTab={handleSelect} />);
      });

      const buttons = container.querySelectorAll('button');
      const viewportBtn = Array.from(buttons).find((b) => b.textContent?.includes('Visor 3D'));
      expect(viewportBtn).toBeDefined();

      act(() => {
        viewportBtn?.click();
      });

      expect(handleSelect).toHaveBeenCalledWith('viewport');
    });
  });

  describe('AppearanceSection Component', () => {
    it('allows changing theme mode', () => {
      act(() => {
        root.render(<AppearanceSection />);
      });

      expect(container.textContent).toContain('Apariencia & Cromatismo');
      expect(container.textContent).toContain('Basalto (Oscuro)');
      expect(container.textContent).toContain('Mineral (Claro)');
      expect(container.textContent).toContain('Automático (Sistema)');

      const lightCard = Array.from(container.querySelectorAll('h3')).find(
        (h) => h.textContent?.includes('Mineral (Claro)')
      )?.closest('div');

      expect(lightCard).toBeDefined();
      act(() => {
        (lightCard as HTMLElement)?.click();
      });

      expect(useAppStore.getState().settings.themeMode).toBe('light');
    });

    it('allows changing font density', () => {
      act(() => {
        root.render(<AppearanceSection />);
      });

      const denseCard = Array.from(container.querySelectorAll('h3')).find(
        (h) => h.textContent?.includes('Denso')
      )?.closest('div');

      expect(denseCard).toBeDefined();
      act(() => {
        (denseCard as HTMLElement)?.click();
      });

      expect(useAppStore.getState().settings.fontDensity).toBe('dense');
    });
  });

  describe('ViewportSection Component', () => {
    it('renders 3D viewport parameters and toggles contact shadows', () => {
      act(() => {
        root.render(<ViewportSection />);
      });

      expect(container.textContent).toContain('Parámetros por Defecto del Visor 3D');
      expect(container.textContent).toContain('Sombras de Contacto en el Suelo');
      expect(container.textContent).toContain('Grilla Milimétrica de Referencia');
      expect(container.textContent).toContain('Rotación Automática Suave');

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

      const select = container.querySelector('select[aria-label="Entorno HDRI por Defecto"]') as HTMLSelectElement;
      expect(select).not.toBeNull();
      expect(select.innerHTML).toContain('Presets de Taller');
      expect(select.innerHTML).toContain('Mis Entornos');
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

      expect(container.textContent).toContain('Posición del Panel Lateral de Taller');
      const rightButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Derecha'
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

      expect(container.textContent).toContain('Almacenamiento Local de la Biblioteca');
      expect(container.textContent).toContain('/home/user/.local/share/mirage/');

      const revealBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('Revelar en Explorador')
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

      expect(container.textContent).toContain('Información del Sistema');
      expect(container.textContent).toContain('Mirage Atelier 3D Workbench');
      expect(container.textContent).toContain('Three.js r184');
      expect(container.textContent).toContain('Sharp ORM Packer');
      expect(container.textContent).toContain('Electron 34');
      expect(container.textContent).toContain('v1.0.0');
      expect(container.textContent).toContain('Producción');
    });
  });

  describe('SettingsView Orchestrator Component', () => {
    it('switches sections when sidebar tabs are clicked', () => {
      act(() => {
        root.render(<SettingsView />);
      });

      // Default tab: Appearance
      expect(container.textContent).toContain('Apariencia & Cromatismo');

      // Click Viewport tab
      const navButtons = container.querySelectorAll<HTMLButtonElement>('nav button');
      const viewportBtn = Array.from(navButtons).find((b) => b.textContent?.includes('Visor 3D'));
      act(() => {
        viewportBtn?.click();
      });
      expect(container.textContent).toContain('Parámetros por Defecto del Visor 3D');

      // Click Storage tab
      const storageBtn = Array.from(navButtons).find((b) => b.textContent?.includes('Almacenamiento Local'));
      act(() => {
        storageBtn?.click();
      });
      expect(container.textContent).toContain('Almacenamiento Local de la Biblioteca');

      // Click System tab
      const systemBtn = Array.from(navButtons).find((b) => b.textContent?.includes('Información del Sistema'));
      act(() => {
        systemBtn?.click();
      });
      expect(container.textContent).toContain('Información del Sistema');
    });
  });
});
