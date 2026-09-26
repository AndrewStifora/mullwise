// Guards the runtime assumptions the design depends on (docs/architecture/roadmap.md):
// the Node floor from `engines`, node:sqlite (RC since 24.15) and WebCrypto AES-GCM.
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fc, test } from '@fast-check/vitest';
import { describe, expect, it } from 'vitest';

const repoRoot = new URL('../../', import.meta.url);
const enginesFloor = (
  JSON.parse(readFileSync(new URL('package.json', repoRoot), 'utf8')) as {
    engines: { node: string };
  }
).engines.node.replace('>=', '');
const pinnedVersion = readFileSync(new URL('.node-version', repoRoot), 'utf8').trim();

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return Math.sign(diff);
  }
  return 0;
}

describe('Node runtime', () => {
  it(`is at least the engines floor (>=${enginesFloor})`, () => {
    expect(compareVersions(process.versions.node, enginesFloor)).toBeGreaterThanOrEqual(0);
  });

  it.runIf(process.env['CI'] === 'true')('matches .node-version exactly in CI', () => {
    expect(process.versions.node).toBe(pinnedVersion);
  });
});

describe('node:sqlite', () => {
  it('opens a file database in WAL mode with a busy timeout', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mullwise-runtime-'));
    try {
      const db = new DatabaseSync(join(dir, 'probe.db'));
      db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
      expect(db.prepare('PRAGMA journal_mode').get()).toEqual({ journal_mode: 'wal' });
      expect(db.prepare('PRAGMA busy_timeout').get()).toEqual({ timeout: 5000 });
      db.exec('CREATE TABLE t (v BLOB NOT NULL)');
      db.prepare('INSERT INTO t (v) VALUES (?)').run(new Uint8Array([1, 2, 3]));
      const row = db.prepare('SELECT v FROM t').get() as { v: Uint8Array };
      expect([...row.v]).toEqual([1, 2, 3]);
      db.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('WebCrypto', () => {
  test.prop([fc.uint8Array({ maxLength: 4096 })], { numRuns: 50 })(
    'AES-256-GCM round-trips arbitrary bytes',
    async (plaintext) => {
      const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
        'encrypt',
        'decrypt',
      ]);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
      expect(new Uint8Array(decrypted)).toEqual(plaintext);
    },
  );
});
