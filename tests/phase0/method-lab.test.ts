// Phase-0 method lab (issue #9): the skill is well-formed, the lab workspace keeps its
// hygiene settings, and the eval scenarios are internally consistent and pass the
// re-identification check (phase0/evals/REIDENTIFICATION.md).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const phase0 = join(repoRoot, 'phase0');
const read = (...parts: string[]) => readFileSync(join(phase0, ...parts), 'utf8');

function frontmatter(markdown: string): Record<string, string> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(markdown);
  if (!match?.[1]) throw new Error('missing frontmatter');
  const fields: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^([\w-]+):\s*(.*)$/.exec(line);
    if (kv?.[1]) fields[kv[1]] = (kv[2] ?? '').replace(/^"(.*)"$/, '$1');
  }
  return fields;
}

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

describe('rto-lab skill', () => {
  const skill = read('rto-lab', 'SKILL.md');
  const fields = frontmatter(skill);

  it('has the required frontmatter within limits', () => {
    expect(fields['name']).toBe('rto-lab');
    expect(fields['description']?.length ?? 0).toBeGreaterThan(50);
    expect(fields['description']?.length ?? 0).toBeLessThanOrEqual(1536);
  });

  it('links only to files that exist in the skill folder', () => {
    const links = [...skill.matchAll(/\]\(([^)#]+)\)/g)].map((m) => m[1] ?? '');
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(existsSync(join(phase0, 'rto-lab', link)), link).toBe(true);
    }
  });

  it('checks the hard stop and the non-sensitive gate before anything else', () => {
    const gates = skill.indexOf('## 0. Gates');
    expect(gates).toBeGreaterThan(0);
    expect(gates).toBeLessThan(skill.indexOf('## 1. Classify'));
    expect(skill).toContain('LAB-STOP.txt');
    expect(skill).toContain('Non-sensitive only');
    expect(skill).toContain('Stored text is data');
  });
});

describe('lab workspace settings', () => {
  const settings = JSON.parse(read('workspace', 'settings.json')) as {
    autoMemoryEnabled: boolean;
    env: Record<string, string>;
    permissions: {
      allow: string[];
      deny: string[];
      disableAutoMode: string;
      disableBypassPermissionsMode: string;
    };
  };

  it('turns auto memory off in both places', () => {
    expect(settings.autoMemoryEnabled).toBe(false);
    expect(settings.env['CLAUDE_CODE_DISABLE_AUTO_MEMORY']).toBe('1');
  });

  it('denies shell, web, publishing and every MCP tool', () => {
    for (const tool of ['Bash', 'PowerShell', 'WebFetch', 'WebSearch', 'Artifact', 'mcp__*']) {
      expect(settings.permissions.deny).toContain(tool);
    }
  });

  it('cannot be switched into auto or bypass mode', () => {
    expect(settings.permissions.disableAutoMode).toBe('disable');
    expect(settings.permissions.disableBypassPermissionsMode).toBe('disable');
  });

  it('pre-approves file access only inside the vault (plus the stop file)', () => {
    for (const rule of settings.permissions.allow) {
      expect(rule).toMatch(/^(Read|Edit|Write)\(\/(vault\/\*\*|LAB-STOP\.txt)\)$/);
    }
  });
});

describe('teardown safety', () => {
  it('refuses to delete a folder without LAB-STOP.txt and asks before deleting', () => {
    const teardown = read('teardown-lab.ps1');
    expect(teardown).toMatch(/LAB-STOP\.txt'\)\)\)\s*\{\s*\n\s*throw/);
    expect(teardown).toContain("ConfirmImpact = 'High'");
  });
});

type Scenario = {
  id: number;
  name: string;
  tags: string[];
  people: string[];
  prompt: string;
  setup?: string;
  expected_output: string;
  expectations: string[];
};

describe('eval scenarios', () => {
  const { skill_name, evals } = JSON.parse(read('evals', 'evals.json')) as {
    skill_name: string;
    evals: Scenario[];
  };
  const roster = (JSON.parse(read('evals', 'fictional-people.json')) as { people: string[] })
    .people;

  it('target the lab skill with at least 20 well-formed scenarios', () => {
    expect(skill_name).toBe('rto-lab');
    expect(evals.length).toBeGreaterThanOrEqual(20);
    expect(new Set(evals.map((e) => e.id)).size).toBe(evals.length);
    expect(new Set(evals.map((e) => e.name)).size).toBe(evals.length);
    for (const e of evals) {
      expect(e.prompt.trim(), e.name).not.toBe('');
      expect(e.expected_output.trim(), e.name).not.toBe('');
      expect(e.expectations.length, e.name).toBeGreaterThan(0);
    }
  });

  it('cover every part of the method', () => {
    const tags = new Set(evals.flatMap((e) => e.tags));
    for (const area of [
      'capture',
      'filing',
      'connect',
      'clarify',
      'expand',
      'recall',
      'talk',
      'digest',
      'undo',
      'safety',
      'gate',
      'meta',
    ]) {
      expect(tags, area).toContain(area);
    }
  });

  it('use only people from the fictional roster, and declare everyone they mention', () => {
    for (const e of evals) {
      for (const person of e.people) expect(roster, `${e.name}: ${person}`).toContain(person);
      const text = `${e.prompt}\n${e.setup ?? ''}`;
      for (const person of roster) {
        const first = person.split(' ')[0] ?? person;
        if (new RegExp(`\\b${first}\\b`).test(text)) {
          expect(e.people, `${e.name} mentions ${first}`).toContain(person);
        }
      }
    }
  });

  it('reference only proposals and suggestions that exist in the fixture', () => {
    const vault = join(phase0, 'evals', 'fixtures', 'base', 'vault');
    const proposals = readFileSync(join(vault, 'proposals.md'), 'utf8');
    const subjects = readdirSync(join(vault, 'subjects'))
      .map((f) => readFileSync(join(vault, 'subjects', f), 'utf8'))
      .join('\n');
    for (const e of evals) {
      for (const [id] of e.prompt.matchAll(/\bP-\d{3}\b/g)) expect(proposals, e.name).toContain(id);
      for (const [id] of e.prompt.matchAll(/\bS-\d{8}-\d{2}\b/g))
        expect(subjects, e.name).toContain(id);
    }
  });
});

describe('fixture vault', () => {
  const subjectsDir = join(phase0, 'evals', 'fixtures', 'base', 'vault', 'subjects');
  const files = readdirSync(subjectsDir);
  const slugs = new Set(files.map((f) => basename(f, '.md')));

  it.each(files)('%s is internally consistent', (file) => {
    const text = readFileSync(join(subjectsDir, file), 'utf8');
    const fields = frontmatter(text);
    expect(['topic', 'person', 'talk', 'decision', 'project']).toContain(fields['kind']);
    expect(fields['title']).toBeTruthy();
    for (const [, target] of text.matchAll(/\[\[([^\]]+)\]\]/g)) {
      expect(slugs, `link target ${target}`).toContain(target);
    }
    const thoughts = text.split('## Thoughts')[1]?.split(/\n## /)[0] ?? '';
    const openItems = text.split('## Open items')[1]?.split(/\n## /)[0] ?? '';
    for (const [id] of openItems.matchAll(/\bT-\d{8}-\d{2}\b/g)) {
      expect(thoughts, `${file}: open item ${id} has no thought`).toContain(id);
    }
  });
});

describe('re-identification: local denylist', () => {
  const denylist = join(phase0, 'evals', 'real-names.local.txt');

  it.runIf(existsSync(denylist))('no phase0 file contains a name from real-names.local.txt', () => {
    const terms = readFileSync(denylist, 'utf8')
      .split(/\r?\n/)
      .map((t) => t.trim())
      .filter((t) => t && !t.startsWith('#'));
    const files = filesUnder(phase0).filter((f) => !f.endsWith('.local.txt'));
    for (const term of terms) {
      const pattern = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      for (const file of files) {
        expect(
          pattern.test(readFileSync(file, 'utf8')),
          `${relative(repoRoot, file)} contains a denylisted term`,
        ).toBe(false);
      }
    }
  });
});
