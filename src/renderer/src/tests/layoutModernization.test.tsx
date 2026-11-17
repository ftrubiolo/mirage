import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { useAppStore } from '../store/appStore';
import { useModelStore } from '../store/modelStore';
import { useVariantStore } from '../store/variantStore';
import { NavSidebar } from '../layouts/NavSidebar';
import { ViewportStatusBar } from '../components/Viewport/ViewportStatusBar';
import { ViewportToolbar } from '../components/Viewport/ViewportToolbar';
import { Modal } from '../components/UI/Modal';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('Layout Modernization & Movable Sidebar', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    useAppStore.setState({
      currentView: 'workbench',
      workbenchSidebarPosition: 'right',
      isSaveModalOpen: false
    });
    useModelStore.getState().resetModel();
    useVariantStore.getState().resetVariants();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    localStorage.clear();
  });

  describe('appStore: movable sidebar & save modal state', () => {
    it('defaults workbenchSidebarPosition to right and allows toggling to left', () => {
      const store = useAppStore.getState();
      expect(store.workbenchSidebarPosition).toBe('right');

      act(() => {
        store.setWorkbenchSidebarPosition('left');
      });

      expect(useAppStore.getState().workbenchSidebarPosition).toBe('left');
      expect(localStorage.getItem('mirage-workbench-sidebar-position')).toBe('left');
    });

    it('manages isSaveModalOpen via openSaveModal and closeSaveModal', () => {
      const store = useAppStore.getState();
      expect(store.isSaveModalOpen).toBe(false);

      act(() => {
        store.openSaveModal();
      });
      expect(useAppStore.getState().isSaveModalOpen).toBe(true);

      act(() => {
        store.closeSaveModal();
      });
      expect(useAppStore.getState().isSaveModalOpen).toBe(false);
    });
  });

  describe('NavSidebar component', () => {
    it('renders the 3 main views and settings button with accessible titles', () => {
      act(() => {
        root.render(<NavSidebar />);
      });

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(4);

      const titles = Array.from(buttons).map((b) => b.getAttribute('title'));
      expect(titles).toContain('3D Workbench');
      expect(titles).toContain('Model Library');
      expect(titles).toContain('AI Studio');
      expect(titles).toContain('Settings');
    });

    it('switches views when buttons are clicked', () => {
      act(() => {
        root.render(<NavSidebar />);
      });

      const buttons = container.querySelectorAll('button');
      const libraryButton = Array.from(buttons).find((b) => b.getAttribute('title') === 'Model Library')!;
      const settingsButton = Array.from(buttons).find((b) => b.getAttribute('title') === 'Settings')!;

      act(() => {
        libraryButton.click();
      });
      expect(useAppStore.getState().currentView).toBe('library');

      act(() => {
        settingsButton.click();
      });
      expect(useAppStore.getState().currentView).toBe('settings');
    });
  });

  describe('ViewportStatusBar component', () => {
    it('renders active variant and fallback when no geometry is loaded', () => {
      act(() => {
        root.render(<ViewportStatusBar />);
      });

      expect(container.textContent).toContain('Default');
      expect(container.textContent).toContain('No geometry loaded');
    });

    it('renders model polygon count and dimensions when modelStats are present', () => {
      act(() => {
        useModelStore.getState().setModel(
          '/path/to/sofa.glb',
          'blob:http://localhost/sofa.glb',
          1024 * 1024
        );
        useModelStore.getState().setModelStats({
          triangleCount: 42000,
          vertexCount: 21000,
          meshCount: 3,
          materials: ['Leather', 'Metal'],
          dimensions: {
            width: 2.1,
            height: 0.85,
            depth: 0.95
          }
        });
      });

      act(() => {
        root.render(<ViewportStatusBar />);
      });

      expect(container.textContent).toContain('42,000');
      expect(container.textContent).toContain('2.1×0.85×0.95m');
    });
  });

  describe('ViewportToolbar component: 3-Zone CAD Toolbar', () => {
    it('renders full-width header with accessible title and core CAD controls', () => {
      act(() => {
        root.render(<ViewportToolbar />);
      });

      const header = container.querySelector('header');
      expect(header).not.toBeNull();
      expect(header?.getAttribute('aria-label')).toBe('3D viewport toolbar');
      expect(header?.className).toContain('w-full');
      expect(header?.className).toContain('border-b');

      // Camera preset button
      expect(container.textContent).toContain('Isometric');
      // PBR channel button
      expect(container.textContent).toContain('Full PBR');
    });

    it('renders sidebar toggle button on the right when workbenchSidebarPosition is right', () => {
      act(() => {
        useAppStore.setState({ workbenchSidebarPosition: 'right', isWorkbenchSidebarCollapsed: true });
        root.render(<ViewportToolbar />);
      });

      const buttons = container.querySelectorAll('button');
      const expandBtn = Array.from(buttons).find(
        (b) => b.getAttribute('title')?.includes('Show workbench sidebar')
      );
      expect(expandBtn).toBeDefined();

      // Click to toggle
      act(() => {
        expandBtn?.click();
      });
      expect(useAppStore.getState().isWorkbenchSidebarCollapsed).toBe(false);
    });

    it('renders sidebar toggle button on the left when workbenchSidebarPosition is left', () => {
      act(() => {
        useAppStore.setState({ workbenchSidebarPosition: 'left', isWorkbenchSidebarCollapsed: true });
        root.render(<ViewportToolbar />);
      });

      const buttons = container.querySelectorAll('button');
      const expandBtn = Array.from(buttons).find(
        (b) => b.getAttribute('title')?.includes('Show workbench sidebar')
      );
      expect(expandBtn).toBeDefined();

      act(() => {
        expandBtn?.click();
      });
      expect(useAppStore.getState().isWorkbenchSidebarCollapsed).toBe(false);
    });
  });

  describe('Modal portal mechanics', () => {
    it('portals modal to document.body escaping any containing block or overflow', () => {
      act(() => {
        root.render(
          <Modal isOpen={true} onClose={() => {}} title="Test Portal Modal">
            <div>Modal Body Content</div>
          </Modal>
        );
      });

      // The modal content must NOT be directly inside container
      expect(container.querySelector('[role="dialog"], .fixed')).toBeNull();

      // The modal must be mounted directly under document.body via createPortal
      const bodyModal = document.body.querySelector('.fixed.inset-0');
      expect(bodyModal).not.toBeNull();
      expect(bodyModal?.textContent).toContain('Test Portal Modal');
      expect(bodyModal?.textContent).toContain('Modal Body Content');
    });
  });
});
