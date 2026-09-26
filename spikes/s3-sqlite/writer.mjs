// S3 child process: appends events the way @rto/store will. Each append is one
// BEGIN IMMEDIATE transaction that re-reads the epoch token and the tail seq, then
// inserts seq+1. Prints one JSON stats line to stdout when done.
import { randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const [dbPath, writerId, countArg, holdArg] = process.argv.slice(2);
const count = Number(countArg);
const holdMs = Number(holdArg ?? 0); // >0: hold the write lock, used by the crash probe

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA busy_timeout = 5000; PRAGMA secure_delete = ON; PRAGMA temp_store = MEMORY;');

const readEpoch = db.prepare("SELECT v AS epoch FROM meta WHERE k = 'epoch'");
const readTail = db.prepare('SELECT COALESCE(MAX(seq), 0) AS tail FROM events');
const insert = db.prepare('INSERT INTO events (seq, writer, payload) VALUES (?, ?, ?)');

let epoch = readEpoch.get().epoch;
let epochReloads = 0;
let busyErrors = 0;
const latencies = [];
let firstAt = 0;
let lastAt = 0;

if (holdMs > 0) {
  // Crash probe: take the write lock and never commit; the parent kills us.
  db.exec('BEGIN IMMEDIATE');
  insert.run(readTail.get().tail + 1, writerId, randomBytes(256));
  console.log(JSON.stringify({ writerId, holding: true }));
  setTimeout(() => {}, holdMs);
} else {
  for (let i = 0; i < count; i++) {
    const t0 = performance.now();
    if (!firstAt) firstAt = Date.now();
    try {
      db.exec('BEGIN IMMEDIATE');
      const current = readEpoch.get().epoch;
      if (current !== epoch) {
        epoch = current; // a maintenance run (restore/rekey) happened: reload state
        epochReloads++;
      }
      insert.run(readTail.get().tail + 1, writerId, randomBytes(256));
      db.exec('COMMIT');
    } catch (error) {
      if (db.isTransaction) db.exec('ROLLBACK');
      if (String(error?.message).includes('database is locked')) busyErrors++;
      else throw error;
      i--; // retry this append
      continue;
    }
    latencies.push(performance.now() - t0);
  }
  db.close();
  lastAt = Date.now();
  console.log(
    JSON.stringify({
      writerId,
      appended: latencies.length,
      epochReloads,
      busyErrors,
      firstAt,
      lastAt,
      latencies,
    }),
  );
}
