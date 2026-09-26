## What & why

<!-- One or two sentences. Link the issue. -->

Closes #

## Type

- [ ] feat
- [ ] fix
- [ ] test
- [ ] docs
- [ ] chore / ci / build
- [ ] refactor / perf
- [ ] security

## Testing

<!-- Tick every level this change is covered at. A bug fix needs a test that failed before the fix. -->

- [ ] Unit
- [ ] Property-based (fast-check)
- [ ] Integration (storage / crypto / MCP in-memory)
- [ ] Contract (MCP tool schemas / snapshots)
- [ ] E2E (stdio MCP server)
- [ ] Skill eval scenario added or updated
- [ ] Manually exercised in Claude (describe below)

## Security & privacy

<!-- Required if the `security-review` label is applied (auto-applied for sensitive paths). -->

- [ ] No user data, real names or secrets in code, tests, fixtures or logs
- [ ] No new network listener or outbound call (or: threat model updated and reviewed)
- [ ] Stored text is returned to the LLM as delimited data, not instructions
- [ ] Crypto / key-handling change reviewed against `docs/security/review-checklist.md`
- [ ] New dependency: justified, license OK, no install scripts (or reviewed)
- [ ] N/A: this change touches none of the above

## Notes for reviewer
