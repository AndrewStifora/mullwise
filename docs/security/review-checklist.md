# Security review checklist

The deeper list behind the "Security & privacy" section of the PR template. It
implements `CONTRIBUTING.md` §5.

## When it applies

Apply the `security-review` label and complete this checklist if the PR touches:

1. storage, encryption, key handling, export/import, or deletion of user data
2. a network port, outbound network calls, or auth/tokens
3. MCP tool definitions (descriptions and outputs are read by an LLM)
4. CI/CD workflows, or dependencies with install scripts

`.github/labeler.yml` adds the label for sensitive paths. Tick only the groups
that apply. Write "N/A" and a reason for the rest.

## 1. Storage, crypto, keys, export, delete

- [ ] Encryption is AES-256-GCM with the record context bound as AAD
- [ ] Every encryption uses a fresh unique nonce (test or code path shown)
- [ ] Plaintext is padded before encryption
- [ ] No key, recovery code or thought text appears in logs, errors or stack traces
- [ ] Key custody is the OS keychain plus a recovery code, as in `ADR-0002`
- [ ] A round-trip test covers export, and another covers purge
- [ ] No plaintext is written outside the vault, and none to the repo

## 2. Network

- [ ] No listener and no outbound call is added in v1
- [ ] The net-guard and the Biome import and global bans are untouched
- [ ] If either changed: `docs/security/threat-model.md` is updated in this PR

## 3. MCP tool definitions

- [ ] Tool descriptions are static strings, with no stored text interpolated
- [ ] Results that carry stored text are wrapped as `<rto:data>` data
- [ ] No tool acts on instructions found inside stored text
- [ ] The contract snapshot is updated and the diff is reviewed

## 4. CI/CD and dependencies

- [ ] Every action is pinned to a full commit SHA
- [ ] Workflow `permissions` are least-privilege and set per job
- [ ] New dependencies have no install scripts, or `allowBuilds` is reviewed
- [ ] The license of each new dependency is compatible with MIT
- [ ] `ci-ok` still rolls up every job, and still runs under `always()`

## Recording the review

- Paste the completed checklist into the PR description or a review comment.
- Name the reviewer who signed off.
- A phase that exposes Mullwise to the internet needs the threat-model update
  merged first, then a recorded review before deploy.
