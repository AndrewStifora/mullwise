# S1 Code-tab checklist (about 5 minutes, with Andrew)

The terminal harness (`run.mjs`) can't see what the **Code tab** in the Claude desktop app does:
its environment, its prompts, its trust dialog. Claude prepares the workspace and Andrew clicks through.

## Setup (Claude runs this)

1. `claude plugin marketplace add <repo>\spikes\s1-plugin\market`
2. Create `%TEMP%\rto-spike-codetab` with `.claude\settings.json`:
   `{"permissions":{"allow":["mcp__plugin_rto-spike_hello__hello","mcp__plugin_rto-spike_hello__consent_probe"]}}`
3. From that folder: `claude plugin install rto-spike@rto-spike-market --scope project`

## Andrew, in the desktop app

1. Open a **new Code session** in `%TEMP%\rto-spike-codetab`, and accept the trust dialog if one appears.
2. Say: *"Call the rto-spike hello tool and show me its output."*
   - [ ] It runs **without** a permission prompt, because an allow rule matches.
3. Say: *"Call the rto-spike consent_probe tool."*
   - [ ] A permission prompt **does** appear despite the allow rule, and has no "don't ask again" option.
4. Say: *"Call env_probe."* No need to read the output. The server also records it for Claude, as names only.
5. Open a **new Code session in any other folder** and say: *"Do you have any tools from rto-spike?"*
   - [ ] None are listed.

## Teardown (Claude runs this)

- `claude plugin uninstall rto-spike@rto-spike-market --scope project` from the spike folder, then
  `claude plugin marketplace remove rto-spike-market`
- Delete `%TEMP%\rto-spike-codetab` and its `~/.claude/projects` session folder
- Andrew deletes the two spike sessions in the desktop app
