import React, { useState, useRef, useEffect } from 'react';
import {
  Layers,
  ChevronDown,
  Plus,
  Check,
  MoreVertical,
  Edit2,
  Copy,
  Trash2,
  Star,
  Camera
} from 'lucide-react';
import { useVariantStore } from '../../../store/variantStore';
import { useAppStore } from '../../../store/appStore';
import { captureViewportSnapshot } from '../../../utils/viewportBridge';
import {
  Switch,
  Modal,
  FormField,
  TextInput,
  Button,
  IconButton,
  Badge
} from '../../UI';
import { useDropdownPlacement, getDropdownPlacementClass } from './useDropdownPlacement';

interface VariantPickerItemProps {
  compact?: boolean;
  iconOnly?: boolean;
}

export const VariantPickerItem: React.FC<VariantPickerItemProps> = ({ compact, iconOnly }) => {
  const variants = useVariantStore((state) => state.variants);
  const activeVariantId = useVariantStore((state) => state.activeVariantId);
  const selectVariant = useVariantStore((state) => state.selectVariant);
  const createVariant = useVariantStore((state) => state.createVariant);
  const renameVariant = useVariantStore((state) => state.renameVariant);
  const deleteVariant = useVariantStore((state) => state.deleteVariant);
  const setVariantDefault = useVariantStore((state) => state.setVariantDefault);
  const setVariantPoster = useVariantStore((state) => state.setVariantPoster);

  const activeEntrySlug = useAppStore((state) => state.activeEntrySlug);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newVariantName, setNewVariantName] = useState('');
  const [cloneCurrent, setCloneCurrent] = useState(true);

  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<{
    id: string;
    top: number;
    left: number;
    variant: (typeof variants)[0];
  } | null>(null);
  const [isCapturingPoster, setIsCapturingPoster] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeVariant = variants.find((v) => v.id === activeVariantId) || variants[0];
  const placement = useDropdownPlacement(containerRef, isDropdownOpen, 240);

  // Close dropdown and context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const isInsideContainer = containerRef.current && containerRef.current.contains(target);
      const isInsideMenu = menuRef.current && menuRef.current.contains(target);

      if (!isInsideContainer && !isInsideMenu) {
        setIsDropdownOpen(false);
        setMenuAnchor(null);
      } else if (!isInsideMenu && menuAnchor) {
        setMenuAnchor(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuAnchor]);

  const handleOpenCreateModal = () => {
    setNewVariantName(`Variant ${variants.length + 1}`);
    setCloneCurrent(true);
    setIsCreateModalOpen(true);
    setIsDropdownOpen(false);
    setMenuAnchor(null);
  };

  const handleConfirmCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVariantName.trim()) return;
    createVariant(newVariantName.trim(), cloneCurrent);
    setIsCreateModalOpen(false);
  };

  const handleStartRename = (id: string, currentName: string) => {
    setRenameTargetId(id);
    setRenameValue(currentName);
    setMenuAnchor(null);
  };

  const handleConfirmRename = (id: string) => {
    if (renameValue.trim()) {
      renameVariant(id, renameValue.trim());
    }
    setRenameTargetId(null);
  };

  const handleCapturePoster = async (variantId: string) => {
    if (!activeEntrySlug || !window.electronAPI) return;
    try {
      setIsCapturingPoster(true);
      const { blob } = await captureViewportSnapshot({ width: 800, height: 800, transparent: true, format: 'webp' });
      const buffer = await blob.arrayBuffer();
      const saved = await window.electronAPI.writeBinaryToLibrary({
        entrySlug: activeEntrySlug,
        targetType: `poster_${variantId}`,
        ext: 'webp',
        buffer
      });
      const url = window.electronAPI.toAssetUrl(saved.filePath);
      setVariantPoster(variantId, url, saved.fileName);
    } catch (err) {
      console.warn('Error capturing variant poster:', err);
    } finally {
      setIsCapturingPoster(false);
      setMenuAnchor(null);
    }
  };

  return (
    <div className="relative inline-flex items-center gap-1" ref={containerRef}>
      {/* Variant Dropdown Toggle Button */}
      <button
        onClick={() => {
          setIsDropdownOpen((prev) => !prev);
          setMenuAnchor(null);
        }}
        className="px-2 py-1 rounded-xs hover:bg-surface-container flex items-center gap-1.5 transition-colors cursor-pointer group min-w-0 border border-transparent hover:border-hairline"
        title={`Select finish profile: ${activeVariant?.name || 'Default'}`}
      >
        <Layers className="w-3.5 h-3.5 text-action shrink-0" />
        {!compact && !iconOnly && (
          <span className="font-primary font-bold uppercase tracking-wider text-ink-primary text-xs truncate max-w-[140px]">
            {activeVariant?.name || 'Default'}
          </span>
        )}
        <ChevronDown
          className={`w-3 h-3 text-ink-tertiary transition-transform duration-150 group-hover:text-ink-primary shrink-0 ${
            isDropdownOpen ? 'rotate-180 text-action' : ''
          }`}
        />
      </button>

      {/* Quick Add Variant Button (+) using IconButton UI */}
      <IconButton
        variant="ghost"
        size="xs"
        onClick={handleOpenCreateModal}
        icon={<Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
        title="Create new finish profile"
        className="text-action hover:bg-action/10"
      />

      {/* Variants Dropdown Menu (Adaptive UP / DOWN via useDropdownPlacement) */}
      {isDropdownOpen && (
        <div className={`absolute ${getDropdownPlacementClass(placement)} w-60 rounded-xs bg-surface-lowest border border-hairline shadow-xl p-1 z-50 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100`}>
          <div className="px-2.5 py-1.5 text-[10px] font-primary font-bold text-ink-tertiary uppercase tracking-wider border-b border-hairline flex items-center justify-between">
            <span>Profiles ({variants.length})</span>
          </div>

          <div
            onScroll={() => setMenuAnchor(null)}
            className="max-h-60 overflow-y-auto space-y-0.5 py-0.5"
          >
            {variants.map((v) => {
              const isSelected = activeVariantId === v.id;
              const isRenaming = renameTargetId === v.id;
              const isMenuOpen = menuAnchor?.id === v.id;

              return (
                <div
                  key={v.id}
                  className={`group relative px-2.5 py-1.5 rounded-xs flex items-center justify-between gap-2 text-xs transition-colors ${
                    isSelected ? 'bg-action/10 text-action font-semibold' : 'text-ink-primary hover:bg-surface-container'
                  }`}
                >
                  {isRenaming ? (
                    <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleConfirmRename(v.id);
                          if (e.key === 'Escape') setRenameTargetId(null);
                        }}
                        onBlur={() => handleConfirmRename(v.id)}
                        className="w-full px-1.5 py-0.5 bg-surface-low border border-action rounded-xs text-xs font-medium text-ink-primary focus:outline-none"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        selectVariant(v.id);
                        setIsDropdownOpen(false);
                        setMenuAnchor(null);
                      }}
                      className="flex-1 min-w-0 text-left flex items-center gap-2 cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 text-action shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 shrink-0 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-xs bg-ink-tertiary/40 group-hover:bg-ink-tertiary" />
                          </div>
                        )}
                        <span className="truncate font-medium">{v.name}</span>
                        {v.isDefault && (
                          <Badge variant="neutral" size="xs" mono className="text-amber-600 bg-amber-500/10 border-amber-500/20">
                            ★
                          </Badge>
                        )}
                      </div>
                    </button>
                  )}

                  {/* Right Actions / More Menu Toggle */}
                  {!isRenaming && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isMenuOpen) {
                            setMenuAnchor(null);
                          } else {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const menuHeight = 180;
                            let top = rect.top - 4;
                            if (top + menuHeight > window.innerHeight - 10) {
                              top = Math.max(10, window.innerHeight - menuHeight - 10);
                            }
                            setMenuAnchor({
                              id: v.id,
                              top,
                              left: rect.right + 6,
                              variant: v
                            });
                          }
                        }}
                        className={`p-1 rounded-xs hover:bg-surface-high transition-colors cursor-pointer ${
                          isMenuOpen ? 'bg-surface-high text-ink-primary' : 'text-ink-tertiary hover:text-ink-primary'
                        }`}
                        title="Variant options"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Context Submenu Spawning to the Side (Outside Drawer) */}
      {menuAnchor && (
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: `${menuAnchor.top}px`,
            left: `${menuAnchor.left}px`
          }}
          className="w-48 rounded-xs bg-surface-lowest border border-hairline shadow-2xl p-1 z-50 flex flex-col gap-0.5 text-xs text-ink-primary animate-in fade-in zoom-in-95 duration-75"
        >
          <div className="px-2 py-1 text-[10px] font-mono font-semibold text-ink-tertiary border-b border-hairline truncate uppercase tracking-wider">
            {menuAnchor.variant.name}
          </div>

          <button
            onClick={() => handleStartRename(menuAnchor.id, menuAnchor.variant.name)}
            className="w-full px-2 py-1.5 rounded-xs hover:bg-surface-container flex items-center gap-2 text-left cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 text-ink-secondary" />
            <span>Rename</span>
          </button>

          <button
            onClick={() => {
              createVariant(`${menuAnchor.variant.name} (Copy)`, true);
              setMenuAnchor(null);
              setIsDropdownOpen(false);
            }}
            className="w-full px-2 py-1.5 rounded-xs hover:bg-surface-container flex items-center gap-2 text-left cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-ink-secondary" />
            <span>Duplicate profile</span>
          </button>

          {!menuAnchor.variant.isDefault && (
            <button
              onClick={() => {
                setVariantDefault(menuAnchor.id);
                setMenuAnchor(null);
              }}
              className="w-full px-2 py-1.5 rounded-xs hover:bg-surface-container flex items-center gap-2 text-left cursor-pointer"
            >
              <Star className="w-3.5 h-3.5 text-amber-500" />
              <span>Set as default</span>
            </button>
          )}

          <button
            onClick={() => handleCapturePoster(menuAnchor.id)}
            disabled={isCapturingPoster}
            className="w-full px-2 py-1.5 rounded-xs hover:bg-surface-container flex items-center gap-2 text-left cursor-pointer disabled:opacity-50"
            title="Capture WebP thumbnail from current viewport for this variant"
          >
            <Camera className="w-3.5 h-3.5 text-action" />
            <span>{isCapturingPoster ? 'Capturing...' : 'Capture Poster'}</span>
          </button>

          {variants.length > 1 && (
            <div className="border-t border-hairline my-0.5 pt-0.5">
              <button
                onClick={() => {
                  deleteVariant(menuAnchor.id);
                  setMenuAnchor(null);
                }}
                className="w-full px-2 py-1.5 rounded-xs hover:bg-rose-600 hover:text-white text-rose-600 flex items-center gap-2 text-left transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete profile</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal: Create New Variant */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="New Profile / Variant"
        icon={<Layers className="w-4 h-4 text-action" />}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={(e) => {
                e.preventDefault();
                handleConfirmCreate(e);
              }}
              disabled={!newVariantName.trim()}
            >
              Create Profile
            </Button>
          </div>
        }
      >
        <form onSubmit={handleConfirmCreate} className="space-y-3.5">
          <FormField label="Variant Name" required>
            <TextInput
              required
              autoFocus
              value={newVariantName}
              onChange={(e) => setNewVariantName(e.target.value)}
              placeholder="e.g. Brushed Steel & Matte Black"
            />
          </FormField>

          <div className="p-3 bg-surface-low rounded-xs border border-hairline flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-medium text-ink-primary block">
                Duplicate current maps
              </span>
              <span className="text-[10px] text-ink-secondary block">
                Copies textures and parameters from active variant
              </span>
            </div>
            <Switch checked={cloneCurrent} onChange={setCloneCurrent} />
          </div>
        </form>
      </Modal>
    </div>
  );
};
