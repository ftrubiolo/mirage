import React, { useState } from 'react';
import {
  Keyboard,
  FolderOpen,
  RotateCcw,
  Search,
  Check,
  Edit2,
  Camera,
  Compass,
  Sun,
  X
} from 'lucide-react';
import { InfoTooltip } from '../UI/InfoTooltip';
import {
  useKeybindsStore,
  KEYBIND_DEFINITIONS,
  KeybindAction,
  KeybindMeta
} from '../../utils/keybindsManager';

export const KeybindsSection: React.FC = () => {
  const {
    keybinds,
    keybindsPath,
    updateKeybind,
    resetToDefaults
  } = useKeybindsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'camera' | 'view' | 'lighting'>('all');
  const [editingActionId, setEditingActionId] = useState<KeybindAction | null>(null);
  const [recordedKeys, setRecordedKeys] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const handleOpenFolder = () => {
    if (window.electronAPI && keybindsPath) {
      window.electronAPI.openPathInExplorer(keybindsPath);
    }
  };

  const handleStartEditing = (meta: KeybindMeta) => {
    setEditingActionId(meta.id);
    setRecordedKeys(keybinds[meta.id] || '');
  };

  const handleKeyDownRecord = (e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      setEditingActionId(null);
      return;
    }

    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');

    // Filter modifier-only key presses
    const modifierKeys = ['Control', 'Alt', 'Shift', 'Meta'];
    if (!modifierKeys.includes(e.key)) {
      let keyName = e.key;
      if (keyName === ' ') keyName = 'Space';
      else if (keyName.length === 1) keyName = keyName.toUpperCase();
      parts.push(keyName);

      const combined = parts.join('+');
      setRecordedKeys(combined);
    }
  };

  const handleSaveKeybind = async (actionId: KeybindAction) => {
    if (recordedKeys.trim()) {
      await updateKeybind(actionId, recordedKeys.trim());
      setFeedbackMsg('Atajo guardado correctamente');
      setTimeout(() => setFeedbackMsg(null), 2500);
    }
    setEditingActionId(null);
  };

  const handleResetDefaults = async () => {
    await resetToDefaults();
    setFeedbackMsg('Atajos restaurados a valores por defecto');
    setTimeout(() => setFeedbackMsg(null), 2500);
  };

  const filteredDefinitions = KEYBIND_DEFINITIONS.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (keybinds[item.id] || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-primary font-semibold text-xs uppercase tracking-wider text-ink-secondary flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-action" />
            <span>Atajos de Teclado del Visor</span>
          </h2>
          <p className="text-xs text-ink-tertiary mt-0.5">
            Configuración y mapeo de teclas rápidas para orientación de cámara, control lumínico y metrología.
          </p>
        </div>

        <button
          onClick={handleResetDefaults}
          className="px-3 py-1.5 bg-surface-lowest hover:bg-surface-container text-ink-secondary hover:text-ink-primary border border-hairline rounded-xs text-xs font-medium transition-colors flex items-center gap-1.5 self-start shrink-0 cursor-pointer"
          title="Restaurar configuración original"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restaurar Predeterminados</span>
        </button>
      </div>

      {/* Storage Path Card */}
      <div className="bg-surface-lowest border border-hairline rounded-xs p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-primary font-semibold uppercase tracking-wider text-ink-secondary mb-1 flex items-center gap-1.5">
              <span>Archivo de Configuración JSON</span>
              <InfoTooltip
                content="Los atajos se guardan en tiempo real en este archivo y pueden editarse externamente con cualquier editor de texto."
                position="top"
                align="start"
              />
            </div>
            <div className="px-3 py-1.5 bg-surface-low border border-hairline rounded-xs font-mono text-xs text-ink-primary truncate select-all">
              {keybindsPath || '~/.local/share/mirage/keybinds.json'}
            </div>
          </div>

          <button
            onClick={handleOpenFolder}
            className="px-3 py-2 bg-surface-container hover:bg-surface-high text-ink-primary border border-hairline rounded-xs text-xs font-medium uppercase tracking-wider transition-colors flex items-center gap-2 shrink-0 self-start sm:self-end cursor-pointer"
          >
            <FolderOpen className="w-4 h-4 text-action" />
            <span>Revelar Archivo</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 bg-surface-low p-1 border border-hairline rounded-xs">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'camera', label: 'Cámara', icon: Camera },
            { id: 'view', label: 'Visor y Taller', icon: Compass },
            { id: 'lighting', label: 'Iluminación', icon: Sun }
          ].map((tab) => {
            const isSelected = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id as any)}
                className={`px-3 py-1 text-xs font-medium rounded-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-surface-container text-action font-semibold shadow-xs border border-hairline'
                    : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-high/30'
                }`}
              >
                {tab.icon && <tab.icon className="w-3 h-3" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-ink-tertiary absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar atajo o acción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-lowest border border-hairline rounded-xs text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:border-action"
          />
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-2.5 rounded-xs bg-action/10 border border-action/30 text-xs font-medium text-action flex items-center gap-2 animate-in fade-in duration-150">
          <Check className="w-4 h-4" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Keybinds Table / Cards */}
      <div className="bg-surface-lowest border border-hairline rounded-xs shadow-xs divide-y divide-hairline overflow-hidden">
        {filteredDefinitions.length === 0 ? (
          <div className="p-8 text-center text-ink-tertiary text-xs">
            No se encontraron atajos que coincidan con la búsqueda.
          </div>
        ) : (
          filteredDefinitions.map((meta) => {
            const currentShortcut = keybinds[meta.id] || '';
            const isEditing = editingActionId === meta.id;

            return (
              <div
                key={meta.id}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-container/20 transition-colors"
              >
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-primary font-bold text-xs uppercase text-ink-primary">
                      {meta.label}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-xs bg-surface-low border border-hairline text-ink-tertiary uppercase">
                      {meta.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-secondary">
                    {meta.desc}
                  </p>
                </div>

                {/* Keybind Badge / Recorder */}
                <div className="flex items-center gap-2 shrink-0">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <div
                        tabIndex={0}
                        onKeyDown={handleKeyDownRecord}
                        className="px-3 py-1 bg-surface-container border border-action ring-1 ring-action/50 rounded-xs font-mono text-xs font-bold text-action animate-pulse outline-none min-w-[100px] text-center cursor-pointer"
                        title="Presiona la nueva combinación de teclas"
                      >
                        {recordedKeys || 'Presiona tecla...'}
                      </div>

                      <button
                        onClick={() => handleSaveKeybind(meta.id)}
                        className="p-1 rounded-xs bg-action text-white hover:bg-action-hover transition-colors cursor-pointer"
                        title="Guardar atajo"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setEditingActionId(null)}
                        className="p-1 rounded-xs bg-surface-container hover:bg-surface-high text-ink-secondary hover:text-ink-primary transition-colors cursor-pointer"
                        title="Cancelar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleStartEditing(meta)}
                      className="group px-3 py-1 bg-surface-low hover:bg-surface-container border border-hairline hover:border-hairline-strong rounded-xs flex items-center gap-2 transition-colors cursor-pointer"
                      title="Clic para reasignar este atajo"
                    >
                      <span className="font-mono text-xs font-bold tabular-nums text-ink-primary tracking-wide">
                        {currentShortcut || 'Sin asignar'}
                      </span>
                      <Edit2 className="w-3 h-3 text-ink-tertiary group-hover:text-action transition-colors" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
