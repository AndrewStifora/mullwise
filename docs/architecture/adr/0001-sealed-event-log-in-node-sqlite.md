# ADR-0001: Sealed event log in `node:sqlite`

- **Status:** Accepted
- **Date:** 2026-09-26
- **Evidence:** Spike S3 (#7): `spikes/s3-sqlite/`, and a regression check in CI on Ubuntu and Windows (`tests/spikes/s3-sqlite.test.ts`)

## Context

Several processes write the same vault:
- the MCP server in each Claude session
- the `rto` CLI (init, add, backup, recover)
- later, maintenance runs (restore, rekey, forget) that may happen while servers are live

The store must never lose, duplicate or reorder an append. Maintenance must be visible to
running writers. `node:sqlite` has been a release candidate since Node 24.15, and it avoids a
native database module.

## Decision

- **Records.** Every event is one BLOB row, sealed with AES-256-GCM per record (ADR-0002), in `<vaultDir>\vault\rto.db`.
- **Settings:** `journal_mode=WAL`, `busy_timeout=5000`, `secure_delete=ON`, `temp_store=MEMORY`.
- **Appends.** Each append runs in `BEGIN IMMEDIATE`, re-reads the `epoch` token and the tail `seq`, then inserts `seq+1`.
  A changed epoch means a maintenance run happened, so the writer reloads its state before appending.
- **Maintenance.** Restore, rekey and compaction run in one transaction and set a new random epoch. A restore is never
  a file swap.
- **No snapshots** until benchmarks require them. A JSONL store stays a documented alternative only.

## Evidence: spike S3 (2026-09-26, Windows 11, Node 24.21.0, SQLite 3.53.4)

Two writer processes and one maintainer process (standing in for the CLI) run concurrently. The maintainer bumps the epoch
and runs `wal_checkpoint(PASSIVE)` every third round.

| Run | Appends | Throughput | Append latency p50 / p95 / max | Busy errors surfaced | Result |
|---|---|---|---|---|---|
| Baseline | 2 × 3,000 + 40 maintenance transactions | 1,882/s | 0.29 / 0.46 / 769 ms | 0 | pass |
| Crash probe | Same, plus a third writer killed while holding the write lock | 1,553/s | 0.29 / 0.50 / 1,524 ms | 0 | pass |

Every check passed in both runs:
- no lost or duplicated appends
- contiguous `seq` from 1
- each writer complete
- `integrity_check = ok`
- WAL mode applied
- every writer reloaded when an epoch bump landed during its run. Reloads can be fewer than bumps, because several
  bumps between two appends collapse into one reload, which is correct.
- the killed writer's uncommitted row vanished, and the writers already waiting on the lock carried on once the lock was released

**Tail latency.** Rare outliers of 0.8–1.5 s appear, including the deliberate lock hold in the crash probe. They're probably
checkpoints or Defender scanning the new file. That's acceptable for interactive capture. P1b's nightly performance job
tracks it.

## Consequences

- ACID multi-process writes and no native database module.
- **Node ≥ 24.15** is required (`engines`, `.node-version` 24.21.0). Node 26 is added to CI once it's LTS (2026-10-28).
- Every writer must treat an epoch change as "reload before append". This is a unit and model-based test
  target in #13.
- Metadata is visible on disk: row counts, sizes and timing. Content and structure are sealed (ADR-0002).
- There's no undo before a compaction base.

## Fallback

If `node:sqlite` regresses while it's a release candidate:
- The `EventStore` port hides the engine, so `better-sqlite3` can drop in behind it.
- Its main cost used to be adding a native module. ADR-0002 already ships one (the keychain), so that cost is now lower.
- The JSONL-plus-lockfile store remains the zero-dependency last resort.
