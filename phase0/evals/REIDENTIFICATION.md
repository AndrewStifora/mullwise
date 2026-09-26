# Re-identification check (phase-0 fixtures and scenarios)

This repository is **public**. Nothing under `phase0/` may identify a real person or a real
situation from Andrew's life.

## Automated (runs in CI: `tests/phase0/method-lab.test.ts`)

1. Every scenario lists its `people`, and each must be in the fictional roster
   (`fictional-people.json`).
2. Any roster name mentioned in a scenario's prompt or setup must be declared in its `people`.
3. **Local denylist:** if `phase0/evals/real-names.local.txt` exists, no file under `phase0/`
   may contain any name or term in it (case-insensitive, whole words). Put the real names that
   matter to you in it: family, colleagues, clients, places. The file is git-ignored, so it never
   leaves your machine, and CI simply skips this check.

## Manual (once, then at each change to the scenarios)

- [ ] No scenario is a paraphrase of a real thought captured during the trial.
- [ ] No scenario combines details (role + company + event) that would point to a real person.
- [ ] The local denylist check passes on my machine (`pnpm test` with the file present).

Confirmed by: ____________  Date: __________
