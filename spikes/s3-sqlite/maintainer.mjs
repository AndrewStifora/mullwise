// S3 child process standing in for the `rto` CLI: while writers append, it runs
// restore/rekey-style maintenance transactions that set a new epoch token, plus
// reads and WAL checkpoints. Prints one JSON stats line when done.
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const [dbPath, roundsArg, gapArg] = process.argv.slice(2);
const rounds = Number(roundsArg);
const gapMs = Number(gapArg);

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA busy_timeout = 5000; PRAGMA secure_delete = ON; PRAGMA temp_store = MEMORY;');
const bump = db.prepare("UPDATE meta SET v = ? WHERE k = 'epoch'");
const count = db.prepare('SELECT COUNT(*) AS n FROM events');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const latencies = [];
const bumpTimes = [];
let checkpoints = 0;

for (let i = 0; i < rounds; i++) {
  await sleep(gapMs);
  const t0 = performance.now();
  db.exec('BEGIN IMMEDIATE');
  count.get();
  bump.run(randomUUID());
  db.exec('COMMIT');
  bumpTimes.push(Date.now());
  latencies.push(performance.now() - t0);
  if (i % 3 === 2) {
    db.prepare('PRAGMA wal_checkpoint(PASSIVE)').get();
    checkpoints++;
  }
}
db.close();
console.log(
  JSON.stringify({ writerId: 'maintainer', epochBumps: rounds, bumpTimes, checkpoints, latencies }),
);
