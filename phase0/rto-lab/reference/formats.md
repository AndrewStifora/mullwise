# Lab vault file formats

All files live under `vault/` in the lab folder. The format is plain Markdown, one line per record,
so the user can read and fix everything by hand. **Never delete a line during normal work.** Mark
it instead (done, redirect, rejected). Undo is the only thing that removes lines.

## IDs

| Kind | Pattern | Rule |
|---|---|---|
| Thought | `T-YYYYMMDD-NN` | NN restarts each day. Find the highest ID for today by grepping `T-YYYYMMDD-`. |
| Suggestion | `S-YYYYMMDD-NN` | Same rule |
| Proposal | `P-NNN` | Next number after the highest in `proposals.md` |
| Batch | `B-YYYYMMDD-NN` | Next number after today's highest in `log.md` |

## `vault/subjects/<slug>.md`

The slug is the lowercase title with non-alphanumerics replaced by `-`.

```markdown
---
title: Q3 budget
kind: topic
aliases: [budget, q3 budget]
status: active
created: 2026-09-26
updated: 2026-09-26
---

## Thoughts
- T-20260926-01 · 2026-09-26 · mine · Ask Sam about the Q3 timeline
- T-20260926-04 · 2026-09-26 · ai-filed · need a number before the offsite

## Open items
- [ ] Q · T-20260926-01 · Ask Sam about the Q3 timeline · mine
- [x] T · T-20260925-02 · Send the draft to Priya · mine · done 2026-09-26

## Options
- O-1 · Delay the hire to Q4 · pros: saves cash · cons: slows launch · mine

## Suggestions (not yours until accepted)
- S-20260926-01 · Q · What if the timeline slips past October? · ai-suggested

## Links
- → [[sam-okafor]] · both mention the Q3 timeline · ai-link · 2026-09-26

## Outcome
- 2026-10-02 · agreed: … · still open: … · follow-ups: …
```

Rules:
- `status` is one of: `active`, `done`, `archived`, or `merged-into: <slug>`. A merged subject
  keeps only its frontmatter plus the line `Merged into [[<slug>]] (P-NNN).`
- Sections appear in the order shown. Leave out empty sections, except `## Thoughts`.
- For `talk` subjects, `## Options` holds branches written as
  `- If they say X → then Y · ai-suggested|mine`.
- Keep the original provenance when a suggestion is accepted, and append `· accepted YYYY-MM-DD`.

## `vault/inbox.md`

```markdown
# Inbox
- T-20260926-03 · 2026-09-26 · mine · look into a standing desk · proposed: home office (low)
```

## `vault/proposals.md`

```markdown
# Proposals

## Pending
- P-004 · merge · "budget" + "Q3 budget" → keep "Q3 budget" · reason: same thoughts, one is an alias · evidence: T-20260925-02, T-20260926-01 · confidence: high · 2026-09-26

## Decided
- P-001 · rename · "Sam thing" → "Sam: Q3 timeline talk" · accepted 2026-09-26
- P-002 · merge · "desk" + "home office" · rejected 2026-09-26 · re-propose only with ≥3 new thoughts
```

## `vault/log.md` (append-only)

```markdown
## B-20260926-02 · 2026-09-26 14:03 · capture
- create subjects/q3-budget.md (kind topic)
- append T-20260926-01 → subjects/q3-budget.md [Thoughts, Open items]
- link q3-budget ↔ sam-okafor · "both mention the Q3 timeline"
```

For moves, merges and renames, log the exact lines moved and the previous title or aliases, so
`undo` can restore them exactly. An undo is logged as its own batch:
`## B-… · undo of B-…`.

## `vault/meta.md`

```markdown
last_digest: 2026-09-26
unlinked: sam-okafor ↔ desk-setup
```

`unlinked` records pairs the user removed, so they aren't re-linked.

## `vault/lab-notes.md`

`meta:` notes about the method, one line each with a date. They are the trial's main output.
