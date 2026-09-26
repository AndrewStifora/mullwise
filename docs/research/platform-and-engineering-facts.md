# Verified platform & engineering facts

*Research date: 2026-09-25. This file lists **only claims that survived adversarial
fact-checking**. Where the original research was refuted, the correction is what
appears here. Source URLs are in [`raw/2026-09-25-research.json`](raw/2026-09-25-research.json).
Re-verify anything older than about 3 months before relying on it.*

## A. Claude delivery surfaces

| Surface | What loads / runs | Persistence | Phone? |
|---|---|---|---|
| **Skill in Claude Code** (`~/.claude/skills` or `.claude/skills`) | Full skill. `` !`cmd` `` injection runs, **except for skills synced from claude.ai**. | Can read/write local files. CLAUDE.md and auto-memory carry across sessions. | Only via **Remote Control** (drives the session on your PC, including local MCP servers) or **Dispatch** (Pro/Max). |
| **Skill in claude.ai Chat** (web, desktop, **mobile**) | Loads. Needs code execution enabled. Runs in Anthropic's sandbox, **no access to your disk**. | Claude **memory is on Free/Pro/Max** by default, and each classic Project has its own memory. Files last only for the conversation. | **Yes** |
| **Claude Code plugin** | In Claude Code: skills, commands, agents, hooks and MCP servers (including a packaged `.mcpb`) all load. **In Chat (web, desktop, mobile): skills and commands load, and the plugin's remote HTTP MCP servers appear on its Connectors tab.** Local MCP servers, agents and hooks are ignored in Chat. Cowork loads agents and hooks. | Whatever its MCP server stores. | Skills: yes. Local MCP: no. |
| **Local MCP server (stdio)** | Claude Code (`claude mcp add`; config in `~/.claude.json` or project `.mcp.json`), Agent SDK, Claude Desktop via config or `.mcpb`. | You implement it. | No (except Remote Control / Dispatch to your PC) |
| **Desktop Extension (`.mcpb`)** | One-click install of a local MCP server in **Claude Desktop**. Also loadable via a plugin's `mcpServers` in Claude Code. Ignored in web and mobile Chat. | Same as the server. | No |
| **Remote MCP server = custom connector** | Once added (on web or desktop; adding from the phone is beta) it works on **web, desktop, the mobile apps and Claude Code** (terminal and cloud). Also `claude mcp add --transport http`. | Your backend. | **Yes** |
| **MCP Apps** (interactive UI returned by tools) | Rendered in Claude, **including the mobile app** (release note 2026-03-25). | n/a | Yes |
| **Classic claude.ai Project + memory** | Zero code. All plans. Instructions plus files plus per-project memory. | Project memory | Yes |
| **Claude Code "Projects" (beta)** | A coordinator for Claude Code cloud sessions (repos, routines, plugins, connectors). Pro/Max, waitlist. *Not* the same thing as classic Projects. | Project-level | Create and use on the mobile apps |
| **Managed Agents** (public beta) | Agent = model, system prompt, tools, MCP servers **and skills**. Memory stores: 10,000 memories × 100 kB max per store, at most 8 per session. $0.08 per active session-hour, $10 per 1,000 web searches, **no free hours**. Not ZDR or HIPAA eligible. Read/write stores can be poisoned by prompt injection. | Memory stores | Via your own client |
| **Agent SDK** | `@anthropic-ai/claude-agent-sdk`. The separate SDK credit pool was **paused**, so usage counts against the subscription. **Third-party products may not offer claude.ai login without approval**, so a standalone product means API-key billing. | Your own storage | Via your own client |

### Remote connector requirements (needed for phone capture)

- Must be **publicly reachable over HTTPS from Anthropic's IP ranges**. Anthropic's
  cloud calls the server for every client, including mobile.
- **MCP tunnels** (private endpoints) are an **Enterprise-only research preview**.
  They aren't an option for a solo developer.
