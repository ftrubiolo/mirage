import React, { useState } from 'react';
import {
  Keyboard,
  FolderOpen,
  RotateCcw,
  Check,
  Edit2,
  Camera,
  Compass,
  Sun,
  X
} from 'lucide-react';
import { InfoTooltip } from '../UI/InfoTooltip';
import { Button } from '../UI/Button';
import { IconButton } from '../UI/IconButton';
import { SegmentedControl } from '../UI/SegmentedControl';
import { SearchInput } from '../UI/SearchInput';
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
      setFeedbackMsg('Shortcut saved');
      setTimeout(() => setFeedbackMsg(null), 2500);
    }
    setEditingActionId(null);
  };

  const handleResetDefaults = async () => {
    await resetToDefaults();
    setFeedbackMsg('Shortcuts restored to defaults');
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
            <span>Viewport Keyboard Shortcuts</span>
          </h2>
          <p className="text-xs text-ink-tertiary mt-0.5">
            Configure and remap hotkeys for camera orientation, lighting control, and metrology.
          </p>
        </div>

        <Button
          variant="outline"
          size="xs"
          onClick={handleResetDefaults}
          icon={<RotateCcw className="w-3.5 h-3.5" />}
          title="Restore default shortcuts"
        >
          Restore Defaults
        </Button>
      </div>

      {/* Storage Path Card */}
      <div className="bg-surface-lowest border border-hairline rounded-xs p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-primary font-semibold uppercase tracking-wider text-ink-secondary mb-1 flex items-center gap-1.5">
              <span>JSON Configuration File</span>
              <InfoTooltip
                content="Shortcuts are saved to this file in real time and can also be edited externally with any text editor."
                position="top"
                align="start"
              />
            </div>
            <div className="px-3 py-1.5 bg-surface-low border border-hairline rounded-xs font-mono text-xs text-ink-primary truncate select-all">
              {keybindsPath || '~/.local/share/mirage/keybinds.json'}
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleOpenFolder}
            icon={<FolderOpen className="w-4 h-4 text-action" />}
          >
            Reveal File
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Category Tabs */}
        <SegmentedControl
          options={[
            { value: 'all', label: 'All' },
            { value: 'camera', label: 'Camera', icon: <Camera className="w-3 h-3" /> },
            { value: 'view', label: 'Viewport', icon: <Compass className="w-3 h-3" /> },
            { value: 'lighting', label: 'Lighting', icon: <Sun className="w-3 h-3" /> }
          ]}
          value={selectedCategory}
          onChange={(val) => setSelectedCategory(val as any)}
          size="sm"
        />

        {/* Search Input */}
        <SearchInput
          placeholder="Search shortcut or action..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery('')}
          className="w-full sm:w-64"
        />
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
            No shortcuts matched your search.
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
                        title="Press new key combination"
                      >
                        {recordedKeys || 'Press key...'}
                      </div>

                      <IconButton
                        size="xs"
                        variant="primary"
                        onClick={() => handleSaveKeybind(meta.id)}
                        icon={<Check className="w-3.5 h-3.5" />}
                        title="Save shortcut"
                      />

                      <IconButton
                        size="xs"
                        variant="secondary"
                        onClick={() => setEditingActionId(null)}
                        icon={<X className="w-3.5 h-3.5" />}
                        title="Cancel"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => handleStartEditing(meta)}
                      className="group px-3 py-1 bg-surface-low hover:bg-surface-container border border-hairline hover:border-hairline-strong rounded-xs flex items-center gap-2 transition-colors cursor-pointer"
                      title="Click to remap shortcut"
                    >
                      <span className="font-mono text-xs font-bold tabular-nums text-ink-primary tracking-wide">
                        {currentShortcut || 'Unassigned'}
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
