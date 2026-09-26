# Spikes (issue #7)

Short, throwaway experiments that settle platform unknowns before P1a. Each has an ADR with
the outcome and a fallback. Spikes are **not** product code, so the offline boundary in
`biome.json` doesn't apply here.

| Spike | Question | Run | ADR | Status |
|---|---|---|---|---|
| **S1** `s1-plugin/` | Plugin enablement, tool prefix, server environment, `requiresUserInteraction`, text-only channel, deny rules | `node spikes/s1-plugin/run.mjs --enablement` (needs `claude auth login`), plus `s1-plugin/code-tab-checklist.md` | [0005](../docs/architecture/adr/0005-packaging-workspace-scoped-plugin.md) | Docs established. Runs pending. |
| **S2** `s2-keyring/` | OS keychain through `@napi-rs/keyring` from fresh, stripped and empty environments | `node spikes/s2-keyring/run.mjs` | [0002](../docs/architecture/adr/0002-key-custody-os-keychain-and-recovery-code.md) | ✅ Windows |
| **S3** `s3-sqlite/` | `node:sqlite` with several processes, epoch re-checks and a crashed lock holder | `node spikes/s3-sqlite/run.mjs --writers 2 --events 3000 --crash` | [0001](../docs/architecture/adr/0001-sealed-event-log-in-node-sqlite.md) | ✅ Windows, CI on both OSes |

S2 and S3 also run on every PR as regression checks (`tests/spikes/`).

## Side effects, and how each spike cleans up

- **S1** touches:
  - temp workspaces
  - a canary file in `~/AppData/Local/rto` (the future vault location)
  - with `--enablement`, a local marketplace plus a project-scope install

  All of these are removed at the end, including each temp workspace's `~/.claude/projects` session folder. Raw
  results go to `%TEMP%\rto-spike-s1-results.json` and are **never committed**: they contain environment variable
  names from the machine.
- **S2** writes one credential (`mullwise-spike-s2`, random account) and always deletes it.
- **S3** uses a temp directory only.
