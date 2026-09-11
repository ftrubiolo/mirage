import {
  PbrMaterialParameters,
  defaultPbrParameters,
  usePbrMaterialStore
} from '../store/pbrMaterialStore';
import { SlotName } from '../store/pbrMaterialStore';
import { useViewportStore, EnvironmentPreset } from '../store/viewportStore';
import { setMaterialProperty } from '../store/workbenchActions';

/**
 * The only properties a material command may touch.
 *
 * Derived from the canonical defaults object so the allowlist cannot drift from
 * the real shape of `PbrMaterialParameters`.
 */
const MATERIAL_PARAMETER_KEYS = new Set<string>(Object.keys(defaultPbrParameters));

export function isMaterialParameter(key: unknown): key is keyof PbrMaterialParameters {
  return typeof key === 'string' && MATERIAL_PARAMETER_KEYS.has(key);
}

export interface Command {
  name: string;
  execute(): Promise<void> | void;
  undo(): Promise<void> | void;
}

export class TransactionCommand implements Command {
  private executedCommands: Command[] = [];

  constructor(
    public name: string,
    private commands: Command[]
  ) {}

  async execute() {
    this.executedCommands = [];
    for (const cmd of this.commands) {
      await cmd.execute();
      this.executedCommands.push(cmd);
    }
  }

  async undo() {
    for (let i = this.executedCommands.length - 1; i >= 0; i--) {
      await this.executedCommands[i].undo();
    }
  }
}

export class SetPbrPropertyCommand implements Command {
  public name: string;
  private previousValue: number | string | undefined;
  private readonly key: keyof PbrMaterialParameters;

  constructor(property: string, private nextValue: number | string) {
    // Reject anything outside the known parameter set. Previously the setter
    // name was built by string concatenation and fell back to a bare
    // `setState({ [property]: value })`, so a model-supplied property name could
    // write an arbitrary key into the store.
    if (!isMaterialParameter(property)) {
      throw new Error(`Unknown material property: ${String(property)}`);
    }
    this.key = property;
    this.name = `Ajustar ${property} a ${nextValue}`;
  }

  execute() {
    this.previousValue = usePbrMaterialStore.getState()[this.key] as number | string;
    setMaterialProperty(this.key, this.nextValue as never);
  }

  undo() {
    if (this.previousValue === undefined) return;
    setMaterialProperty(this.key, this.previousValue as never);
  }
}

export class SetEnvironmentPresetCommand implements Command {
  public name: string;
  private previousPreset: EnvironmentPreset | undefined;

  constructor(private nextPreset: EnvironmentPreset) {
    this.name = `Cambiar entorno a ${nextPreset}`;
  }

  execute() {
    const vp = useViewportStore.getState();
    this.previousPreset = vp.environmentPreset;
    vp.setEnvironmentPreset(this.nextPreset);
  }

  undo() {
    if (!this.previousPreset) return;
    useViewportStore.getState().setEnvironmentPreset(this.previousPreset);
  }
}

export class ToggleSlotEnabledCommand implements Command {
  public name: string;
  private previousEnabled: boolean | undefined;

  constructor(private slot: SlotName, private nextEnabled: boolean) {
    this.name = `Alternar ranura ${slot} a ${nextEnabled ? 'activa' : 'inactiva'}`;
  }

  execute() {
    const pbr = usePbrMaterialStore.getState();
    this.previousEnabled = pbr.slotEnabled[this.slot] ?? true;
    pbr.setSlotEnabled(this.slot, this.nextEnabled);
  }

  undo() {
    if (this.previousEnabled === undefined) return;
    usePbrMaterialStore.getState().setSlotEnabled(this.slot, this.previousEnabled);
  }
}

/**
 * Determines whether a keyboard event originated inside an interactive text input
 * element where global application shortcuts must be suppressed.
 */
export function isInteractiveTextInput(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return true;
  }
  if (target.isContentEditable) {
    return true;
  }
  if (typeof target.closest === 'function' && target.closest('input, textarea, [contenteditable="true"]')) {
    return true;
  }
  return false;
}

export class CommandManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private activeTransaction: Command[] | null = null;
  private changeListeners: (() => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => {
        if (isInteractiveTextInput(e.target)) {
          return;
        }

        const isCmdOrCtrl = e.metaKey || e.ctrlKey;
        if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
          if (e.shiftKey) {
            e.preventDefault();
            this.redo();
          } else {
            e.preventDefault();
            this.undo();
          }
        } else if (isCmdOrCtrl && e.key.toLowerCase() === 'y') {
          e.preventDefault();
          this.redo();
        }
      });
    }
  }

  public subscribe(listener: () => void) {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    for (const l of this.changeListeners) l();
  }

  public beginTransaction(name = 'Operación del Agente') {
    this.activeTransaction = [];
  }

  public async commitTransaction(name = 'Operación del Agente') {
    if (!this.activeTransaction || this.activeTransaction.length === 0) {
      this.activeTransaction = null;
      return;
    }
    const composite = new TransactionCommand(name, this.activeTransaction);
    this.undoStack.push(composite);
    this.redoStack = [];
    this.activeTransaction = null;
    this.notify();
  }

  public rollbackTransaction() {
    if (!this.activeTransaction) return;
    for (let i = this.activeTransaction.length - 1; i >= 0; i--) {
      this.activeTransaction[i].undo();
    }
    this.activeTransaction = null;
    this.notify();
  }

  public async execute(command: Command) {
    await command.execute();
    if (this.activeTransaction) {
      this.activeTransaction.push(command);
    } else {
      this.undoStack.push(command);
      this.redoStack = [];
    }
    this.notify();
  }

  public async undo(): Promise<Command | null> {
    const cmd = this.undoStack.pop();
    if (!cmd) return null;
    await cmd.undo();
    this.redoStack.push(cmd);
    this.notify();
    return cmd;
  }

  public async redo(): Promise<Command | null> {
    const cmd = this.redoStack.pop();
    if (!cmd) return null;
    await cmd.execute();
    this.undoStack.push(cmd);
    this.notify();
    return cmd;
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public getLastUndoName(): string | null {
    if (this.undoStack.length === 0) return null;
    return this.undoStack[this.undoStack.length - 1].name;
  }
}

export const commandManager = new CommandManager();
