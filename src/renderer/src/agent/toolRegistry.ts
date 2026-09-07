import { useWorkbenchStore, SlotName, ALL_SLOT_NAMES } from '../store/workbenchStore';
import { useViewportStore, EnvironmentPreset } from '../store/viewportStore';
import {
  commandManager,
  SetPbrPropertyCommand,
  SetEnvironmentPresetCommand,
  ToggleSlotEnabledCommand
} from './commandManager';
import { ProposedAction } from '../types/agent';
import { GLOBAL_MATERIAL_PRESETS } from '../types/library';

export interface AgentToolDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema format for OpenAI/DeepSeek function calling
  execute: (args: any) => Promise<{ summary: string; diff: { property: string; before: any; after: any }[]; resultData?: any }>;
}

export const MIRAGE_INTERNAL_TOOLS: AgentToolDeclaration[] = [
  {
    name: 'set_pbr_parameter',
    description: 'Modifica un parámetro numérico o de color del material PBR activo en el visor 3D en tiempo real.',
    parameters: {
      type: 'object',
      properties: {
        property: {
          type: 'string',
          enum: [
            'roughnessFactor',
            'metalnessFactor',
            'normalScale',
            'normalInvertY',
            'aoIntensity',
            'emissiveIntensity',
            'emissiveColor',
            'clearcoatFactor',
            'clearcoatRoughness',
            'sheenColor',
            'sheenRoughness',
            'transmissionFactor',
            'ior',
            'displacementScale'
          ],
          description: 'Nombre de la propiedad PBR a modificar'
        },
        value: {
          type: ['number', 'string', 'boolean'],
          description: 'Nuevo valor para la propiedad (número entre 0 y 1 para factores, hex para colores como #ffffff, o booleano)'
        }
      },
      required: ['property', 'value']
    },
    execute: async ({ property, value }) => {
      const wb = useWorkbenchStore.getState();
      const before = (wb as any)[property];
      const cmd = new SetPbrPropertyCommand(property, value);
      await commandManager.execute(cmd);
      return {
        summary: `Ajustado ${property} de ${before} a ${value}`,
        diff: [{ property, before, after: value }]
      };
    }
  },
  {
    name: 'toggle_pbr_slot',
    description: 'Activa o desactiva una ranura de textura PBR específica (ej: forzar apagado de mapa normal o de rugosidad).',
    parameters: {
      type: 'object',
      properties: {
        slot: {
          type: 'string',
          enum: ALL_SLOT_NAMES,
          description: 'Ranura de textura a activar o desactivar'
        },
        enabled: {
          type: 'boolean',
          description: 'true para activar la ranura, false para apagarla'
        }
      },
      required: ['slot', 'enabled']
    },
    execute: async ({ slot, enabled }) => {
      const wb = useWorkbenchStore.getState();
      const before = wb.slotEnabled[slot as SlotName] ?? true;
      const cmd = new ToggleSlotEnabledCommand(slot as SlotName, enabled);
      await commandManager.execute(cmd);
      return {
        summary: `Ranura ${slot} ${enabled ? 'activada' : 'desactivada'}`,
        diff: [{ property: `slotEnabled.${slot}`, before, after: enabled }]
      };
    }
  },
  {
    name: 'set_environment_preset',
    description: 'Cambia el entorno HDR y la iluminación del taller 3D.',
    parameters: {
      type: 'object',
      properties: {
        preset: {
          type: 'string',
          enum: ['city', 'studio', 'warehouse', 'apartment', 'sunset', 'night', 'park', 'lobby'],
          description: 'Preset de iluminación de estudio'
        }
      },
      required: ['preset']
    },
    execute: async ({ preset }) => {
      const vp = useViewportStore.getState();
      const before = vp.environmentPreset;
      const cmd = new SetEnvironmentPresetCommand(preset as EnvironmentPreset);
      await commandManager.execute(cmd);
      return {
        summary: `Iluminación de entorno cambiada a "${preset}"`,
        diff: [{ property: 'environmentPreset', before, after: preset }]
      };
    }
  },
  {
    name: 'set_debug_channel',
    description: 'Alterna el canal de inspección PBR en el visor 3D (lit, albedo, normal, roughness, metalness, ao, wireframe).',
    parameters: {
      type: 'object',
      properties: {
        channel: {
          type: 'string',
          enum: ['lit', 'albedo', 'normal', 'roughness', 'metalness', 'ao', 'emissive', 'wireframe'],
          description: 'Canal de pase de render a visualizar'
        }
      },
      required: ['channel']
    },
    execute: async ({ channel }) => {
      const wb = useWorkbenchStore.getState();
      const before = wb.debugChannel;
      wb.setDebugChannel(channel);
      return {
        summary: `Pase de depuración cambiado a "${channel}"`,
        diff: [{ property: 'debugChannel', before, after: channel }]
      };
    }
  },
  {
    name: 'audit_geometry',
    description: 'Audita la geometría del modelo activo: polígonos, vértices, llamadas de dibujo (draw calls) y recomendaciones técnicas.',
    parameters: {
      type: 'object',
      properties: {}
    },
    execute: async () => {
      const wb = useWorkbenchStore.getState();
      const stats = wb.modelStats;
      if (!stats) {
        return {
          summary: 'No hay modelo cargado para auditar.',
          diff: []
        };
      }
      const polyStatus = stats.triangleCount < 100000 ? 'Óptimo (<100k)' : stats.triangleCount <= 250000 ? 'Aceptable' : 'Pesado (>250k)';
      const drawCallStatus = stats.meshCount <= 10 ? 'Excelente (≤10 mallas)' : 'Múltiples llamadas';
      return {
        summary: `Auditoría: ${stats.triangleCount.toLocaleString()} triángulos (${polyStatus}), ${stats.meshCount} mallas (${drawCallStatus}).`,
        diff: [],
        resultData: {
          triangles: stats.triangleCount,
          vertices: stats.vertexCount,
          meshCount: stats.meshCount,
          dimensions: stats.dimensions,
          verdict: polyStatus
        }
      };
    }
  },
  {
    name: 'apply_material_preset',
    description: 'Aplica un preset de material del catálogo de Sera Atelier (ej: lino, cuero, madera, metal).',
    parameters: {
      type: 'object',
      properties: {
        presetId: {
          type: 'string',
          enum: ['lino', 'cuero', 'madera', 'metal'],
          description: 'Identificador del preset'
        }
      },
      required: ['presetId']
    },
    execute: async ({ presetId }) => {
      const preset = GLOBAL_MATERIAL_PRESETS.find((p) => p.id === presetId);
      if (!preset) {
        return { summary: `Preset "${presetId}" no encontrado.`, diff: [] };
      }

      commandManager.beginTransaction(`Aplicar Preset: ${preset.name}`);
      const wb = useWorkbenchStore.getState();
      const diff: { property: string; before: any; after: any }[] = [];

      if (presetId === 'cuero') {
        diff.push({ property: 'roughnessFactor', before: wb.roughnessFactor, after: 0.35 });
        diff.push({ property: 'metalnessFactor', before: wb.metalnessFactor, after: 0.0 });
        diff.push({ property: 'clearcoatFactor', before: wb.clearcoatFactor, after: 0.2 });
        wb.setRoughnessFactor(0.35);
        wb.setMetalnessFactor(0.0);
        wb.setClearcoatFactor(0.2);
      } else if (presetId === 'lino') {
        diff.push({ property: 'roughnessFactor', before: wb.roughnessFactor, after: 0.85 });
        diff.push({ property: 'metalnessFactor', before: wb.metalnessFactor, after: 0.0 });
        diff.push({ property: 'sheenRoughness', before: wb.sheenRoughness, after: 0.6 });
        wb.setRoughnessFactor(0.85);
        wb.setMetalnessFactor(0.0);
        wb.setSheenRoughness(0.6);
      } else if (presetId === 'metal') {
        diff.push({ property: 'roughnessFactor', before: wb.roughnessFactor, after: 0.2 });
        diff.push({ property: 'metalnessFactor', before: wb.metalnessFactor, after: 0.9 });
        wb.setRoughnessFactor(0.2);
        wb.setMetalnessFactor(0.9);
      } else if (presetId === 'madera') {
        diff.push({ property: 'roughnessFactor', before: wb.roughnessFactor, after: 0.5 });
        diff.push({ property: 'metalnessFactor', before: wb.metalnessFactor, after: 0.0 });
        wb.setRoughnessFactor(0.5);
        wb.setMetalnessFactor(0.0);
      }

      await commandManager.commitTransaction(`Aplicar Preset: ${preset.name}`);
      return {
        summary: `Preset "${preset.name}" aplicado correctamente.`,
        diff
      };
    }
  }
];

export function getOpenAIToolsDeclarations(mcpTools: any[] = []): any[] {
  const tools: any[] = [];

  // 1. Mirage internal tools
  for (const t of MIRAGE_INTERNAL_TOOLS) {
    tools.push({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    });
  }

  // 2. Connected MCP Tools
  for (const m of mcpTools) {
    tools.push({
      type: 'function',
      function: {
        name: m.compositeId || m.name,
        description: `[MCP:${m.serverName || m.serverId}] ${m.description || ''}`,
        parameters: m.inputSchema || { type: 'object', properties: {} }
      }
    });
  }

  return tools;
}
