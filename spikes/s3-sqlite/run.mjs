// Spike S3 (issue #7): node:sqlite with several processes writing one WAL database.
//
//   node spikes/s3-sqlite/run.mjs [--writers 2] [--events 500] [--rounds 20] [--crash] [--json]
//
// Checks: no lost or duplicated appends, contiguous seq, epoch changes observed by
// writers, no surfaced SQLITE_BUSY, integrity_check ok, pragmas applied, and (--crash)
// that a writer killed while holding the write lock doesn't block or corrupt anything.
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    writers: { type: 'string', default: '2' },
    events: { type: 'string', default: '500' },
    rounds: { type: 'string', default: '20' },
    crash: { type: 'boolean', default: false },
    json: { type: 'boolean', default: false },
  },
});
const writers = Number(values.writers);
const events = Number(values.events);
const rounds = Number(values.rounds);
const here = new URL('.', import.meta.url);

const dir = mkdtempSync(join(tmpdir(), 'mullwise-s3-'));
const dbPath = join(dir, 'rto.db');

const setup = new DatabaseSync(dbPath);
setup.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE meta (k TEXT PRIMARY KEY, v TEXT NOT NULL);
  CREATE TABLE events (seq INTEGER PRIMARY KEY, writer TEXT NOT NULL, payload BLOB NOT NULL);
`);
setup.prepare("INSERT INTO meta (k, v) VALUES ('epoch', ?)").run(randomUUID());
setup.close();

function run(script, args, { untilHolding = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [fileURLToPath(new URL(script, here)), ...args], {
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    let out = '';
    child.stdout.on('data', (chunk) => {
      out += chunk;
      if (untilHolding && out.includes('"holding":true')) resolve({ child });
    });
    child.on('error', reject);
    child.on('exit', (code, signal) =>
      code === 0
        ? resolve(JSON.parse(out.trim().split('\n').pop()))
        : resolve({ exit: code, signal }),
    );
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const started = performance.now();

// Crash probe: a writer takes the write lock and never commits. The real writers and
// the maintainer start while it holds the lock, so they are already waiting (busy_timeout)
// when it is killed. They must then proceed, and its uncommitted row must vanish.
let crasher = null;
if (values.crash)
  crasher = (await run('writer.mjs', [dbPath, 'crasher', '1', '60000'], { untilHolding: true }))
    .child;

const pending = Promise.all([
  ...Array.from({ length: writers }, (_, i) =>
    run('writer.mjs', [dbPath, `w${i + 1}`, String(events)]),
  ),
  run('maintainer.mjs', [dbPath, String(rounds), '15']),
]);

let crash = null;
if (crasher) {
  await sleep(500);
  crasher.kill('SIGKILL');
  await new Promise((r) => crasher.on('exit', r));
  crash = { heldLockThenKilledAfterMs: Math.round(performance.now() - started) };
}

const results = await pending;
const wallMs = performance.now() - started;

const check = new DatabaseSync(dbPath);
const total = check
  .prepare('SELECT COUNT(*) AS n, MIN(seq) AS lo, MAX(seq) AS hi FROM events')
  .get();
const perWriter = Object.fromEntries(
  check
    .prepare('SELECT writer, COUNT(*) AS n FROM events GROUP BY writer')
    .all()
    .map((r) => [r.writer, r.n]),
);
const integrity = check.prepare('PRAGMA integrity_check').get().integrity_check;
const journal = check.prepare('PRAGMA journal_mode').get().journal_mode;
check.close();
rmSync(dir, { recursive: true, force: true });

const appendLatencies = results
  .filter((r) => r.writerId?.startsWith('w'))
  .flatMap((r) => r.latencies);
const pct = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? Number(s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(2)) : null;
};

const expected = writers * events;
const bumpTimes = results.find((r) => r.writerId === 'maintainer')?.bumpTimes ?? [];
const writerResults = results.filter((r) => r.writerId?.startsWith('w'));
// A writer must reload whenever a maintenance run landed while it was appending.
const epochObservation = Object.fromEntries(
  writerResults.map((r) => {
    const bumpsDuring = bumpTimes.filter((t) => t > r.firstAt && t < r.lastAt).length;
    return [r.writerId, { bumpsDuring, reloads: r.epochReloads }];
  }),
);
const report = {
  platform: `${process.platform}-${process.arch}`,
  node: process.version,
  sqlite: process.versions.sqlite,
  writers,
  eventsPerWriter: events,
  maintenanceRounds: rounds,
  crashProbe: crash,
  wallMs: Math.round(wallMs),
  appendsPerSec: Math.round(expected / (wallMs / 1000)),
  appendLatencyMs: {
    p50: pct(appendLatencies, 0.5),
    p95: pct(appendLatencies, 0.95),
    max: pct(appendLatencies, 1),
  },
  epochObservation,
  busyErrorsSurfaced: results.reduce((n, r) => n + (r.busyErrors ?? 0), 0),
  journalMode: journal,
  integrity,
  checks: {
    noLostOrDuplicateAppends: total.n === expected,
    contiguousSeq: total.lo === 1 && total.hi === total.n,
    eachWriterComplete: Array.from(
      { length: writers },
      (_, i) => perWriter[`w${i + 1}`] === events,
    ).every(Boolean),
    crasherLeftNoRow: !values.crash || perWriter.crasher === undefined,
    writersReloadedOnEpochChange: Object.values(epochObservation).every((o) =>
      o.bumpsDuring === 0 ? o.reloads === 0 : o.reloads >= 1 && o.reloads <= o.bumpsDuring,
    ),
    integrityOk: integrity === 'ok',
    walMode: journal === 'wal',
  },
};
report.pass = Object.values(report.checks).every(Boolean) && report.busyErrorsSurfaced === 0;

console.log(values.json ? JSON.stringify(report) : JSON.stringify(report, null, 2));
process.exit(report.pass ? 0 : 1);
