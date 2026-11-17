import React, { useState } from 'react';
import { RefreshCw, Zap, ShieldAlert, Check, X } from 'lucide-react';
import { useAgentStore } from '../../store/agentStore';
import { SegmentedControl } from '../UI/SegmentedControl';
import { IconButton } from '../UI/IconButton';

export const StudioHeader: React.FC = () => {
  const {
    providers,
    activeProviderId,
    activeModel,
    permissionMode,
    setActiveProvider,
    setActiveModel,
    setPermissionMode,
    saveProvider
  } = useAgentStore();

  const [isCustomModelInput, setIsCustomModelInput] = useState(false);
  const [customModelText, setCustomModelText] = useState('');
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);

  const activeProvider = providers.find((p) => p.id === activeProviderId);

  const handleRefreshModels = async () => {
    if (!activeProvider || !window.electronAPI) return;
    setIsRefreshingModels(true);
    try {
      const apiKey = (await window.electronAPI.getSecret(`provider_${activeProvider.id}`)) || '';
      const res = await window.electronAPI.fetchAgentModels({
        baseUrl: activeProvider.baseUrl,
        apiKey: apiKey || undefined
      });
      if (res.success && Array.isArray(res.models) && res.models.length > 0) {
        const combined = Array.from(new Set([...res.models, ...activeProvider.availableModels]));
        await saveProvider({
          ...activeProvider,
          availableModels: combined
        });
      }
    } catch (e) {
      console.warn('Error refrescando modelos:', e);
    } finally {
      setIsRefreshingModels(false);
    }
  };

  return (
    <header className="h-12 border-b border-hairline bg-surface-low px-4 flex items-center justify-between shrink-0 select-none">
      {/* Provider & Model Selectors */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-xs ${
              activeProvider?.hasKey ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-amber-600 dark:bg-amber-500'
            }`}
          />
          <select
            value={activeProviderId || ''}
            onChange={(e) => setActiveProvider(e.target.value || null)}
            className="bg-surface-container border border-hairline text-xs rounded-xs px-2.5 py-1 text-ink-primary focus:outline-none focus:border-action cursor-pointer"
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id} disabled={!p.hasKey}>
                {p.name} {!p.hasKey ? '(No key)' : ''}
              </option>
            ))}
          </select>
        </div>

        {activeProvider && (
          <div className="flex items-center gap-1.5">
            {isCustomModelInput ? (
              <div className="flex items-center gap-1 bg-surface-container border border-action/60 rounded-xs px-2 py-0.5 shadow-xs">
                <input
                  type="text"
                  value={customModelText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomModelText(val);
                    setActiveModel(val);
                  }}
                  placeholder="Model name..."
                  className="bg-transparent text-xs text-ink-primary font-mono w-[180px] focus:outline-none"
                  autoFocus
                />
                <IconButton
                  size="xs"
                  variant="primary"
                  onClick={() => {
                    if (customModelText.trim()) {
                      const updated = Array.from(
                        new Set([customModelText.trim(), ...activeProvider.availableModels])
                      );
                      saveProvider({
                        ...activeProvider,
                        availableModels: updated,
                        defaultModel: customModelText.trim()
                      });
                    }
                    setIsCustomModelInput(false);
                  }}
                  icon={<Check className="w-3.5 h-3.5" />}
                  title="Save custom model"
                />
                <IconButton
                  size="xs"
                  variant="ghost"
                  onClick={() => setIsCustomModelInput(false)}
                  icon={<X className="w-3.5 h-3.5" />}
                  title="Cancel"
                />
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <select
                  value={activeModel || activeProvider.defaultModel}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setIsCustomModelInput(true);
                      setCustomModelText(activeModel || activeProvider.defaultModel || '');
                    } else {
                      setActiveModel(e.target.value);
                    }
                  }}
                  className="bg-surface-container border border-hairline text-xs rounded-xs px-2.5 py-1 text-ink-secondary focus:outline-none focus:border-action font-mono max-w-[220px] cursor-pointer"
                >
                  {activeProvider.availableModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                  <option value="__custom__">+ Enter custom model...</option>
                </select>

                <IconButton
                  size="xs"
                  variant="ghost"
                  onClick={handleRefreshModels}
                  isLoading={isRefreshingModels}
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                  title="Refresh available models from endpoint"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Permission Mode Switcher: Auto-Apply vs Ask to Confirm */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-ink-tertiary hidden md:inline">Execution Mode:</span>
        <SegmentedControl
          options={[
            {
              value: 'auto-apply',
              label: 'Auto-apply',
              icon: <Zap className="w-3 h-3" />,
              title: 'Applies changes to the 3D viewport in real time with Ctrl+Z undo support'
            },
            {
              value: 'ask-to-confirm',
              label: 'Ask to confirm',
              icon: <ShieldAlert className="w-3 h-3" />,
              title: 'Shows an approval card before modifying the 3D scene'
            }
          ]}
          value={permissionMode}
          onChange={(val) => setPermissionMode(val as any)}
          size="xs"
        />
      </div>
    </header>
  );
};
