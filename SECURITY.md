# Security policy

Mullwise stores your private, unfiltered thoughts. They are often about real people,
money, health, work or decisions you haven't made yet. We treat all of it as
sensitive by default.

## Reporting a vulnerability

**Do not open a public issue.** Use GitHub's private vulnerability reporting:
**Security → Report a vulnerability** on this repository. You should get an
acknowledgement within 7 days.

Please include affected version/commit, reproduction steps, and impact.

## Supported versions

Pre-1.0: only the latest release on `main` receives fixes.

## Data-handling commitments

| Commitment | How it is enforced |
|---|---|
| User data never enters this repository | `.gitignore` patterns, gitleaks pre-commit hook + CI, push protection |
| Data at rest is encrypted | Encrypted store with a key held in the OS credential store (see `docs/security/threat-model.md`) |
| v1 has **no** network listener and makes **no** outbound calls | stdio-only MCP server; CI test asserts no socket is opened |
| Nothing sensitive is logged | Log redaction and tests that assert thought text never reaches logs |
| You can export and delete everything | `export` / `purge` tools, covered by round-trip tests |
| Internet-facing phases ship only after a threat-model update and recorded security review | `security-review` label gate, see `CONTRIBUTING.md` §5 |

## Scope notes

- **Prompt injection.** Stored thoughts are fed back to an LLM. Mullwise returns
  stored text as clearly delimited *data*, never as instructions, and tool
  descriptions are static. Reports showing stored content changing Claude's
  behaviour outside Mullwise are in scope.
- **Anthropic / Claude.** Text you type into Claude is processed under your
  Claude account's terms. Mullwise does not add any other third-party processor in v1.