- Auth: **OAuth** is recommended. The UI recommends **CIMD ("Use Claude's published identity")**; DCR is still supported. Redirect URI:
  `https://claude.ai/api/mcp/auth_callback`, plus a loopback redirect for Claude Code.
  Static request headers are a limited beta.
- Free plan: 1 custom connector. Pro/Max: unlimited.
- Claude's connector client follows the **2025-03-26, 2025-06-18 and 2025-11-25** auth
  specs and does **not** support sampling, resource subscriptions or "advanced/draft
  capabilities".
- Limits on hosted surfaces: tool results up to about **150,000 characters**, with a **240 s** tool timeout.
  Claude Code's default MCP output limit is **25,000 tokens** (`MAX_MCP_OUTPUT_TOKENS`).

### Privacy facts

- **Tool inputs and outputs always reach Anthropic** (they enter model context). This
  is true for local servers too; "never leaves your machine" is false once Claude
  reads it. Custom connectors are *called from* Anthropic's cloud.
- Consumer plans (Free, Pro, Max, including Claude Code on those accounts): chats are used for training only if you
  opt in. **30-day retention if you opt out, 5 years if you opt in.** Incognito chats are never used
  for training. Commercial and API terms are excluded. (Announced 2025-08-28; re-check.)

## B. MCP protocol & SDK

- Current spec **2026-07-28**: stateless (no sessions or initialize), CIMD over DCR,
  Logging deprecated (log to stderr or OpenTelemetry), `ttlMs`, `input_required` (MRTR),
  and tools SHOULD be returned in deterministic order.
- **Claude clients are on 2025-era specs**, so a server must serve 2025-11-25-style
  clients (initialize and sessions). **Don't rely on MRTR, elicitation or `ttlMs` in
  Claude** without testing.
- **TS SDK v2**: `@modelcontextprotocol/server` and `@modelcontextprotocol/client` **2.1.0**
  (2026-09-23). Test with `createMcpHandler` + `handler.fetch` and a real `Client`.
  `InMemoryTransport.createLinkedPair` connects **2025-era instances only**. For stdio,
  spawn the process with `StdioClientTransport`. v1 (`@modelcontextprotocol/sdk` 1.30.x)
  gets fixes until at least about 2027-03.
- Conformance: pin `@modelcontextprotocol/conformance@0.2.0-alpha.11` (npm `latest` 0.1.16 predates
  2026-07-28) with an expected-failures file, as the SDK does.
- MCP Inspector v2 CLI (2.8.0) works as a smoke test: `--cli ... --method tools/list --format json`.
- If a tool declares `outputSchema`, the server **MUST** return conforming
  `structuredContent`. Zod v4 (4.6.x) is the single source of truth for schemas.

## C. Evals & headless Claude

- `claude plugin eval` (Claude Code v2.1.269, Sep 2026):
  - Cases live in `evals/<case>/prompt.md`, with graders `regex`, `tool_used`, `tool_order`, `file_exists`, `llm` and `baseline`.
  - MCP tools can be mocked. Each case runs 3× with the plugin and 3× without.
  - Default `--threshold 1.0`. Exit code 2 means a partial run.
  - **The HTML report is published as a private claude.ai artifact by default**, so always pass `--no-publish` when fixtures could resemble real notes.
- `skill-creator` has its own `evals/evals.json` format. It's useful for tuning skill descriptions and triggering, and doesn't read `claude plugin eval` cases.
- `claude --bare -p`:
  - Skips hooks, `.mcp.json` and CLAUDE.md, and needs `ANTHROPIC_API_KEY`.
  - Supports `--json-schema` for structured output.
  - `system/init` reports `plugin_errors` and `mcp_server_errors`.
- promptfoo (MIT, acquired by OpenAI 2026-03-09, still OSS): `llm-rubric` plus red-team
  plugins `mcp`, `indirect-prompt-injection`, `pii`, `bola` and `bfla`.

## D. GitHub (public repo, personal account)

Available **free on a public repo**:
- rulesets / protected branches and required status checks
- CodeQL code scanning
- secret scanning, with **push protection on by default for new public personal repos** (verify in Settings after creation)
- dependency review, private vulnerability reporting, Dependabot
- unlimited standard Actions minutes
- environments with deployment protection rules
- the Harden-Runner community tier, and the Scorecard action

