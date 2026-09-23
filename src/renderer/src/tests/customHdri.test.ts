import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SaveCustomHdrSchema, DeleteCustomHdrSchema } from '../../../main/ipcSchemas';
import { getEnvironmentsPath, getMirageDataDir } from '../../../main/platform';
import { useViewportStore, CustomHdrItem } from '../store/viewportStore';

describe('Custom HDRI Local Storage & Management', () => {
  describe('IPC Schemas Validation', () => {
    it('SaveCustomHdrSchema accepts valid .hdr file paths', () => {
      const validPath = '/home/user/Downloads/studio_garden_4k.hdr';
      const result = SaveCustomHdrSchema.safeParse({ sourceFilePath: validPath });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sourceFilePath).toBe(validPath);
      }
    });

    it('SaveCustomHdrSchema rejects non-hdr file paths', () => {
      const invalidPath = '/home/user/Downloads/texture.png';
      const result = SaveCustomHdrSchema.safeParse({ sourceFilePath: invalidPath });
      expect(result.success).toBe(false);
    });

    it('DeleteCustomHdrSchema accepts valid .hdr filenames without paths', () => {
      const result = DeleteCustomHdrSchema.safeParse({ fileName: 'my_loft_environment.hdr' });
      expect(result.success).toBe(true);
    });

    it('DeleteCustomHdrSchema rejects path traversal attempts', () => {
      const attempts = [
        '../escaped.hdr',
        '../../etc/shadow.hdr',
        '/root/system.hdr',
        'subdir/nested.hdr',
        'c:\\windows\\test.hdr'
      ];
      for (const attempt of attempts) {
        const result = DeleteCustomHdrSchema.safeParse({ fileName: attempt });
        expect(result.success).toBe(false);
      }
    });

    it('DeleteCustomHdrSchema rejects non-hdr extensions', () => {
      const result = DeleteCustomHdrSchema.safeParse({ fileName: 'settings.json' });
      expect(result.success).toBe(false);
    });
  });

  describe('Platform Environments Path', () => {
    it('getEnvironmentsPath resides inside getMirageDataDir()', () => {
      const envPath = getEnvironmentsPath();
      const baseDataDir = getMirageDataDir();
      expect(envPath).toContain(baseDataDir);
      expect(envPath.endsWith('environments')).toBe(true);
    });
  });

  describe('ViewportStore Custom HDRI Actions', () => {
    const mockHdr1: CustomHdrItem = {
      name: 'industrial_sunset.hdr',
      displayName: 'Industrial Sunset',
      filePath: '/path/to/environments/industrial_sunset.hdr',
      assetUrl: 'local-asset:///path/to/environments/industrial_sunset.hdr',
      size: 1048576
    };

    const mockHdr2: CustomHdrItem = {
      name: 'modern_living_room.hdr',
      displayName: 'Modern Living Room',
      filePath: '/path/to/environments/modern_living_room.hdr',
      assetUrl: 'local-asset:///path/to/environments/modern_living_room.hdr',
      size: 2097152
    };

    beforeEach(() => {
      useViewportStore.setState({
        environmentPreset: 'city',
        customHdrUrl: null,
        customHdrName: null,
        customHdrs: []
      });

      // Mock window.electronAPI
      (window as any).electronAPI = {
        listCustomHdrs: vi.fn().mockResolvedValue([mockHdr1, mockHdr2]),
        saveCustomHdr: vi.fn().mockImplementation(async (sourcePath: string) => ({
          name: 'imported_sky.hdr',
          displayName: 'Imported Sky',
          filePath: `/environments/imported_sky.hdr`,
          assetUrl: `local-asset:///environments/imported_sky.hdr`,
          size: 4096
        })),
        deleteCustomHdr: vi.fn().mockResolvedValue(true),
        updateSettings: vi.fn().mockResolvedValue({ success: true })
      };
    });

    it('loadCustomHdrs populates customHdrs from electronAPI', async () => {
      await useViewportStore.getState().loadCustomHdrs();
      const state = useViewportStore.getState();
      expect(state.customHdrs).toHaveLength(2);
      expect(state.customHdrs[0].name).toBe('industrial_sunset.hdr');
      expect(state.customHdrs[1].name).toBe('modern_living_room.hdr');
    });

    it('loadCustomHdrs resolves active custom preset and sets customHdrUrl', async () => {
      useViewportStore.setState({
        environmentPreset: 'custom:modern_living_room.hdr'
      });
      await useViewportStore.getState().loadCustomHdrs();
      const state = useViewportStore.getState();
      expect(state.customHdrUrl).toBe(mockHdr2.assetUrl);
      expect(state.customHdrName).toBe('Modern Living Room');
    });

    it('selectCustomHdr sets preset, customHdrUrl, and customHdrName', () => {
      useViewportStore.getState().selectCustomHdr(mockHdr1);
      const state = useViewportStore.getState();
      expect(state.environmentPreset).toBe('custom:industrial_sunset.hdr');
      expect(state.customHdrUrl).toBe(mockHdr1.assetUrl);
      expect(state.customHdrName).toBe('Industrial Sunset');
    });

    it('importCustomHdr copies to local storage and activates newly imported HDR', async () => {
      const result = await useViewportStore.getState().importCustomHdr('/downloads/imported_sky.hdr');
      expect(result).not.toBeNull();
      const state = useViewportStore.getState();
      expect(state.environmentPreset).toBe('custom:imported_sky.hdr');
      expect(state.customHdrUrl).toBe('local-asset:///environments/imported_sky.hdr');
      expect(state.customHdrName).toBe('Imported Sky');
      expect(state.customHdrs.some((h) => h.name === 'imported_sky.hdr')).toBe(true);
    });

    it('deleteCustomHdr removes file from store and reverts to city if it was active', async () => {
      useViewportStore.setState({
        customHdrs: [mockHdr1, mockHdr2],
        environmentPreset: 'custom:industrial_sunset.hdr',
        customHdrUrl: mockHdr1.assetUrl,
        customHdrName: mockHdr1.displayName
      });

      const deleted = await useViewportStore.getState().deleteCustomHdr('industrial_sunset.hdr');
      expect(deleted).toBe(true);

      const state = useViewportStore.getState();
      expect(state.customHdrs).toHaveLength(1);
      expect(state.customHdrs[0].name).toBe('modern_living_room.hdr');
      expect(state.environmentPreset).toBe('city');
      expect(state.customHdrUrl).toBeNull();
      expect(state.customHdrName).toBeNull();
    });

    it('deleteCustomHdr preserves active environment if deleted item was not active', async () => {
      useViewportStore.setState({
        customHdrs: [mockHdr1, mockHdr2],
        environmentPreset: 'custom:modern_living_room.hdr',
        customHdrUrl: mockHdr2.assetUrl,
        customHdrName: mockHdr2.displayName
      });

      const deleted = await useViewportStore.getState().deleteCustomHdr('industrial_sunset.hdr');
      expect(deleted).toBe(true);

      const state = useViewportStore.getState();
      expect(state.customHdrs).toHaveLength(1);
      expect(state.environmentPreset).toBe('custom:modern_living_room.hdr');
      expect(state.customHdrUrl).toBe(mockHdr2.assetUrl);
    });

    it('switching back to built-in preset clears customHdrUrl and customHdrName', () => {
      useViewportStore.getState().selectCustomHdr(mockHdr1);
      expect(useViewportStore.getState().customHdrUrl).toBeTruthy();

      useViewportStore.getState().setEnvironmentPreset('studio');
      const state = useViewportStore.getState();
      expect(state.environmentPreset).toBe('studio');
      expect(state.customHdrUrl).toBeNull();
      expect(state.customHdrName).toBeNull();
    });

    it('applyPersistedSettings resolves custom environment preset', () => {
      useViewportStore.setState({
        customHdrs: [mockHdr1, mockHdr2]
      });

      useViewportStore.getState().applyPersistedSettings({
        environmentPreset: 'custom:industrial_sunset.hdr'
      });

      const state = useViewportStore.getState();
      expect(state.environmentPreset).toBe('custom:industrial_sunset.hdr');
      expect(state.customHdrUrl).toBe(mockHdr1.assetUrl);
      expect(state.customHdrName).toBe('Industrial Sunset');
    });
  });
});
