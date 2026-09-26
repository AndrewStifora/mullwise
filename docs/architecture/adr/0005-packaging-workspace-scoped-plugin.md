# ADR-0005: Packaging (workspace-scoped Claude Code plugin)

- **Status:** Proposed. The spike S1 empirical runs are pending (see *Open items*).
- **Date:** 2026-09-26
- **Evidence:** Spike S1 (#7): `spikes/s1-plugin/`, plus Claude Code docs as of v2.1.282

## Context

Mullwise tools must exist **only** in the dedicated Mullwise workspace:
- never in coding sessions
- never next to unrelated connectors

The server must also refuse to serve anywhere else, as a second line of defence.

## Decision (as drafted, amended where S1 changed it)

1. **Plugin `rto`, `defaultEnabled: false`.** It's installed with `claude plugin install --scope project` from the
   workspace, which writes `enabledPlugins` to the workspace's `.claude/settings.json`.
2. **Server-side workspace lock (amended).** The server starts **locked** unless `CLAUDE_PROJECT_DIR` equals the
   configured workspace path (`userConfig.workspaceDir`, default `C:\Users\<you>\RTO`). This replaces the draft's
   `RTO_WORKSPACE=${RTO_WORKSPACE:-0}` mapping in `.mcp.json`. The docs say `.mcp.json` expansion reads the **shell**
   environment only, so a settings-file `env` would never reach it.
3. **The workspace trust dialog must be accepted once.** Project `permissions.allow` rules aren't applied in a folder
   that was never trusted.
4. **Desktop Chat (P1.5)** gets exactly one server per session, decided by its own spike.

## S1 findings

### Established from the docs (Claude Code 2.1.282) and smoke-tested where possible

| # | Question | Finding | Evidence |
|---|---|---|---|
| 1 | Tool prefix | `mcp__plugin_<plugin>_<server>__<tool>`. Characters outside `[A-Za-z0-9_-]` become `_`, so plugin `rto` with server `rto` gives `mcp__plugin_rto_rto__capture`. | docs: mcp |
| 2 | `requiresUserInteraction` | Declared as `_meta["anthropic/requiresUserInteraction"]: true` in `tools/list`. It prompts in **every** mode, including `bypassPermissions`. Allow rules don't skip it. `dontAsk` denies it. Needs v2.1.199 or later. | docs: mcp |
| 3 | `${RTO_WORKSPACE:-0}` in `.mcp.json` | Expanded from the **shell** environment at session start. Settings files don't feed expansion. **Hence the amended lock (Decision 2).** | docs: mcp |
| 4 | Server environment | Servers receive `CLAUDE_PROJECT_DIR`, plus their `.mcp.json` `env`. `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}` are available for paths. | docs: mcp; smoke test |
| 5 | Allow rules | `permissions.allow` in `.claude/settings.json` is **ignored** until the folder is trusted. The `env` block applies anyway. | docs: permissions |
| 6 | Enablement | `defaultEnabled` defaults to `true`, and a marketplace entry overrides the manifest. Once `enabledPlugins` is written, it survives updates. | docs: plugins-reference |
| 7 | Deny rules | `mcp__*` as a deny glob removes every MCP tool from context. `Read(~/…)` is supported, and Windows paths normalize to `//c/…`. | docs: permissions |

The zero-dependency probe server completes the MCP handshake (2025-11-25) and serves text-only results.

### Open items (empirical, before this ADR is Accepted)

**Terminal**, via `node spikes/s1-plugin/run.mjs --enablement`. Blocked until the CLI is signed in again with `claude auth login`.
- [ ] Which protocol version Claude Code 2.1.282 requests (2025-era or 2026-07-28)
- [ ] Whether a text-only result reaches the model (the nonce is echoed)
- [ ] Whether the model sees only `structuredContent` when both channels are present (`dual_probe`). This is the rationale for ADR-0003.
- [ ] Whether a `requiresUserInteraction` tool is denied in `-p` and `dontAsk` even with an allow rule
- [ ] Whether the settings `env` reaches the server process through inheritance
- [ ] `RTO_WORKSPACE` values: from settings, from the shell, and unset
- [ ] Whether `Read(~/AppData/Local/rto/**)` denies Read even with `--allowedTools Read`, whether it also denies Grep, and whether the canary stays out of the output
- [ ] Enablement: after a project-scope install, whether tools appear in the workspace and are **absent** elsewhere, and where the plugin is copied (this decides the native-module layout for ADR-0002)
- [ ] The server's actual environment on Windows: variable names only, never values

**Code tab**, 5 minutes with Andrew (`spikes/s1-plugin/code-tab-checklist.md`):
- [ ] The server environment in a Code-tab session versus the terminal
- [ ] `requiresUserInteraction` prompts even with an allow rule
- [ ] An allow rule suppresses the prompt for a normal tool, once the folder is trusted
- [ ] The tools are absent from a Code-tab session in another folder

## Consequences

- No Mullwise tools in coding sessions. The lock also covers a mis-enabled plugin.
- The first-run runbook must include **"accept the trust dialog in the RTO workspace"**.
- The plugin layout must carry `@napi-rs/keyring` and its native binary (ADR-0002) next to the server bundle.

## Fallback

- **If `defaultEnabled: false` plus project `enabledPlugins` doesn't isolate:** install at user scope disabled, and
  enable it only in the workspace's `.claude/settings.local.json`.
- **If `CLAUDE_PROJECT_DIR` isn't reliable in the Code tab:** the pwsh profile function that opens the workspace
  exports `RTO_WORKSPACE=1` into the shell environment. That's a weaker lock, but it's the documented expansion source.
