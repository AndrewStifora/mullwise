# Contributing to Mullwise

Mullwise uses **GitHub Flow with issue-linked branches**:

- `main` is always releasable.
- Every change starts as an issue, happens on a short-lived branch named after
  that issue, and lands through a pull request that must pass every required
  check.

This applies to the maintainer too. No direct pushes to `main`.

## 1. Start from an issue

Every change starts from an issue, whether it is a bug, feature, test gap,
security finding or chore. Use the templates under `.github/ISSUE_TEMPLATE/`.

| Label | Meaning |
|---|---|
| `type:feat` `type:fix` `type:test` `type:docs` `type:chore` `type:refactor` `type:security` | Kind of change |
| `security-review` | Touches private data, crypto, auth, or anything network-facing. Triggers the security gate (§5). |
| `phase:0` `phase:1` `phase:2` `phase:3` | Roadmap phase (see `docs/architecture/roadmap.md`) |
| `good first issue` | Small, well-scoped |

The only exception to "no direct pushes to `main`" was the one-time bootstrap commit
that created the repository. Branch protection was turned on right after it.

## 2. Create the branch from the issue

Branch name: `<type>/<issue-number>-<short-slug>`, e.g. `feat/12-capture-tool`,
`fix/34-brief-ordering`, `sec/40-key-rotation`, `test/51-mcp-contract`.

Let GitHub link the branch to the issue:

```sh
gh issue develop 12 --name feat/12-capture-tool --base main --checkout
```

A local `pre-push` hook rejects branch names that don't match the pattern and
any push to `main`.

## 3. Commit with Conventional Commits

```
feat(core): add provenance to talk items

Closes #12
```

Types: `feat`, `fix`, `test`, `docs`, `chore`, `refactor`, `perf`, `ci`,
`build`, `sec`. A `!` or a `BREAKING CHANGE:` footer marks breaking changes.
Commit messages drive versioning and the changelog (§7).

Local hooks (installed automatically by `pnpm install` via lefthook):

| Hook | Runs |
|---|---|
| `pre-commit` | secret scan (gitleaks) on staged files, format, lint staged files |
| `commit-msg` | Conventional Commit check |
| `pre-push` | branch-name check, no push to `main`, typecheck, unit tests |

## 4. Open a pull request

```sh
gh pr create --fill --base main
```

Fill in the PR template and put `Closes #<issue>` in the body. Required checks
must be green before merge:

| Check | Level |
|---|---|
| `lint` / `typecheck` / `format` | static |
| `test (ubuntu, windows)` | unit + property-based + integration + contract |
| `e2e-mcp` | stdio MCP server driven by a real MCP client |
| `security / gitleaks`, `security / semgrep`, `security / osv-scanner`, `security / zizmor` | security |
| `CodeQL` | security (SAST) |
| `dependency-review` | supply chain |

Scheduled (not blocking): mutation testing (Stryker), skill evals with
Claude, OpenSSF Scorecard.

Merge with **squash**. The branch is deleted automatically.

## 5. Security review gate

A change **must** carry the `security-review` label and complete
`docs/security/review-checklist.md` in the PR if it touches any of:

- storage, encryption, key handling, export/import, or deletion of user data
- anything that listens on a network port, makes outbound network calls, or
  handles auth/tokens
- MCP tool definitions (their descriptions and outputs are read by an LLM, so
  prompt-injection surface)
- CI/CD workflows or dependencies with install scripts

These paths are auto-labelled by `.github/labeler.yml`. **Any phase that exposes
Mullwise to the internet requires a full threat-model update**
(`docs/security/threat-model.md`) and a recorded review before deploy.

## 6. Testing levels

See [`docs/testing/strategy.md`](docs/testing/strategy.md). In short: static →
unit → property-based → integration → contract → E2E → skill evals → mutation →
security. A bug fix lands with a test that failed before the fix.

## 7. Releases

Releases are automated from Conventional Commits:

1. A release PR accumulates the changelog.
2. Merging it tags `vX.Y.Z` and publishes release artifacts (plugin bundle,
   `.mcpb` Desktop Extension).

Pre-1.0, breaking changes bump the minor version.

## 8. Never commit user data

Real thoughts, vaults, keys and `.env` files are git-ignored and blocked by
gitleaks. Tests use synthetic fixtures only (`**/fixtures/`), with fictional
people.
