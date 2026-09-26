# Roadmap and architecture summary

The full design is in [`design-plan.json`](design-plan.json). It covers the plan, ADR drafts,
backlog and critique changes, and was produced by a judge panel: 3 proposals, 2 judges, a synthesis, a critic and a final revision.
Where it conflicts with the **Decisions** below, the decisions win.

## Shape

The product ships as one Claude Code plugin, `mullwise` (codename RTO). It is enabled only in a dedicated workspace
folder.

| Part | Role |
|---|---|
| **Skill** | The organizing method: parse `subject: detail`, file, link, expand, recall. Claude makes every judgement on your subscription. |
| **stdio MCP server** | Deterministic storage, retrieval, validation, provenance and rendering. It makes no network calls and holds no API key. |
| **`rto` CLI** | Admin work only a human should do: init, backup, verify, recover. |
| **Encrypted vault** | A sealed event log in `node:sqlite`. Each record is AES-256-GCM with AAD and padding. |

Tool results are framed as data (`<rto:data>`) to resist prompt injection stored in notes.

## Phases

| Phase | Outcome | Estimate |
|---|---|---|
| P0 | CI and required checks, spikes S1–S3, ADRs, and the **method trial** | 2–3 days + trial ≤10 days |
| P1a | Daily use: capture, search, recall (brief/checklist/overview), mark items | ~weeks 2–3 |
| P1b | Cross-refs, subject suggestions with approval, undo, views, weekly digest, evals and red team | ~weeks 4–5 |
| P1.5 | Desktop Chat, rekey and forget, Remote Control runbook, deep scheduled tests | ~1 week |
| P2a | Calendar, Trello/Dayhand and Pocket through existing connectors | 3–4 days |
| P2b | Hosted write-only sealed inbox for phone capture (security gate) | 1–2 weeks |
| P3 | Release pipeline, multi-user and more, when there is measured need | open |

## Decisions (Andrew, 2026-09-26)

| Question | Decision | Change vs. design |
|---|---|---|
| Key custody | **OS keychain via `@napi-rs/keyring` + offline recovery code** | Replaces DPAPI-only. Works on Windows, macOS and Linux. ADR-0002 is updated accordingly. |
| Disk encryption | Not available on this PC (Windows Home, no Device Encryption) | Vault encryption doesn't depend on it. Traces outside the vault are **mitigated in-app**: short transcript retention in the workspace, auto-memory off, and a warning in `status`. |
| Auto-file | **Yes, when confident.** Labelled AI-filed, one-step undo. Low confidence goes to the Inbox. | — |
| Expansion | **Light by default; rich for `talk` and `decision` subjects** | — |
| Method trial | **Run it.** Plain skill, non-sensitive thoughts only, ≤10 days. | The optional P0 lab becomes required. |

Answered earlier: general organizer, subject optional, auto cross-refs, approval-gated
renames, merges and splits, recall views plus digest, subject kinds, desktop-first,
public repo, TypeScript, MIT license.

## Deferred questions (asked when their phase starts)

1. Backup destination and cadence
2. Digest day and time, and the stale threshold
3. pnpm 11 refresh strategy (manual vs Renovate)
4. API key for CI evals in a protected environment, or local only
5. Trello Inbox bridge before P2b
6. P2b hosting (Cloudflare vs Vercel+Supabase)
7. Languages you write in
8. Printable cue card or disclosure ledger earlier than P3
9. `desktopSessionCleanupPeriodDays` value and training opt-out
