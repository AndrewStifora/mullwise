# Testing strategy

How Mullwise is tested, level by level. [CONTRIBUTING §6](../../CONTRIBUTING.md#6-testing-levels)
links here. The tool choices come from `plan.testingMatrix` in
[`docs/architecture/design-plan.json`](../architecture/design-plan.json).

Only the **Status today** column says what exists. Anything marked *planned* has no
tool, job or config in the repository yet.

## The ladder

| Level | Tool | What it covers | When it runs | Status today |
|---|---|---|---|---|
| Static | `tsc`, Biome, actionlint, zizmor | Types, import and global boundaries, workflow security | Every PR (`static` job) | **Running.** Biome's `noRestrictedImports` / `noRestrictedGlobals` rules and `claude plugin validate` are planned, phase 1. |
| Unit | Vitest | Parser, sanitizer, crypto, reducers, budgets, renderers | Every PR | **Running** for the toolchain only (`tests/toolchain`). Product units are planned, phase 1. |
| Property | fast-check (`@fast-check/vitest`) | The same units, over generated input | Every PR; long runs nightly | Installed. No property tests yet. Nightly runs planned, P1b. |
| Integration | Vitest with real `node:sqlite` and DPAPI | Two-process writes, key reload, restore, locked mode | Every PR, both OSes | Planned, phase 1. The `test` job already runs on Ubuntu and Windows. |
| Contract | Vitest snapshots | `tools/list`, golden views, format fixtures | Every PR | Planned, phase 1. |
| E2E | MCP in-process and stdio clients; `claude --bare -p` | Full flows, text-only contract, stdout hygiene, multi-turn scenarios | Every PR (MCP); headless only if the API key is approved | Planned. The `e2e-mcp` job arrives with the MCP server (#14). Headless E2E is planned, P1.5. |
| Skill evals | `claude plugin eval` | Verbatim capture, labelling, no unrequested edits, injection cases | Locally per skill PR from P1b; weekly in CI from P1.5 | Planned. |
| Mutation | Stryker | `core`, `crypto`, `store` | Weekly from P1.5 | Planned. |
| Security | gitleaks, osv-scanner, CodeQL | Secrets, known-vulnerable dependencies, code scanning | Every PR | **Running.** CodeQL is a required check beside `ci-ok`. |

Other levels in the design plan (model-based crash tests, forensic canary scan,
performance and fuzz, Scorecard, dogfood metrics) are planned, from P1b onward. They
are not described here until they exist.

## What runs today

`ci-ok` rolls up these jobs in `.github/workflows/ci.yml`:

- `static`: typecheck, Biome, actionlint, zizmor
- `test (ubuntu-latest)` and `test (windows-latest)`: `pnpm run test`, which includes
  `tests/toolchain` (runtime check and the network ban)
- `gitleaks`
- `osv-scanner`

CodeQL runs from `.github/workflows/codeql.yml` and is required separately. See
[CONTRIBUTING §4](../../CONTRIBUTING.md#4-open-a-pull-request).

Run the local equivalent with `pnpm run verify` (typecheck, lint, test).

## Rules

- **A bug fix lands with a test that failed before the fix.** Show the failure in the PR.
- **Synthetic fixtures only.** Fixtures live under `**/fixtures/` and use fictional
  people. Never commit real user data ([CONTRIBUTING §8](../../CONTRIBUTING.md#8-never-commit-user-data)).
- **No network in tests.** A test that needs a socket is a bug in the test.
