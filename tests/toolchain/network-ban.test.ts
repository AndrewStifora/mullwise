// Proves the offline boundary in biome.json actually fires, so a Biome upgrade or a
// config typo can't silently disable it. Shipped code lives under packages/ and plugin/.
//
// Biome prints no lint diagnostics in stdin mode, so each case lints a real file in a
// temp directory that holds a copy of the repo's biome.json.
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const biomeBin = join(repoRoot, 'node_modules', '@biomejs', 'biome', 'bin', 'biome');

let sandbox = '';
let counter = 0;

beforeAll(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'mullwise-biome-'));
  copyFileSync(join(repoRoot, 'biome.json'), join(sandbox, 'biome.json'));
});

afterAll(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

function lint(relativeDir: string, source: string): { status: number | null; output: string } {
  counter += 1;
  const relativePath = `${relativeDir}/probe${counter}.ts`;
  const file = join(sandbox, relativePath);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, source);
  const result = spawnSync(
    process.execPath,
    [biomeBin, 'lint', '--colors=off', '--vcs-enabled=false', relativePath],
    { cwd: sandbox, encoding: 'utf8' },
  );
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

describe('offline boundary', () => {
  it('accepts ordinary code in shipped packages (control)', () => {
    const result = lint(
      'packages/probe/src',
      "import { readFileSync } from 'node:fs';\n\nexport const read = (p: string) => readFileSync(p, 'utf8');\n",
    );
    expect(result.output).not.toContain('noRestricted');
    expect(result.status).toBe(0);
  });

  it.each([
    ["import { request } from 'node:http';\nexport const r = request;\n", 'noRestrictedImports'],
    ["import { connect } from 'net';\nexport const c = connect;\n", 'noRestrictedImports'],
    [
      "import { spawn } from 'node:child_process';\nexport const s = spawn;\n",
      'noRestrictedImports',
    ],
    ["export const get = () => fetch('https://example.invalid');\n", 'noRestrictedGlobals'],
    ["export const ws = () => new WebSocket('wss://example.invalid');\n", 'noRestrictedGlobals'],
  ])('rejects %j in shipped code', (source, rule) => {
    for (const dir of ['packages/probe/src', 'plugin/probe']) {
      const result = lint(dir, source);
      expect(result.output).toContain(`lint/style/${rule}`);
      expect(result.status).not.toBe(0);
    }
  });

  it('does not restrict code outside shipped packages (e.g. these tests)', () => {
    const result = lint(
      'tests/probe',
      "export const get = () => fetch('https://example.invalid');\n",
    );
    expect(result.output).not.toContain('noRestricted');
    expect(result.status).toBe(0);
  });
});
