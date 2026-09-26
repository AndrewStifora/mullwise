# Architecture decision records

One file per decision: context, decision, evidence, consequences and fallback. Drafts for
all nine come from the design panel (`../design-plan.json`). An ADR here supersedes its draft.

| ADR | Decision | Status | Evidence |
|---|---|---|---|
| [0001](0001-sealed-event-log-in-node-sqlite.md) | Sealed event log in `node:sqlite` | **Accepted** | Spike S3 (#7) |
| [0002](0002-key-custody-os-keychain-and-recovery-code.md) | Key custody: OS keychain plus recovery code | **Accepted** (amended 2026-09-26) | Spike S2 (#7) |
| 0003 | MCP SDK v2 stdio with text-only framed results | Draft, written in #8 | S1 (text channel) |
| 0004 | AI split, permission tiers, agency guards | Draft, written in #8 | S1 (`requiresUserInteraction`) |
| [0005](0005-packaging-workspace-scoped-plugin.md) | Packaging: workspace-scoped plugin | **Proposed**, pending S1 runs | Spike S1 (#7) |
| 0006 | Talk UX | Written at P1b start | — |
| 0007 | Branching, CI gate, dependencies | Draft, written in #8 (implemented in #5/#6) | — |
| 0008 | P2b sealed inbox on Workers | Written at P2b start | — |
| 0009 | Admin boundary, workspace isolation, host residuals | Draft, written in #8 | S1 (deny rules, trust) |
