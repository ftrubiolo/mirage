import {
  ALL_SLOT_NAMES,
  PbrMaterialParameters,
  SlotName,
  usePbrMaterialStore
} from '../store/pbrMaterialStore';
import { useModelStore } from '../store/modelStore';
import { useViewportStore, EnvironmentPreset } from '../store/viewportStore';
import {
  commandManager,
  isMaterialParameter,
  SetPbrPropertyCommand,
  SetEnvironmentPresetCommand,
  SetModelRotationCommand,
  ToggleSlotEnabledCommand,
  TransactionCommand
} from '../utils/commandManager';
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
      // The schema above is advisory: the model's output is untrusted, so the
      // property name is re-checked here against the real parameter set.
      if (!isMaterialParameter(property)) {
        throw new Error(`Propiedad PBR desconocida: ${String(property)}`);
      }
      if (typeof value !== 'number' && typeof value !== 'string' && typeof value !== 'boolean') {
        throw new Error('Valor inválido para el parámetro PBR');
      }
      const pbr = usePbrMaterialStore.getState();
      const before = pbr[property as keyof PbrMaterialParameters];
      const cmd = new SetPbrPropertyCommand(property, value as number | string);
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
      const pbr = usePbrMaterialStore.getState();
      const before = pbr.slotEnabled[slot as SlotName] ?? true;
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
      const pbr = usePbrMaterialStore.getState();
      const before = pbr.debugChannel;
      pbr.setDebugChannel(channel);
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
      const stats = useModelStore.getState().modelStats;
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

      const values = MATERIAL_PRESET_VALUES[String(presetId)];
      if (!values) {
        return { summary: `Preset "${presetId}" sin valores definidos.`, diff: [] };
      }

      const pbr = usePbrMaterialStore.getState();
      const diff = Object.entries(values).map(([property, after]) => ({
        property,
        before: (pbr as any)[property],
        after
      }));

      // Each change is recorded as a real command inside a transaction, so the
      // whole preset is one undoable step. The previous implementation mutated
      // the stores directly between begin/commit, which committed an EMPTY
      // transaction: the agent reported success and Ctrl+Z did nothing.
      const commands = Object.entries(values).map(
        ([property, after]) => new SetPbrPropertyCommand(property, after)
      );
      await commandManager.execute(
        new TransactionCommand(`Aplicar Preset: ${preset.name}`, commands)
      );

      return {
        summary: `Preset "${preset.name}" aplicado correctamente.`,
        diff
      };
    }
  },
  {
    name: 'rotate_model',
    description: 'Rota el modelo 3D en el visor sobre uno o más ejes (X, Y, Z) en grados para corregir su orientación o encarar el frente. Ejemplo: 90° en X para modelos Z-Up invertidos.',
    parameters: {
      type: 'object',
      properties: {
        axis: {
          type: 'string',
          enum: ['x', 'y', 'z'],
          description: 'Eje sobre el cual rotar el modelo'
        },
        degrees: {
          type: 'number',
          description: 'Ángulo en grados a incrementar (ej: 90, -90, 180)'
        }
      },
      required: ['axis', 'degrees']
    },
    execute: async ({ axis, degrees }: { axis: string; degrees: number }) => {
      const current = useModelStore.getState().modelRotation;
      const normalizedAxis = (axis || 'x').toLowerCase() as 'x' | 'y' | 'z';
      const delta = Number(degrees) || 0;
      const nextRotation = {
        ...current,
        [normalizedAxis]: ((current[normalizedAxis] + delta) % 360 + 360) % 360
      };

      const cmd = new SetModelRotationCommand(nextRotation);
      await commandManager.execute(cmd);

      return {
        summary: `Rotado el modelo ${delta}° en el eje ${normalizedAxis.toUpperCase()} (Orientación: [${nextRotation.x}°, ${nextRotation.y}°, ${nextRotation.z}°]).`,
        diff: [
          {
            property: `rotation.${normalizedAxis}`,
            before: `${current[normalizedAxis]}°`,
            after: `${nextRotation[normalizedAxis]}°`
          }
        ]
      };
    }
  }
];

/**
 * Preset id -> the material parameters it sets. Held as data so the diff shown
 * to the user and the commands actually executed cannot drift apart.
 */
const MATERIAL_PRESET_VALUES: Record<string, Record<string, number | string>> = {
  cuero: { roughnessFactor: 0.35, metalnessFactor: 0.0, clearcoatFactor: 0.2 },
  lino: { roughnessFactor: 0.85, metalnessFactor: 0.0, sheenRoughness: 0.6 },
  metal: { roughnessFactor: 0.2, metalnessFactor: 0.9 },
  madera: { roughnessFactor: 0.5, metalnessFactor: 0.0 }
};

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
