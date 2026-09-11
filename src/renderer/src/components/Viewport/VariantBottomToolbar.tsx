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
  Camera,
  X
} from 'lucide-react';
import { useVariantStore } from '../../store/variantStore';
import { captureViewportSnapshot } from '../../utils/viewportBridge';
import { useAppStore } from '../../store/appStore';
import { Switch } from '../UI/Switch';

export const VariantBottomToolbar: React.FC = () => {
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
    setNewVariantName(`Variante ${variants.length + 1}`);
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
    <div ref={containerRef} className="absolute bottom-4 left-4 z-20 flex flex-col items-stretch select-none">
      {/* Floating Main Pill */}
      <div className="flex items-center justify-between gap-1 p-1 rounded-xs bg-surface-lowest border border-hairline shadow-lg backdrop-blur-xs min-w-[200px]">
        {/* Variant Dropdown Toggle Button */}
        <button
          onClick={() => {
            setIsDropdownOpen((prev) => !prev);
            setMenuAnchor(null);
          }}
          className="flex-1 px-2.5 py-1.5 rounded-xs hover:bg-surface-container flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer group min-w-0"
          title="Seleccionar perfil de acabado"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Layers className="w-3.5 h-3.5 text-action shrink-0" />
            <span className="font-primary font-bold uppercase tracking-wider text-ink-primary truncate">
              {activeVariant?.name || 'Default'}
            </span>
          </div>
          <ChevronDown
            className={`w-3 h-3 text-ink-tertiary transition-transform duration-150 group-hover:text-ink-primary shrink-0 ml-1.5 ${
              isDropdownOpen ? 'rotate-180 text-action' : ''
            }`}
          />
        </button>

        <div className="w-px h-4 bg-hairline mx-0.5 shrink-0" />

        {/* Quick Add Variant Button (+) */}
        <button
          onClick={handleOpenCreateModal}
          title="Crear nuevo perfil de acabado"
          className="p-1.5 rounded-xs bg-action/10 hover:bg-action text-action hover:text-white transition-colors flex items-center justify-center cursor-pointer shadow-2xs shrink-0"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>

      {/* Variants Dropdown Menu (Matches Selector Width) */}
      {isDropdownOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-1.5 rounded-xs bg-surface-lowest border border-hairline shadow-2xl p-1 z-30 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1.5 text-[10px] font-primary font-bold text-ink-tertiary uppercase tracking-wider border-b border-hairline flex items-center justify-between">
            <span>Perfiles ({variants.length})</span>
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
                            <div className="w-1.5 h-1.5 rounded-full bg-ink-tertiary/40 group-hover:bg-ink-tertiary" />
                          </div>
                        )}
                        <span className="truncate font-medium">{v.name}</span>
                        {v.isDefault && (
                          <span className="text-[9px] font-mono px-1 py-0.2 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-xs shrink-0 font-bold">
                            ★
                          </span>
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
                        title="Opciones de variante"
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
            <span>Renombrar</span>
          </button>

          <button
            onClick={() => {
              createVariant(`${menuAnchor.variant.name} (Copia)`, true);
              setMenuAnchor(null);
              setIsDropdownOpen(false);
            }}
            className="w-full px-2 py-1.5 rounded-xs hover:bg-surface-container flex items-center gap-2 text-left cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-ink-secondary" />
            <span>Duplicar perfil</span>
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
              <span>Hacer por defecto</span>
            </button>
          )}

          <button
            onClick={() => handleCapturePoster(menuAnchor.id)}
            disabled={isCapturingPoster}
            className="w-full px-2 py-1.5 rounded-xs hover:bg-surface-container flex items-center gap-2 text-left cursor-pointer disabled:opacity-50"
            title="Capturar miniatura WebP del visor actual para esta variante"
          >
            <Camera className="w-3.5 h-3.5 text-action" />
            <span>{isCapturingPoster ? 'Capturando...' : 'Capturar Póster'}</span>
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
                <span>Eliminar perfil</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal: Crear Nueva Variante */}
      {isCreateModalOpen && (
        <div
          onClick={() => setIsCreateModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface-lowest border border-hairline-strong rounded-xs shadow-2xl w-full max-w-sm p-5 space-y-4 cursor-default animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="flex items-center justify-between border-b border-hairline pb-2.5">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-action" />
                <h3 className="font-primary font-bold text-xs uppercase tracking-wider text-ink-primary">
                  Nuevo Perfil / Variante
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-xs text-ink-tertiary hover:text-ink-primary hover:bg-surface-container transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmCreate} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-primary font-semibold uppercase tracking-wider text-ink-secondary mb-1">
                  Nombre de la Variante
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newVariantName}
                  onChange={(e) => setNewVariantName(e.target.value)}
                  placeholder="Ej: Roble Claro & Lino Crudo"
                  className="w-full px-3 py-2 bg-surface-low border border-hairline text-xs font-body text-ink-primary focus:outline-none focus:border-action rounded-xs"
                />
              </div>

              <div className="p-3 bg-surface-low rounded-xs border border-hairline flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-medium text-ink-primary block">
                    Duplicar mapas actuales
                  </span>
                  <span className="text-[10px] text-ink-secondary block">
                    Copia texturas y parámetros de la variante activa
                  </span>
                </div>
                <Switch checked={cloneCurrent} onChange={setCloneCurrent} />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 border border-hairline rounded-xs text-xs uppercase tracking-wider text-ink-secondary hover:text-ink-primary hover:bg-surface-container transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newVariantName.trim()}
                  className="px-4 py-1.5 bg-action hover:bg-action-hover text-white rounded-xs text-xs font-primary font-semibold uppercase tracking-wider shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Crear Perfil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
