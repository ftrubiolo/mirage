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
    description: 'Modifies a numeric, boolean, or color parameter of the active PBR material in the 3D viewport in real time.',
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
          description: 'Name of the PBR property to modify'
        },
        value: {
          type: ['number', 'string', 'boolean'],
          description: 'New property value (0–1 for scalar factors, hex string like #ffffff for colors, or boolean)'
        }
      },
      required: ['property', 'value']
    },
    execute: async ({ property, value }) => {
      // The schema above is advisory: the model's output is untrusted, so the
      // property name is re-checked here against the real parameter set.
      if (!isMaterialParameter(property)) {
        throw new Error(`Unknown PBR property: ${String(property)}`);
      }
      if (typeof value !== 'number' && typeof value !== 'string' && typeof value !== 'boolean') {
        throw new Error('Invalid value for PBR parameter');
      }
      const pbr = usePbrMaterialStore.getState();
      const before = pbr[property as keyof PbrMaterialParameters];
      const cmd = new SetPbrPropertyCommand(property, value as number | string);
      await commandManager.execute(cmd);
      return {
        summary: `Adjusted ${property} from ${before} to ${value}`,
        diff: [{ property, before, after: value }]
      };
    }
  },
  {
    name: 'toggle_pbr_slot',
    description: 'Enables or disables a specific PBR texture map slot (e.g., force-disabling the normal or roughness map).',
    parameters: {
      type: 'object',
      properties: {
        slot: {
          type: 'string',
          enum: ALL_SLOT_NAMES,
          description: 'Texture slot to enable or disable'
        },
        enabled: {
          type: 'boolean',
          description: 'true to enable the slot, false to disable it'
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
        summary: `Slot ${slot} ${enabled ? 'enabled' : 'disabled'}`,
        diff: [{ property: `slotEnabled.${slot}`, before, after: enabled }]
      };
    }
  },
  {
    name: 'set_environment_preset',
    description: 'Changes the 3D studio HDR environment and lighting preset.',
    parameters: {
      type: 'object',
      properties: {
        preset: {
          type: 'string',
          enum: ['city', 'studio', 'warehouse', 'apartment', 'sunset', 'night', 'park', 'lobby'],
          description: 'Studio lighting preset'
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
        summary: `Environment lighting changed to "${preset}"`,
        diff: [{ property: 'environmentPreset', before, after: preset }]
      };
    }
  },
  {
    name: 'set_debug_channel',
    description: 'Switches the PBR inspection channel in the 3D viewport (lit, albedo, normal, roughness, metalness, ao, emissive, wireframe).',
    parameters: {
      type: 'object',
      properties: {
        channel: {
          type: 'string',
          enum: ['lit', 'albedo', 'normal', 'roughness', 'metalness', 'ao', 'emissive', 'wireframe'],
          description: 'Render pass channel to display'
        }
      },
      required: ['channel']
    },
    execute: async ({ channel }) => {
      const pbr = usePbrMaterialStore.getState();
      const before = pbr.debugChannel;
      pbr.setDebugChannel(channel);
      return {
        summary: `Debug render pass switched to "${channel}"`,
        diff: [{ property: 'debugChannel', before, after: channel }]
      };
    }
  },
  {
    name: 'audit_geometry',
    description: 'Audits the active model geometry: polygon count, vertices, draw calls, and technical recommendations.',
    parameters: {
      type: 'object',
      properties: {}
    },
    execute: async () => {
      const stats = useModelStore.getState().modelStats;
      if (!stats) {
        return {
          summary: 'No model loaded to audit.',
          diff: []
        };
      }
      const polyStatus = stats.triangleCount < 100000 ? 'Optimal (<100k)' : stats.triangleCount <= 250000 ? 'Acceptable' : 'Heavy (>250k)';
      const drawCallStatus = stats.meshCount <= 10 ? 'Excellent (≤10 meshes)' : 'Multiple draw calls';
      return {
        summary: `Audit: ${stats.triangleCount.toLocaleString()} triangles (${polyStatus}), ${stats.meshCount} meshes (${drawCallStatus}).`,
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
    description: 'Applies a PBR material preset from the Mirage catalog (e.g., fabric, leather, wood, metal, plastic, glass, ceramic).',
    parameters: {
      type: 'object',
      properties: {
        presetId: {
          type: 'string',
          enum: ['fabric', 'leather', 'wood', 'metal', 'plastic', 'glass', 'ceramic'],
          description: 'Preset identifier'
        }
      },
      required: ['presetId']
    },
    execute: async ({ presetId }) => {
      const normalizedId = LEGACY_PRESET_ALIASES[String(presetId)] || String(presetId);
      const preset = GLOBAL_MATERIAL_PRESETS.find((p) => p.id === normalizedId);
      if (!preset) {
        return { summary: `Preset "${presetId}" not found.`, diff: [] };
      }

      const values = MATERIAL_PRESET_VALUES[normalizedId];
      if (!values) {
        return { summary: `Preset "${presetId}" has no defined parameters.`, diff: [] };
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
        new TransactionCommand(`Apply Preset: ${preset.name}`, commands)
      );

      return {
        summary: `Applied "${preset.name}" preset.`,
        diff
      };
    }
  },
  {
    name: 'rotate_model',
    description: 'Rotates the 3D model in the viewport around an axis (X, Y, Z) in degrees to fix orientation or face front (e.g., 90° on X for inverted Z-Up models).',
    parameters: {
      type: 'object',
      properties: {
        axis: {
          type: 'string',
          enum: ['x', 'y', 'z'],
          description: 'Axis to rotate the model around'
        },
        degrees: {
          type: 'number',
          description: 'Angle increment in degrees (e.g., 90, -90, 180)'
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
        summary: `Rotated model by ${delta}° on ${normalizedAxis.toUpperCase()} axis (Orientation: [${nextRotation.x}°, ${nextRotation.y}°, ${nextRotation.z}°]).`,
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

const LEGACY_PRESET_ALIASES: Record<string, string> = {
  lino: 'fabric',
  cuero: 'leather',
  madera: 'wood'
};

/**
 * Preset id -> the material parameters it sets. Held as data so the diff shown
 * to the user and the commands actually executed cannot drift apart.
 */
const MATERIAL_PRESET_VALUES: Record<string, Record<string, number | string>> = {
  leather: { roughnessFactor: 0.35, metalnessFactor: 0.0, clearcoatFactor: 0.2 },
  fabric: { roughnessFactor: 0.85, metalnessFactor: 0.0, sheenRoughness: 0.6 },
  metal: { roughnessFactor: 0.2, metalnessFactor: 0.9 },
  wood: { roughnessFactor: 0.5, metalnessFactor: 0.0 },
  plastic: { roughnessFactor: 0.45, metalnessFactor: 0.0 },
  glass: { roughnessFactor: 0.05, metalnessFactor: 0.0, transmissionFactor: 0.95, ior: 1.5 },
  ceramic: { roughnessFactor: 0.15, metalnessFactor: 0.0, clearcoatFactor: 0.6 }
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
