import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Key,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit2,
  RefreshCw,
  Eye,
  EyeOff,
  Server,
  Search,
  ExternalLink,
  Check,
  Loader2
} from 'lucide-react';
import { useAgentStore } from '../../store/agentStore';
import { AIProviderConfig } from '../../types/agent';
import { Modal } from '../UI/Modal';
import { STANDARD_PROVIDERS, ProviderDefinition } from '../../agent/providerRegistry';

export const AiProvidersSection: React.FC = () => {
  const { providers, saveProvider, deleteProvider, init } = useAgentStore();

  // Modals state
  const [isAddStandardOpen, setIsAddStandardOpen] = useState(false);
  const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProviderConfig | null>(null);

  // Add Standard Provider State
  const [selectedProviderId, setSelectedProviderId] = useState<string>(STANDARD_PROVIDERS[0].id);
  const [standardApiKey, setStandardApiKey] = useState('');
  const [showStandardKey, setShowStandardKey] = useState(false);
  const [isConnectingStandard, setIsConnectingStandard] = useState(false);
  const [standardError, setStandardError] = useState<string | null>(null);

  // Add Custom Provider State
  const [customName, setCustomName] = useState('');
  const [customBaseUrl, setCustomBaseUrl] = useState('http://localhost:11434/v1');
  const [customKey, setCustomKey] = useState('');
  const [showCustomKey, setShowCustomKey] = useState(false);
  const [customModel, setCustomModel] = useState('');
  const [isConnectingCustom, setIsConnectingCustom] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  // Edit Provider State
  const [editApiKey, setEditApiKey] = useState('');
  const [showEditKey, setShowEditKey] = useState(false);
  const [editModel, setEditModel] = useState('');
  const [isManualModel, setIsManualModel] = useState(false);
  const [manualModelInput, setManualModelInput] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [isTestingEdit, setIsTestingEdit] = useState(false);
  const [editTestResult, setEditTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  const activeStandardDef: ProviderDefinition =
    STANDARD_PROVIDERS.find((p) => p.id === selectedProviderId) || STANDARD_PROVIDERS[0];

  // --------------------------------------------------------------------------
  // Handlers for Add Standard Provider
  // --------------------------------------------------------------------------
  const handleOpenAddStandard = () => {
    setSelectedProviderId(STANDARD_PROVIDERS[0].id);
    setStandardApiKey('');
    setShowStandardKey(false);
    setStandardError(null);
    setIsConnectingStandard(false);
    setIsAddStandardOpen(true);
  };

  const handleConnectStandard = async (e: React.FormEvent) => {
    e.preventDefault();
    const def = activeStandardDef;
    const trimmedKey = standardApiKey.trim();

    if (!trimmedKey) {
      setStandardError('Debes ingresar una clave API para conectar este proveedor.');
      return;
    }

    setIsConnectingStandard(true);
    setStandardError(null);

    try {
      let fetchedModels: string[] = [];
      if (window.electronAPI) {
        // Automatic connection test & dynamic model fetching
        const testRes = await window.electronAPI.testAgentConnection({
          baseUrl: def.baseUrl,
          apiKey: trimmedKey,
          providerId: def.id
        });

        if (testRes.success) {
          if (Array.isArray(testRes.models) && testRes.models.length > 0) {
            fetchedModels = testRes.models;
          }
        } else {
          throw new Error(testRes.error || 'La clave API o el servidor devolvieron un error.');
        }
      }

      const availableModels = Array.from(new Set([...fetchedModels, ...def.popularModels]));
      const newConfig: AIProviderConfig = {
        id: def.id,
        name: def.name,
        baseUrl: def.baseUrl,
        defaultModel: fetchedModels[0] || def.defaultModel,
        availableModels,
        hasKey: true,
        status: 'active'
      };

      await saveProvider(newConfig, trimmedKey);
      setIsAddStandardOpen(false);
      setStandardApiKey('');
    } catch (err: any) {
      setStandardError(err.message || 'Error de conexión al verificar el proveedor.');
    } finally {
      setIsConnectingStandard(false);
    }
  };

  // --------------------------------------------------------------------------
  // Handlers for Add Custom Provider
  // --------------------------------------------------------------------------
  const handleOpenAddCustom = () => {
    setCustomName('');
    setCustomBaseUrl('http://localhost:11434/v1');
    setCustomKey('');
    setShowCustomKey(false);
    setCustomModel('');
    setCustomError(null);
    setIsConnectingCustom(false);
    setIsAddCustomOpen(true);
  };

  const handleConnectCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) {
      setCustomError('Introduce un nombre para el proveedor.');
      return;
    }
    if (!customBaseUrl.trim()) {
      setCustomError('Introduce la URL base (Base URL).');
      return;
    }

    setIsConnectingCustom(true);
    setCustomError(null);

    try {
      let fetchedModels: string[] = [];
      if (window.electronAPI) {
        const testRes = await window.electronAPI.testAgentConnection({
          baseUrl: customBaseUrl.trim(),
          apiKey: customKey.trim() || undefined,
          providerId: 'custom'
        });

        if (testRes.success && Array.isArray(testRes.models) && testRes.models.length > 0) {
          fetchedModels = testRes.models;
        }
      }

      const chosenModel = customModel.trim() || fetchedModels[0] || 'default-model';
      const availableModels = Array.from(new Set([chosenModel, ...fetchedModels].filter(Boolean)));
      const customId = `custom_${Date.now()}`;

      const newConfig: AIProviderConfig = {
        id: customId,
        name: customName.trim(),
        baseUrl: customBaseUrl.trim(),
        defaultModel: chosenModel,
        availableModels,
        isCustom: true,
        hasKey: Boolean(customKey.trim()),
        status: 'active'
      };

      await saveProvider(newConfig, customKey.trim() || undefined);
      setIsAddCustomOpen(false);
    } catch (err: any) {
      setCustomError(err.message || 'Error de conexión con el endpoint local.');
    } finally {
      setIsConnectingCustom(false);
    }
  };

  // --------------------------------------------------------------------------
  // Handlers for Edit Provider
  // --------------------------------------------------------------------------
  const handleOpenEdit = async (p: AIProviderConfig) => {
    setEditingProvider(p);
    setEditModel(p.defaultModel || '');
    setIsManualModel(false);
    setManualModelInput(p.defaultModel || '');
    setModelSearch('');
    setEditTestResult(null);
    setShowEditKey(false);

    let key = '';
    if (window.electronAPI) {
      key = (await window.electronAPI.getSecret(`provider_${p.id}`)) || '';
    }
    setEditApiKey(key);

    // Dynamic model fetch
    if (window.electronAPI && p.baseUrl) {
      setIsLoadingModels(true);
      try {
        const res = await window.electronAPI.fetchAgentModels({
          baseUrl: p.baseUrl,
          apiKey: key || undefined
        });
        if (res.success && Array.isArray(res.models) && res.models.length > 0) {
          const combined = Array.from(new Set([...res.models, ...p.availableModels]));
          setEditingProvider((prev) => (prev ? { ...prev, availableModels: combined } : null));
        }
      } catch (err) {
        console.warn('Error loading models:', err);
      } finally {
        setIsLoadingModels(false);
      }
    }
  };

  const handleTestEditConnection = async () => {
    if (!editingProvider || !window.electronAPI) return;
    setIsTestingEdit(true);
    setEditTestResult(null);

    try {
      const res = await window.electronAPI.testAgentConnection({
        baseUrl: editingProvider.baseUrl,
        apiKey: editApiKey.trim() || undefined,
        providerId: editingProvider.id
      });

      if (res.success) {
        if (Array.isArray(res.models) && res.models.length > 0) {
          const combined = Array.from(new Set([...res.models, ...editingProvider.availableModels]));
          setEditingProvider((prev) => (prev ? { ...prev, availableModels: combined } : null));
        }
        setEditTestResult({
          success: true,
          message: `Conexión verificada. ${res.models?.length ? `${res.models.length} modelos auto-cargados.` : 'OK'}`
        });
      } else {
        setEditTestResult({
          success: false,
          message: res.error || 'Fallo en la prueba de conexión'
        });
      }
    } catch (err: any) {
      setEditTestResult({
        success: false,
        message: err.message || 'Error de red'
      });
    } finally {
      setIsTestingEdit(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingProvider) return;
    const finalModel = isManualModel && manualModelInput.trim()
      ? manualModelInput.trim()
      : editModel || editingProvider.defaultModel;

    const available = Array.from(new Set([finalModel, ...editingProvider.availableModels].filter(Boolean)));

    const updatedConfig: AIProviderConfig = {
      ...editingProvider,
      defaultModel: finalModel,
      availableModels: available,
      hasKey: Boolean(editApiKey.trim()) || editingProvider.hasKey
    };

    await saveProvider(updatedConfig, editApiKey.trim() || undefined);
    setEditingProvider(null);
  };

  const filteredEditModels = (editingProvider?.availableModels || []).filter((m) =>
    m.toLowerCase().includes(modelSearch.toLowerCase())
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-primary font-bold text-sm uppercase tracking-wider text-ink-primary flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-action" />
          Modelos & Proveedores IA
        </h2>
        <p className="text-xs text-ink-secondary mt-0.5">
          Introduce tus claves API para conectar modelos externos o servidores locales al Atelier.
        </p>
      </div>

      {/* Clean Slate Empty State */}
      {providers.length === 0 ? (
        <div className="p-8 rounded-lg bg-surface-lowest border border-hairline flex flex-col items-center justify-center text-center space-y-4 shadow-xs">
          <div className="p-3.5 rounded-full bg-surface-low border border-hairline text-action shadow-xs">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="font-primary font-bold text-sm text-ink-primary uppercase tracking-wide">
              Sin proveedores de IA configurados
            </h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Conecta tu primer proveedor (OpenAI, Anthropic, OpenRouter, Google, DeepSeek o servidor local) para activar el agente inteligente en Mirage.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={handleOpenAddStandard}
              className="px-4 py-2 bg-action hover:bg-action-hover text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir Proveedor</span>
            </button>
            <button
              onClick={handleOpenAddCustom}
              className="px-4 py-2 bg-surface-low hover:bg-surface-high border border-hairline text-ink-primary text-xs font-medium rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Server className="w-4 h-4 text-action" />
              <span>Añadir Servidor Local / Custom</span>
            </button>
          </div>
        </div>
      ) : (
        /* Configured Providers List */
        <div className="space-y-2.5">
          {providers.map((p) => {
            const isConnected = p.hasKey;
            return (
              <div
                key={p.id}
                className="flex items-center justify-between p-3.5 bg-surface-lowest border border-hairline rounded-lg hover:border-hairline-strong transition-all shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors ${
                      isConnected ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' : 'bg-amber-500'
                    }`}
                    title={isConnected ? 'Conectado y listo' : 'Sin clave API'}
                  />
                  <div>
                    <div className="font-primary font-semibold text-xs text-ink-primary tracking-wide">
                      {p.name}
                    </div>
                    <div className="text-[11px] font-mono text-ink-tertiary">
                      Modelo activo: <span className="text-ink-secondary">{p.defaultModel || 'No seleccionado'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="px-3 py-1 bg-surface-low hover:bg-surface-high text-ink-primary text-xs font-medium rounded-md border border-hairline transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3 text-ink-secondary" />
                    <span>Editar</span>
                  </button>

                  <button
                    onClick={() => deleteProvider(p.id)}
                    className="p-1.5 hover:bg-rose-500/10 text-ink-tertiary hover:text-rose-500 rounded-md transition-colors cursor-pointer"
                    title="Eliminar proveedor"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleOpenAddStandard}
              className="py-2.5 px-4 rounded-lg border border-dashed border-hairline-strong hover:border-action bg-surface-low/50 hover:bg-surface-low text-ink-secondary hover:text-ink-primary text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-action" />
              <span>Añadir Proveedor</span>
            </button>

            <button
              onClick={handleOpenAddCustom}
              className="py-2.5 px-4 rounded-lg border border-dashed border-hairline-strong hover:border-action bg-surface-low/50 hover:bg-surface-low text-ink-secondary hover:text-ink-primary text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Server className="w-4 h-4 text-action" />
              <span>Añadir Servidor Local / Custom</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. ADD STANDARD PROVIDER MODAL (Dropdown + Auto-Test on Connect)          */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddStandardOpen}
        onClose={() => !isConnectingStandard && setIsAddStandardOpen(false)}
        title="Añadir Proveedor de IA"
        icon={<Sparkles className="w-4 h-4 text-action" />}
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsAddStandardOpen(false)}
              disabled={isConnectingStandard}
              className="px-3.5 py-1.5 text-xs text-ink-secondary hover:text-ink-primary hover:bg-surface-high rounded-md transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConnectStandard}
              disabled={isConnectingStandard || !standardApiKey.trim()}
              className="px-4 py-1.5 bg-action hover:bg-action-hover text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-40"
            >
              {isConnectingStandard ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verificando y conectando...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Conectar Proveedor</span>
                </>
              )}
            </button>
          </>
        }
      >
        <form onSubmit={handleConnectStandard} className="space-y-4 text-xs font-body">
          {standardError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-start gap-2 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-snug">{standardError}</div>
            </div>
          )}

          {/* Provider Selector Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-primary font-bold uppercase tracking-wider text-ink-secondary">
              Selecciona el Proveedor
            </label>
            <select
              value={selectedProviderId}
              onChange={(e) => {
                setSelectedProviderId(e.target.value);
                setStandardError(null);
              }}
              className="w-full bg-surface-low border border-hairline rounded-md px-3 py-2 text-xs text-ink-primary font-medium focus:outline-none focus:border-action cursor-pointer"
            >
              {STANDARD_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Provider Info Card */}
          <div className="p-3 bg-surface-low/80 border border-hairline rounded-md space-y-1.5 text-ink-secondary">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono text-ink-tertiary">Endpoint:</span>
              <span className="font-mono text-ink-primary truncate max-w-[260px]" title={activeStandardDef.baseUrl}>
                {activeStandardDef.baseUrl}
              </span>
            </div>

            {activeStandardDef.helpText && (
              <p className="text-[11px] text-ink-tertiary leading-relaxed pt-0.5">
                {activeStandardDef.helpText}
              </p>
            )}

            <div className="pt-1 flex items-center justify-between text-[11px]">
              <a
                href={activeStandardDef.apiKeyHelpUrl}
                target="_blank"
                rel="noreferrer"
                className="text-action hover:underline inline-flex items-center gap-1 font-medium"
              >
                <span>Obtener clave API en {activeStandardDef.name}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="font-mono text-[10px] text-ink-tertiary">
                Modelo base: {activeStandardDef.defaultModel}
              </span>
            </div>
          </div>

          {/* API Key Input */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-primary font-bold uppercase tracking-wider text-ink-secondary">
              Clave API (API Key)
            </label>
            <div className="relative flex items-center">
              <input
                type={showStandardKey ? 'text' : 'password'}
                autoFocus
                value={standardApiKey}
                onChange={(e) => setStandardApiKey(e.target.value)}
                placeholder={activeStandardDef.placeholderKey || 'sk-...'}
                className="w-full bg-surface-low border border-hairline rounded-md px-3 py-2 pr-10 text-xs text-ink-primary font-mono placeholder:text-ink-tertiary focus:outline-none focus:border-action"
              />
              <button
                type="button"
                onClick={() => setShowStandardKey(!showStandardKey)}
                className="absolute right-2.5 p-1 text-ink-tertiary hover:text-ink-primary transition-colors cursor-pointer"
                title={showStandardKey ? 'Ocultar clave' : 'Mostrar clave'}
              >
                {showStandardKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-ink-tertiary">
              La clave se cifrará con el almacén seguro del sistema operativo (Electron SafeStorage).
            </p>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* 2. ADD CUSTOM / LOCAL PROVIDER MODAL (Ollama, LM Studio, vLLM)            */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddCustomOpen}
        onClose={() => !isConnectingCustom && setIsAddCustomOpen(false)}
        title="Añadir Servidor Local / Custom"
        icon={<Server className="w-4 h-4 text-action" />}
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsAddCustomOpen(false)}
              disabled={isConnectingCustom}
              className="px-3.5 py-1.5 text-xs text-ink-secondary hover:text-ink-primary hover:bg-surface-high rounded-md transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConnectCustom}
              disabled={isConnectingCustom || !customName.trim() || !customBaseUrl.trim()}
              className="px-4 py-1.5 bg-action hover:bg-action-hover text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-40"
            >
              {isConnectingCustom ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Conectando...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Conectar Servidor</span>
                </>
              )}
            </button>
          </>
        }
      >
        <form onSubmit={handleConnectCustom} className="space-y-4 text-xs font-body">
          {customError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-start gap-2 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-snug">{customError}</div>
            </div>
          )}

          {/* Provider Name */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-primary font-bold uppercase tracking-wider text-ink-secondary">
              Nombre del Proveedor / Instancia
            </label>
            <input
              type="text"
              autoFocus
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Ej: Ollama Local, LM Studio, vLLM Studio"
              className="w-full bg-surface-low border border-hairline rounded-md px-3 py-2 text-xs text-ink-primary focus:outline-none focus:border-action"
            />
          </div>

          {/* Base URL */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-primary font-bold uppercase tracking-wider text-ink-secondary">
                URL Base del Servidor (OpenAI-compatible)
              </label>
              <div className="flex items-center gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setCustomBaseUrl('http://localhost:11434/v1')}
                  className="text-action hover:underline cursor-pointer"
                >
                  Ollama
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setCustomBaseUrl('http://localhost:1234/v1')}
                  className="text-action hover:underline cursor-pointer"
                >
                  LM Studio
                </button>
              </div>
            </div>
            <input
              type="text"
              value={customBaseUrl}
              onChange={(e) => setCustomBaseUrl(e.target.value)}
              placeholder="http://localhost:11434/v1"
              className="w-full bg-surface-low border border-hairline rounded-md px-3 py-2 text-xs text-ink-primary font-mono focus:outline-none focus:border-action"
            />
          </div>

          {/* Optional API Key */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-primary font-bold uppercase tracking-wider text-ink-secondary">
              Clave API (Opcional para servidores locales)
            </label>
            <div className="relative flex items-center">
              <input
                type={showCustomKey ? 'text' : 'password'}
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                placeholder="Dejar vacío si no requiere autenticación..."
                className="w-full bg-surface-low border border-hairline rounded-md px-3 py-2 pr-10 text-xs text-ink-primary font-mono focus:outline-none focus:border-action"
              />
              <button
                type="button"
                onClick={() => setShowCustomKey(!showCustomKey)}
                className="absolute right-2.5 p-1 text-ink-tertiary hover:text-ink-primary transition-colors cursor-pointer"
              >
                {showCustomKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Model ID */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-primary font-bold uppercase tracking-wider text-ink-secondary">
              Identificador del Modelo (Opcional, se auto-detecta)
            </label>
            <input
              type="text"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              placeholder="Ej: llama3.3, qwen2.5-coder:14b, local-model"
              className="w-full bg-surface-low border border-hairline rounded-md px-3 py-2 text-xs text-ink-primary font-mono focus:outline-none focus:border-action"
            />
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* 3. EDIT PROVIDER MODAL                                                    */}
      {/* ========================================================================= */}
      {editingProvider && (
        <Modal
          isOpen={Boolean(editingProvider)}
          onClose={() => setEditingProvider(null)}
          title={`Configurar ${editingProvider.name}`}
          icon={<Key className="w-4 h-4 text-action" />}
          size="lg"
          footer={
            <>
              <button
                type="button"
                onClick={() => setEditingProvider(null)}
                className="px-3.5 py-1.5 text-xs text-ink-secondary hover:text-ink-primary hover:bg-surface-high rounded-md transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-1.5 bg-action hover:bg-action-hover text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Guardar Cambios</span>
              </button>
            </>
          }
        >
          <div className="space-y-4 text-xs font-body">
            {/* Base URL Glance */}
            <div className="p-3 bg-surface-low rounded-md border border-hairline flex items-center justify-between text-ink-secondary">
              <span className="font-mono text-[11px] text-ink-tertiary">URL Base:</span>
              <span className="font-mono text-[11px] text-ink-primary truncate max-w-[320px]">
                {editingProvider.baseUrl}
              </span>
            </div>

            {/* API Key */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-primary font-bold uppercase tracking-wider text-ink-secondary">
                Clave API (Hardware Encrypted)
              </label>
              <div className="relative flex items-center">
                <input
                  type={showEditKey ? 'text' : 'password'}
                  value={editApiKey}
                  onChange={(e) => setEditApiKey(e.target.value)}
                  placeholder="Introduce o actualiza la clave API..."
                  className="w-full bg-surface-low border border-hairline rounded-md px-3 py-2 pr-10 text-xs text-ink-primary font-mono focus:outline-none focus:border-action"
                />
                <button
                  type="button"
                  onClick={() => setShowEditKey(!showEditKey)}
                  className="absolute right-2.5 p-1 text-ink-tertiary hover:text-ink-primary transition-colors cursor-pointer"
                >
                  {showEditKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Model Selector & Filter */}
            <div className="space-y-2 pt-2 border-t border-hairline">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-primary font-bold uppercase tracking-wider text-ink-secondary">
                  Modelo por Defecto
                </label>
                <button
                  type="button"
                  onClick={() => setIsManualModel(!isManualModel)}
                  className="text-[11px] text-action hover:underline cursor-pointer"
                >
                  {isManualModel ? 'Seleccionar de lista' : '+ Escribir ID manual'}
                </button>
              </div>

              {isManualModel ? (
                <input
                  type="text"
                  value={manualModelInput}
                  onChange={(e) => setManualModelInput(e.target.value)}
                  placeholder="Ej: openai/gpt-5.6-luna o deepseek/deepseek-r1"
                  className="w-full bg-surface-low border border-hairline rounded-md px-3 py-2 text-xs text-ink-primary font-mono focus:outline-none focus:border-action"
                />
              ) : (
                <div className="space-y-1.5">
                  {/* Model Search Filter */}
                  {editingProvider.availableModels.length > 5 && (
                    <div className="relative flex items-center">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 text-ink-tertiary" />
                      <input
                        type="text"
                        value={modelSearch}
                        onChange={(e) => setModelSearch(e.target.value)}
                        placeholder="Buscar modelo disponible..."
                        className="w-full bg-surface-low border border-hairline rounded-md pl-8 pr-3 py-1.5 text-xs text-ink-primary focus:outline-none focus:border-action font-mono"
                      />
                    </div>
                  )}

                  <select
                    value={editModel}
                    onChange={(e) => setEditModel(e.target.value)}
                    className="w-full bg-surface-low border border-hairline rounded-md px-3 py-2 text-xs text-ink-primary font-mono focus:outline-none focus:border-action cursor-pointer max-h-40"
                  >
                    {filteredEditModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Test Connection Button & Status */}
            <div className="pt-2 border-t border-hairline flex flex-col gap-2">
              <button
                type="button"
                onClick={handleTestEditConnection}
                disabled={isTestingEdit}
                className="w-full py-2 px-3 bg-surface-low hover:bg-surface-high border border-hairline text-ink-primary rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingEdit ? 'animate-spin text-action' : ''}`} />
                <span>{isTestingEdit ? 'Probando conexión...' : 'Probar Conexión y Actualizar Modelos'}</span>
              </button>

              {editTestResult && (
                <div
                  className={`p-2.5 rounded-md border text-xs flex items-center gap-2 ${
                    editTestResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  }`}
                >
                  {editTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span className="leading-snug">{editTestResult.message}</span>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
};
