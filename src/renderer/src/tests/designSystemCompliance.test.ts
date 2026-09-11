import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Enforces the rules in DESIGN.md across the whole renderer.
 *
 * Deliberately does NOT keep a list of expected filenames. An earlier version
 * asserted that specific component files exist, which meant deleting dead code
 * broke the suite while a component that was never mounted passed it. This
 * checks rules, over whatever files are actually present.
 */

const rendererRoot = path.resolve(__dirname, '..');
const uiDirs = [
  path.join(rendererRoot, 'components'),
  path.join(rendererRoot, 'views'),
  path.join(rendererRoot, 'layouts')
];

const collectComponentFiles = (target: string | string[] = uiDirs): string[] => {
  const dirs = Array.isArray(target) ? target : [target];
  const found: string[] = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        found.push(...collectComponentFiles(full));
      } else if (entry.name.endsWith('.tsx')) {
        found.push(full);
      }
    }
  }
  return found;
};

interface Violation {
  file: string;
  line: number;
  match: string;
}

const findViolations = (regex: RegExp, files = collectComponentFiles()): Violation[] => {
  const violations: Violation[] = [];
  // `exec` only advances when the regex is global; without the flag this loop
  // would spin forever on the first match.
  const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf-8').split('\n');
    lines.forEach((text, idx) => {
      const re = new RegExp(regex.source, flags);
      let match: RegExpExecArray | null;
      while ((match = re.exec(text)) !== null) {
        if (match[0].length === 0) {
          re.lastIndex++;
          continue;
        }
        violations.push({ file: path.relative(rendererRoot, file), line: idx + 1, match: match[0] });
      }
    });
  }
  return violations;
};

const format = (violations: Violation[]): string =>
  violations.map((v) => `  ${v.file}:${v.line} -> ${v.match}`).join('\n');

/**
 * Elements that are circles by necessity, not by styling choice.
 * DESIGN.md §6.4 bans bubble-pill rounding on *containers*; it does not ask for
 * square loading spinners, square colour swatches or square status dots.
 *
 * Whether a given `rounded-full` is a legitimate circle or a bubble pill is a
 * design judgement a regex cannot make, so those two rules are enforced as a
 * RATCHET instead of a hard ban: the known count may not grow. Fixing them
 * lowers the number; adding new ones fails.
 */
const CIRCULAR_BASELINE = 17;
const COLOURED_SHADOW_BASELINE = 1;

describe('Design system compliance (DESIGN.md)', () => {
  it('finds component files to check', () => {
    expect(collectComponentFiles().length).toBeGreaterThan(20);
  });

  it('uses architectural geometry: no bubble-pill container rounding', () => {
    // DESIGN.md §5.5 / §6.4: structural containers, inputs, modals and cards are
    // rounded-none or rounded-xs. rounded-lg and above are banned outright.
    const violations = findViolations(/\brounded-(?:lg|xl|2xl|3xl)\b/);
    expect(violations, `Forbidden container rounding:\n${format(violations)}`).toHaveLength(0);
  });

  it('does not add new rounded-full usages (ratchet)', () => {
    const violations = findViolations(/\brounded-full\b/);
    expect(
      violations.length,
      `rounded-full count grew past the known baseline of ${CIRCULAR_BASELINE}. ` +
        `Either justify the new circle or use rounded-xs:\n${format(violations)}`
    ).toBeLessThanOrEqual(CIRCULAR_BASELINE);
  });

  it('reserves elevation for overlays and adds no new coloured glows (ratchet)', () => {
    // DESIGN.md §5.5 documents shadow-2xl for modal/overlay surfaces, so plain
    // elevation is allowed. Semantic-coloured glows (§6.1) and shadow-3xl are
    // not, but the existing status-dot glow is tracked rather than removed
    // silently.
    const violations = findViolations(
      /\bshadow-(?:emerald|indigo|purple|blue|rose|amber|cyan|violet|fuchsia)-\d+(?:\/\d+)?\b/,
    );
    expect(
      violations.length,
      `Coloured glow count grew past the known baseline of ${COLOURED_SHADOW_BASELINE}:\n${format(violations)}`
    ).toBeLessThanOrEqual(COLOURED_SHADOW_BASELINE);

    const hardViolations = findViolations(/\bshadow-(?:3xl|\[0_0_\d+px)/);
    expect(hardViolations, `Forbidden glow classes:\n${format(hardViolations)}`).toHaveLength(0);
  });

  it('uses no gradient or neon-aura backgrounds', () => {
    const violations = findViolations(
      /\bbg-gradient-to-[a-z]+\b|\bfrom-purple-\d|\bvia-indigo-\d|\bto-cyan-\d/,
    );
    expect(violations, `Forbidden gradients:\n${format(violations)}`).toHaveLength(0);
  });

  it('styles dark mode through the token layer, not hardcoded hex overrides', () => {
    // globals.css defines every surface/ink/action value per mode, so components
    // must not re-specify dark values inline.
    const violations = findViolations(/\bdark:(?:bg|text|border)-\[#/);
    expect(
      violations,
      `Hardcoded dark-mode colours (use tokens from globals.css):\n${format(violations)}`
    ).toHaveLength(0);
  });

  it('renders numeric readouts with tabular numerals', () => {
    // DESIGN.md §1.2, enforced once at the token layer rather than per component.
    const css = fs.readFileSync(path.join(rendererRoot, 'styles/globals.css'), 'utf-8');
    expect(css).toMatch(/font-variant-numeric:\s*tabular-nums/);
    expect(css).toMatch(/--font-mono/);
  });

  it('serves both light and dark palettes from one token definition', () => {
    const css = fs.readFileSync(path.join(rendererRoot, 'styles/globals.css'), 'utf-8');
    expect(css).toMatch(/:root\s*\{[\s\S]*?--canvas:/);
    expect(css).toMatch(/\.dark\s*\{[\s\S]*?--canvas:/);
  });

  it('bans serif typefaces in non-webfront surfaces', () => {
    // DESIGN.md §4.
    const violations = findViolations(/\bfont-serif\b|Source Serif/i);
    expect(violations, `Serif faces are prohibited:\n${format(violations)}`).toHaveLength(0);
  });
});
