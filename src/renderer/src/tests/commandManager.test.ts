import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command, TransactionCommand, commandManager, isInteractiveTextInput } from '@renderer/utils/commandManager';

// Re-export for any test helpers or external consumers
export { isInteractiveTextInput };

/**
 * Registers an isolated shortcut handler with the input guard for testing.
 */
export function createGuardedShortcutListener(manager: typeof commandManager) {
  return (e: KeyboardEvent) => {
    if (isInteractiveTextInput(e.target)) {
      // Suppress shortcut interception in text inputs
      return;
    }

    const isCmdOrCtrl = e.metaKey || e.ctrlKey;
    if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
      if (e.shiftKey) {
        e.preventDefault();
        manager.redo();
      } else {
        e.preventDefault();
        manager.undo();
      }
    } else if (isCmdOrCtrl && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      manager.redo();
    }
  };
}

describe('commandManager', () => {
  // Clear any existing stack on the singleton before each test
  beforeEach(async () => {
    while (commandManager.canUndo()) {
      await commandManager.undo();
    }
    // Redo stack will have elements, drain them
    while (commandManager.canRedo()) {
      await commandManager.redo();
    }
    // Now both stacks are empty
    while (commandManager.canUndo()) {
      await commandManager.undo();
    }
  });

  describe('TransactionCommand', () => {
    it('executes commands in sequence and undoes them in reverse order', async () => {
      const executionLog: string[] = [];

      const cmdA: Command = {
        name: 'Step A',
        execute: () => { executionLog.push('exec A'); },
        undo: () => { executionLog.push('undo A'); }
      };

      const cmdB: Command = {
        name: 'Step B',
        execute: () => { executionLog.push('exec B'); },
        undo: () => { executionLog.push('undo B'); }
      };

      const transaction = new TransactionCommand('Compound Step', [cmdA, cmdB]);

      await transaction.execute();
      expect(executionLog).toEqual(['exec A', 'exec B']);

      await transaction.undo();
      expect(executionLog).toEqual(['exec A', 'exec B', 'undo B', 'undo A']);
    });
  });

  describe('CommandManager execution and history stack', () => {
    it('manages single command execution, undo, and redo', async () => {
      let state = 0;

      const addCommand: Command = {
        name: 'Add 10',
        execute: () => { state += 10; },
        undo: () => { state -= 10; }
      };

      expect(commandManager.canUndo()).toBe(false);
      expect(commandManager.canRedo()).toBe(false);

      await commandManager.execute(addCommand);
      expect(state).toBe(10);
      expect(commandManager.canUndo()).toBe(true);
      expect(commandManager.canRedo()).toBe(false);
      expect(commandManager.getLastUndoName()).toBe('Add 10');

      const undoneCmd = await commandManager.undo();
      expect(undoneCmd?.name).toBe('Add 10');
      expect(state).toBe(0);
      expect(commandManager.canUndo()).toBe(false);
      expect(commandManager.canRedo()).toBe(true);

      const redoneCmd = await commandManager.redo();
      expect(redoneCmd?.name).toBe('Add 10');
      expect(state).toBe(10);
      expect(commandManager.canUndo()).toBe(true);
      expect(commandManager.canRedo()).toBe(false);
    });

    it('clears redo stack when executing a new command after undo', async () => {
      let val = 'initial';

      const cmd1: Command = {
        name: 'Set 1',
        execute: () => { val = '1'; },
        undo: () => { val = 'initial'; }
      };

      const cmd2: Command = {
        name: 'Set 2',
        execute: () => { val = '2'; },
        undo: () => { val = '1'; }
      };

      await commandManager.execute(cmd1);
      await commandManager.undo();
      expect(commandManager.canRedo()).toBe(true);

      // New branch in history
      await commandManager.execute(cmd2);
      expect(val).toBe('2');
      expect(commandManager.canRedo()).toBe(false);
    });

    it('handles transactions with commit and rollback', async () => {
      let log: string[] = [];

      // Test active transaction rollback
      commandManager.beginTransaction('Aborted Edit');
      await commandManager.execute({
        name: 'Sub 1',
        execute: () => { log.push('1'); },
        undo: () => { log = log.filter((x) => x !== '1'); }
      });
      await commandManager.execute({
        name: 'Sub 2',
        execute: () => { log.push('2'); },
        undo: () => { log = log.filter((x) => x !== '2'); }
      });
      expect(log).toEqual(['1', '2']);

      // Rolling back should undo active transaction commands in reverse order
      commandManager.rollbackTransaction();
      expect(log).toEqual([]);

      // Test commitTransaction places composite on undo stack
      commandManager.beginTransaction('Committed Batch');
      await commandManager.execute({
        name: 'Sub 3',
        execute: () => { log.push('3'); },
        undo: () => { log = log.filter((x) => x !== '3'); }
      });
      await commandManager.commitTransaction('Committed Batch');
      expect(commandManager.getLastUndoName()).toBe('Committed Batch');
      expect(commandManager.canUndo()).toBe(true);
    });

    it('notifies subscribers on state mutations', async () => {
      const listener = vi.fn();
      const unsubscribe = commandManager.subscribe(listener);

      const dummyCmd: Command = {
        name: 'Test',
        execute: () => {},
        undo: () => {}
      };

      await commandManager.execute(dummyCmd);
      expect(listener).toHaveBeenCalledTimes(1);

      await commandManager.undo();
      expect(listener).toHaveBeenCalledTimes(2);

      await commandManager.redo();
      expect(listener).toHaveBeenCalledTimes(3);

      unsubscribe();
      await commandManager.undo();
      expect(listener).toHaveBeenCalledTimes(3); // no new calls
    });
  });

  describe('shortcut isolation and isInteractiveTextInput', () => {
    it('identifies HTMLInputElement as interactive text input', () => {
      const input = document.createElement('input');
      input.type = 'text';
      expect(isInteractiveTextInput(input)).toBe(true);
    });

    it('identifies HTMLTextAreaElement as interactive text input', () => {
      const textarea = document.createElement('textarea');
      expect(isInteractiveTextInput(textarea)).toBe(true);
    });

    it('identifies contenteditable elements as interactive text input', () => {
      const editableDiv = document.createElement('div');
      editableDiv.contentEditable = 'true';
      expect(isInteractiveTextInput(editableDiv)).toBe(true);

      const childSpan = document.createElement('span');
      editableDiv.appendChild(childSpan);
      expect(isInteractiveTextInput(childSpan)).toBe(true);
    });

    it('returns false for non-text interactive and layout elements', () => {
      const div = document.createElement('div');
      const button = document.createElement('button');
      const canvas = document.createElement('canvas');

      expect(isInteractiveTextInput(div)).toBe(false);
      expect(isInteractiveTextInput(button)).toBe(false);
      expect(isInteractiveTextInput(canvas)).toBe(false);
      expect(isInteractiveTextInput(document.body)).toBe(false);
      expect(isInteractiveTextInput(null)).toBe(false);
    });

    it('prevents shortcut execution when keydown originates from text input', () => {
      const undoSpy = vi.spyOn(commandManager, 'undo');
      const listener = createGuardedShortcutListener(commandManager);

      const input = document.createElement('input');
      document.body.appendChild(input);

      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      });
      Object.defineProperty(event, 'target', { value: input, writable: false });

      listener(event);

      expect(undoSpy).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);

      document.body.removeChild(input);
      undoSpy.mockRestore();
    });

    it('allows shortcut execution and calls preventDefault when keydown originates from canvas or container', () => {
      const undoSpy = vi.spyOn(commandManager, 'undo');
      const listener = createGuardedShortcutListener(commandManager);

      const canvas = document.createElement('canvas');
      document.body.appendChild(canvas);

      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      });
      Object.defineProperty(event, 'target', { value: canvas, writable: false });

      listener(event);

      expect(undoSpy).toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(true);

      document.body.removeChild(canvas);
      undoSpy.mockRestore();
    });

    it('global window keydown listener ignores undo/redo when event originates in HTMLInputElement', () => {
      const undoSpy = vi.spyOn(commandManager, 'undo');
      const redoSpy = vi.spyOn(commandManager, 'redo');

      const input = document.createElement('input');
      document.body.appendChild(input);

      const undoEvent = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      });
      Object.defineProperty(undoEvent, 'target', { value: input, writable: false });
      window.dispatchEvent(undoEvent);

      expect(undoSpy).not.toHaveBeenCalled();
      expect(undoEvent.defaultPrevented).toBe(false);

      const redoEvent = new KeyboardEvent('keydown', {
        key: 'y',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      });
      Object.defineProperty(redoEvent, 'target', { value: input, writable: false });
      window.dispatchEvent(redoEvent);

      expect(redoSpy).not.toHaveBeenCalled();
      expect(redoEvent.defaultPrevented).toBe(false);

      document.body.removeChild(input);
      undoSpy.mockRestore();
      redoSpy.mockRestore();
    });

    it('global window keydown listener ignores undo when event originates in HTMLTextAreaElement', () => {
      const undoSpy = vi.spyOn(commandManager, 'undo');

      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);

      const event = new KeyboardEvent('keydown', {
        key: 'z',
        metaKey: true,
        bubbles: true,
        cancelable: true
      });
      Object.defineProperty(event, 'target', { value: textarea, writable: false });
      window.dispatchEvent(event);

      expect(undoSpy).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);

      document.body.removeChild(textarea);
      undoSpy.mockRestore();
    });

    it('global window keydown listener ignores undo when target is contentEditable element or child', () => {
      const undoSpy = vi.spyOn(commandManager, 'undo');

      const editable = document.createElement('div');
      editable.contentEditable = 'true';
      const child = document.createElement('span');
      editable.appendChild(child);
      document.body.appendChild(editable);

      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      });
      Object.defineProperty(event, 'target', { value: child, writable: false });
      window.dispatchEvent(event);

      expect(undoSpy).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);

      document.body.removeChild(editable);
      undoSpy.mockRestore();
    });
  });
});
