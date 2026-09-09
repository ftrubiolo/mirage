import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { commandManager, isInteractiveTextInput, Command } from '@renderer/utils/commandManager';

describe('Adversarial Keyboard Shortcut Isolation Stress Harness', () => {
  let undoSpy: any;
  let redoSpy: any;

  beforeEach(() => {
    undoSpy = vi.spyOn(commandManager, 'undo').mockImplementation(async () => null);
    redoSpy = vi.spyOn(commandManager, 'redo').mockImplementation(async () => null);
  });

  afterEach(() => {
    undoSpy.mockRestore();
    redoSpy.mockRestore();
    document.body.innerHTML = '';
  });

  const testCases = [
    { name: 'input[type=text]', create: () => { const el = document.createElement('input'); el.type = 'text'; return el; } },
    { name: 'input[type=password]', create: () => { const el = document.createElement('input'); el.type = 'password'; return el; } },
    { name: 'input[type=number]', create: () => { const el = document.createElement('input'); el.type = 'number'; return el; } },
    { name: 'input[type=search]', create: () => { const el = document.createElement('input'); el.type = 'search'; return el; } },
    { name: 'textarea', create: () => document.createElement('textarea') },
    { name: 'div[contenteditable=true]', create: () => { const el = document.createElement('div'); el.contentEditable = 'true'; return el; } },
    {
      name: 'child inside contenteditable',
      create: () => {
        const parent = document.createElement('div');
        parent.contentEditable = 'true';
        const child = document.createElement('span');
        parent.appendChild(child);
        document.body.appendChild(parent);
        return child;
      }
    },
    {
      name: 'deep nested child inside contenteditable',
      create: () => {
        const root = document.createElement('div');
        root.contentEditable = 'true';
        const p = document.createElement('p');
        const em = document.createElement('em');
        const strong = document.createElement('strong');
        em.appendChild(strong);
        p.appendChild(em);
        root.appendChild(p);
        document.body.appendChild(root);
        return strong;
      }
    }
  ];

  const shortcutCombinations = [
    { name: 'Ctrl+Z (Undo)', key: 'z', ctrlKey: true, metaKey: false, shiftKey: false },
    { name: 'Ctrl+Shift+Z (Redo)', key: 'z', ctrlKey: true, metaKey: false, shiftKey: true },
    { name: 'Ctrl+Y (Redo)', key: 'y', ctrlKey: true, metaKey: false, shiftKey: false },
    { name: 'Meta+Z (Cmd+Z Undo)', key: 'z', ctrlKey: false, metaKey: true, shiftKey: false },
    { name: 'Meta+Shift+Z (Cmd+Shift+Z Redo)', key: 'z', ctrlKey: false, metaKey: true, shiftKey: true },
    { name: 'Meta+Y (Cmd+Y Redo)', key: 'y', ctrlKey: false, metaKey: true, shiftKey: false },
    { name: 'Ctrl+z lowercase', key: 'Z', ctrlKey: true, metaKey: false, shiftKey: false },
    { name: 'Ctrl+y uppercase', key: 'Y', ctrlKey: true, metaKey: false, shiftKey: false }
  ];

  describe('isInteractiveTextInput oracle', () => {
    testCases.forEach(({ name, create }) => {
      it(`evaluates ${name} as interactive text input`, () => {
        const el = create();
        expect(isInteractiveTextInput(el)).toBe(true);
      });
    });

    it('evaluates non-input elements as non-interactive', () => {
      const nonInputs = [
        document.createElement('div'),
        document.createElement('span'),
        document.createElement('body'),
        document.createElement('canvas'),
        document.createElement('button'),
        document.createElement('header'),
        document.createElement('aside'),
        null,
        undefined
      ];

      for (const el of nonInputs) {
        expect(isInteractiveTextInput(el as any)).toBe(false);
      }
    });
  });

  describe('Interactive text input shortcut isolation (both element.dispatchEvent and window.dispatchEvent)', () => {
    testCases.forEach(({ name, create }) => {
      shortcutCombinations.forEach(({ name: comboName, key, ctrlKey, metaKey, shiftKey }) => {
        it(`suppresses ${comboName} and preserves default on ${name} via direct bubbling dispatch`, () => {
          const el = create();
          if (!el.parentElement) {
            document.body.appendChild(el);
          }

          const event = new KeyboardEvent('keydown', {
            key,
            ctrlKey,
            metaKey,
            shiftKey,
            bubbles: true,
            cancelable: true
          });

          // In happy-dom, dispatching on el with bubbles: true propagates to window
          el.dispatchEvent(event);

          expect(undoSpy).not.toHaveBeenCalled();
          expect(redoSpy).not.toHaveBeenCalled();
          expect(event.defaultPrevented).toBe(false);
        });

        it(`suppresses ${comboName} and preserves default on ${name} via window dispatch with target`, () => {
          const el = create();
          if (!el.parentElement) {
            document.body.appendChild(el);
          }

          const event = new KeyboardEvent('keydown', {
            key,
            ctrlKey,
            metaKey,
            shiftKey,
            bubbles: true,
            cancelable: true
          });
          Object.defineProperty(event, 'target', { value: el, writable: false });

          window.dispatchEvent(event);

          expect(undoSpy).not.toHaveBeenCalled();
          expect(redoSpy).not.toHaveBeenCalled();
          expect(event.defaultPrevented).toBe(false);
        });
      });
    });
  });

  describe('Non-input elements execution & defaultPrevented enforcement', () => {
    const nonInputElements = [
      { name: 'div', create: () => document.createElement('div') },
      { name: 'body', create: () => document.body },
      { name: 'canvas', create: () => document.createElement('canvas') },
      { name: 'button', create: () => document.createElement('button') },
      { name: 'aside', create: () => document.createElement('aside') }
    ];

    nonInputElements.forEach(({ name, create }) => {
      it(`triggers undo and calls preventDefault on ${name} for Ctrl+Z`, () => {
        const el = create();
        if (el !== document.body && !el.parentElement) {
          document.body.appendChild(el);
        }

        const event = new KeyboardEvent('keydown', {
          key: 'z',
          ctrlKey: true,
          bubbles: true,
          cancelable: true
        });

        el.dispatchEvent(event);

        expect(undoSpy).toHaveBeenCalledTimes(1);
        expect(redoSpy).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBe(true);
      });

      it(`triggers redo and calls preventDefault on ${name} for Ctrl+Y`, () => {
        const el = create();
        if (el !== document.body && !el.parentElement) {
          document.body.appendChild(el);
        }

        const event = new KeyboardEvent('keydown', {
          key: 'y',
          ctrlKey: true,
          bubbles: true,
          cancelable: true
        });

        el.dispatchEvent(event);

        expect(redoSpy).toHaveBeenCalledTimes(1);
        expect(undoSpy).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBe(true);
      });

      it(`triggers redo and calls preventDefault on ${name} for Ctrl+Shift+Z`, () => {
        const el = create();
        if (el !== document.body && !el.parentElement) {
          document.body.appendChild(el);
        }

        const event = new KeyboardEvent('keydown', {
          key: 'z',
          ctrlKey: true,
          shiftKey: true,
          bubbles: true,
          cancelable: true
        });

        el.dispatchEvent(event);

        expect(redoSpy).toHaveBeenCalledTimes(1);
        expect(undoSpy).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBe(true);
      });
    });
  });
});
