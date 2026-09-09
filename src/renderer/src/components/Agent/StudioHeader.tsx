import React, { useState } from 'react';
import { RefreshCw, Zap, ShieldAlert, Check, X } from 'lucide-react';
import { useAgentStore } from '../../store/agentStore';

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
                {p.name} {!p.hasKey ? '(Sin clave)' : ''}
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
                  placeholder="Nombre del modelo..."
                  className="bg-transparent text-xs text-ink-primary font-mono w-[180px] focus:outline-none"
                  autoFocus
                />
                <button
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
                  className="text-action hover:text-action-hover px-1 font-bold text-xs cursor-pointer flex items-center"
                  title="Guardar modelo personalizado"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsCustomModelInput(false)}
                  className="text-ink-tertiary hover:text-ink-primary px-1 text-xs cursor-pointer flex items-center"
                  title="Cancelar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
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
                  <option value="__custom__">+ Escribir otro modelo...</option>
                </select>

                <button
                  onClick={handleRefreshModels}
                  disabled={isRefreshingModels}
                  className="p-1 hover:bg-surface-container rounded-xs text-ink-tertiary hover:text-action transition-colors cursor-pointer"
                  title="Auto-cargar modelos actualizados del endpoint"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isRefreshingModels ? 'animate-spin text-action' : ''}`}
                  />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Permission Mode Switcher: Auto-Apply vs Ask to Confirm */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-ink-tertiary hidden md:inline">Modo de Ejecución:</span>
        <div className="flex items-center bg-surface-container rounded-xs p-0.5 border border-hairline text-xs">
          <button
            onClick={() => setPermissionMode('auto-apply')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xs text-[11px] font-medium transition-colors cursor-pointer ${
              permissionMode === 'auto-apply'
                ? 'bg-action text-white shadow-xs'
                : 'text-ink-secondary hover:text-ink-primary'
            }`}
            title="Aplica cambios al visor 3D en tiempo real con opción a deshacer con Ctrl+Z"
          >
            <Zap className="w-3 h-3" />
            <span>Auto-aplicar</span>
          </button>

          <button
            onClick={() => setPermissionMode('ask-to-confirm')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xs text-[11px] font-medium transition-colors cursor-pointer ${
              permissionMode === 'ask-to-confirm'
                ? 'bg-action text-white shadow-xs'
                : 'text-ink-secondary hover:text-ink-primary'
            }`}
            title="Muestra una tarjeta de aprobación antes de modificar la escena 3D"
          >
            <ShieldAlert className="w-3 h-3" />
            <span>Pedir confirmación</span>
          </button>
        </div>
      </div>
    </header>
  );
};