Solo-maintainer ruleset for `main`:
- require a PR with **0 approvals** (authors can't approve their own PRs)
- require status checks against one aggregate `ci-ok` job (job names must be unique across workflows)
- require linear history, block force-push, restrict deletion
- keep yourself on the bypass list for emergencies only

Other notes:
- CODEOWNERS "require review" would block a solo maintainer's own PRs, so it's advisory only.
- **Dependabot docs list pnpm v7–v10 only.** The local pnpm is 11.9, and the latest is 12.6. Either pin
  `packageManager` to a supported pnpm or use Renovate (its pnpm 11/12 support is unverified).
- Pin every action by full commit SHA and turn on the repo policy that requires it.
  Real incident: on 2026-03-19, 76 of 77 `aquasecurity/trivy-action` tags were
  hijacked (also `setup-trivy` before 0.2.6).

## E. Supply chain & tooling versions

- **pnpm (v11+)** defaults:
  - `minimumReleaseAge` 1440 min (consider 3–7 days)
  - `strictDepBuilds` on, with `allowBuilds` gating install scripts
  - `blockExoticSubdeps` on
  - `trustPolicy` off (set `no-downgrade`)

  A long release-age clashes with pinning brand-new versions.
- **Vitest 5.0.2** shipped 2026-09-25 (5.0.0 on 09-03). `@stryker-mutator/vitest-runner` 10.0.0
  **doesn't document Vitest 5 support**, so verify it before relying on mutation testing, or stay on Vitest 4.x.
- gitleaks-action v3 needs no licence on personal repos. zizmor 1.30 audits Actions. OSV-Scanner v2 covers `pnpm-lock.yaml`. Syft produces CycloneDX SBOMs.
- lefthook 2.1.x, `@commitlint/cli` 21.x, release-please (manifest mode for monorepos).
- The CodeQL CLI licence forbids CI analysis of *non-open-source* code without GHAS. That's fine on a public repo.

## F. Encryption & keys (local)

- `better-sqlite3-multiple-ciphers` (13.0.x): SQLite3MultipleCiphers, default **sqleet
  ChaCha20-Poly1305** (authenticated). SQLCipher-compatible AES-256+HMAC is also available. Avoid
  the legacy AES-CBC and RC4 modes (no HMAC). It supports `.backup()`, `key` and `rekey`. **It's a native module.**
- `@napi-rs/keyring` (2.1.0) covers Windows Credential Manager, macOS Keychain and Linux Secret Service.
  **Native module.** `keytar` has been archived since 2022-12-15, so don't use it.
- Built-in, zero-dependency alternative: WebCrypto AES-256-GCM, available in Node, browsers,
  Cloudflare Workers and React Native (with a polyfill), with envelope encryption (a data key
  wrapped by a keychain- or passphrase-derived key).

## G. Security & privacy frameworks

- OWASP Top 10 for LLM Apps **2026 v1.0** (2026-08-03): prompt injection is still #1, and
  excessive agency has risen to #3. OWASP MCP Top 10 items used: MCP01 token mismanagement,
  MCP03 tool poisoning, MCP04 supply chain, MCP06 injection, MCP08 audit,
  MCP09 shadow servers.
- MCP security best practices: no token passthrough; confused deputy (per-client
  consent, exact redirect_uri, single-use `state` of about 10 minutes); RFC 8707 audience
  validation; SSRF; state-handle hijacking.
- Threat modelling: **STRIDE + LINDDUN** (privacy) in OWASP Threat Dragon v2, re-run
  at every phase change.
- **GDPR** Recital 18 exempts purely household use, but **not** the provider of the
  means. Professional-context notes (manager, client) may fall outside the exemption
  anyway. Art. 14 covers notes about third parties. **CCPA** thresholds ($26.625M revenue
  or 100k CA consumers) won't apply to a solo MVP. *(Not legal advice.)*
