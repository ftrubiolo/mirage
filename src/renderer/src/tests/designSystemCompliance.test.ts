import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Design System Compliance in src/renderer/src/components/Agent/', () => {
  const agentDir = path.resolve(__dirname, '../components/Agent');

  const getAgentComponentFiles = (): string[] => {
    return fs.readdirSync(agentDir).filter((file) => file.endsWith('.tsx') || file.endsWith('.ts'));
  };

  it('contains expected modern Agent Studio components', () => {
    const files = getAgentComponentFiles();
    expect(files.length).toBeGreaterThanOrEqual(10);

    const requiredComponents = [
      'AgentStudioView.tsx',
      'ChatMessageList.tsx',
      'ChatInputArea.tsx',
      'ContextVaultDrawer.tsx',
      'AuditLogViewer.tsx',
      'ActionApprovalModal.tsx',
      'EmbeddedViewport.tsx',
      'ExecutionTelemetryCard.tsx',
      'PresetSelector.tsx',
      'McpServerManager.tsx'
    ];

    for (const required of requiredComponents) {
      expect(files, `Missing expected component ${required}`).toContain(required);
    }
  });

  it('verifies 0 forbidden rounded classes (rounded-lg, rounded-xl, rounded-2xl, rounded-full) across all Agent components', () => {
    const files = getAgentComponentFiles();
    const forbiddenRoundedRegex = /\brounded-(?:lg|xl|2xl|3xl|full)\b/g;

    const violations: { file: string; line: number; match: string }[] = [];

    for (const file of files) {
      const fullPath = path.join(agentDir, file);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((lineText, idx) => {
        let match: RegExpExecArray | null;
        while ((match = forbiddenRoundedRegex.exec(lineText)) !== null) {
          violations.push({
            file,
            line: idx + 1,
            match: match[0]
          });
        }
      });
    }

    expect(
      violations,
      `Found forbidden rounded classes in Agent components:\n${violations
        .map((v) => `  ${v.file}:${v.line} -> ${v.match}`)
        .join('\n')}`
    ).toHaveLength(0);
  });

  it('verifies 0 glowing neon aura shadows or heavy drop shadows in Agent components', () => {
    const files = getAgentComponentFiles();
    const forbiddenShadowRegex = /\bshadow-(?:emerald|indigo|purple|blue|rose|amber|cyan)-\d+(?:\/\d+)?\b|\bshadow-(?:lg|xl|2xl)\b/g;

    const violations: { file: string; line: number; match: string }[] = [];

    for (const file of files) {
      const fullPath = path.join(agentDir, file);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((lineText, idx) => {
        let match: RegExpExecArray | null;
        while ((match = forbiddenShadowRegex.exec(lineText)) !== null) {
          violations.push({
            file,
            line: idx + 1,
            match: match[0]
          });
        }
      });
    }

    expect(
      violations,
      `Found forbidden shadows in Agent components:\n${violations
        .map((v) => `  ${v.file}:${v.line} -> ${v.match}`)
        .join('\n')}`
    ).toHaveLength(0);
  });

  it('verifies 0 playful sparkle/magic iconography (Sparkles or ✨) in Agent components', () => {
    const files = getAgentComponentFiles();
    const sparkleRegex = /<Sparkles\b|import.*Sparkles.*from|✨/g;

    const violations: { file: string; line: number; match: string }[] = [];

    for (const file of files) {
      const fullPath = path.join(agentDir, file);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((lineText, idx) => {
        let match: RegExpExecArray | null;
        while ((match = sparkleRegex.exec(lineText)) !== null) {
          violations.push({
            file,
            line: idx + 1,
            match: match[0]
          });
        }
      });
    }

    expect(
      violations,
      `Found sparkle/magic iconography anti-patterns in Agent components:\n${violations
        .map((v) => `  ${v.file}:${v.line} -> ${v.match}`)
        .join('\n')}`
    ).toHaveLength(0);
  });

  it('verifies that all rounded classes in Agent components conform to DESIGN.md rectilinear standards', () => {
    const files = getAgentComponentFiles();
    // Matches any rounded class that is NOT rounded-none, rounded-xs, or rounded-sm
    const nonCompliantRadiusRegex = /\brounded-(?!none|xs|sm)[a-z0-9]+\b/g;

    const violations: { file: string; line: number; match: string }[] = [];

    for (const file of files) {
      const fullPath = path.join(agentDir, file);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((lineText, idx) => {
        let match: RegExpExecArray | null;
        while ((match = nonCompliantRadiusRegex.exec(lineText)) !== null) {
          violations.push({
            file,
            line: idx + 1,
            match: match[0]
          });
        }
      });
    }

    expect(
      violations,
      `Found non-compliant radius classes in Agent components:\n${violations
        .map((v) => `  ${v.file}:${v.line} -> ${v.match}`)
        .join('\n')}`
    ).toHaveLength(0);
  });
});
