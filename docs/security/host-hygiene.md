# Host hygiene

The vault is encrypted. Copies of your thoughts can still sit on this PC in
plaintext, outside the vault. This PC has no disk encryption (Windows Home, no
Device Encryption; see the roadmap's Decisions table), so those copies are readable
by anyone with access to the disk or the account.

This page lists each place a copy can land, what Mullwise does about it, and
what you do. The in-app mitigations are short transcript retention in the
workspace, auto memory off, and a warning in `status`.

The threat model (`docs/security/threat-model.md`) and the ADRs are not on `main`
yet. This page refers to them by name only.

## Residuals

**Pending S1** means the mitigation depends on spike S1 (deny rules and the
workspace trust dialog). Until S1 settles, treat the row as unmitigated. Rows not
marked pending are descriptions of behaviour, not verified guarantees: the
first-real-data gate re-checks them with a canary scan.

| What leaks | Where | In-app mitigation | User action | Status |
|---|---|---|---|---|
| Claude Code transcripts | `%USERPROFILE%\.claude\projects\<RTO workspace>\` | Short transcript retention set in the workspace settings; thoughts are sent as tool I/O, so they appear here | Delete old transcripts (see Cleaning up) | **Pending S1** |
| Desktop sessions, kept at any age | Claude Desktop's local session store (exact path to be confirmed) | None known. The `desktopSessionCleanupPeriodDays` value is an open question in the roadmap | Delete sessions in Desktop; do not rely on age-based cleanup | Open: value undecided |
| Scheduled-run sessions | Same stores as above | The scheduled digest is counts-only, so these sessions hold counts, not thought text | Delete them with the other sessions | Mitigated by design (P1b) |
| Auto memory | `%USERPROFILE%\.claude\projects\<RTO workspace>\memory\` | Workspace turns auto memory off | Check the folder is empty; the canary scan also covers it | **Pending S1** |
| Tool-results spill files | `%USERPROFILE%\.claude\projects\<RTO workspace>\` (tool-results) | Pagination keeps results small; the canary scan covers this folder | Delete the folder contents when done | **Pending S1** |
| Desktop Terminal panel (Claude can read it) | The panel's scrollback | The workspace denies Bash, PowerShell and `mcp__terminal`. `rto` secrets use the alternate screen with echo off | Run all admin work in an external Windows Terminal, never in the Desktop panel | **Pending S1** |
| PSReadLine history | `(Get-PSReadLineOption).HistorySavePath` | None. `rto` keeps secrets off the command line, but typed or pasted text can still be saved | Install the handler below, then scrub existing history | Documented here; untested on Windows |
| Remote Control transcripts | Transcripts of the session on this PC, plus whatever the remote client keeps | Runbook planned for P1.5 | Leave Remote Control off until the runbook exists | Open (P1.5) |
| Anthropic retention | Anthropic's servers. Tool input and output are visible to Anthropic | Only slices of the vault are sent | Check your training opt-out and retention setting (roadmap open item 9) | Open: setting undecided |
| OneDrive sync | Any synced folder, including Documents and Desktop | The vault lives outside OneDrive and outside git | Do not put exports, backups or plaintext files in a synced folder | By design |

No longer applies: the draft's residual for the DEK passing through PowerShell
stdout is gone, because key custody moved to the OS keychain (ADR-0002, amended).

## PSReadLine history handler

### Why

The `rto` CLI keeps secrets off the command line: it uses the alternate screen
and turns echo off. A mistyped recovery code or a pasted thought can still end
up in your shell if you type it at the prompt by mistake. PSReadLine then saves
that line to the file at `(Get-PSReadLineOption).HistorySavePath`.

### The snippet

> **Untested on Windows: verify before relying on it.** It uses only the
> documented `Set-PSReadLineOption -AddToHistoryHandler` contract: the handler
> receives the line and returns `$true` to save it, or `$false` to keep it out
> of the saved history.

```powershell
# Mullwise: keep sensitive lines out of the saved PSReadLine history.
$mullwiseWorkspace = Join-Path $env:USERPROFILE 'mullwise-workspace'   # change to your workspace path

Set-PSReadLineOption -AddToHistoryHandler {
    param([string]$line)
    if ($line -match '^\s*rto(\s|$)') { return $false }
    if ($line.IndexOf($mullwiseWorkspace, [StringComparison]::OrdinalIgnoreCase) -ge 0) { return $false }
    return $true
}
```

The workspace path above is a placeholder. Set it to your real workspace.
The handler's script block reads `$mullwiseWorkspace` from the profile scope, so
keep both in the same profile file.

Limits:

- It only filters lines starting with `rto` or containing the workspace path.
  A pasted thought that matches neither is still saved.
- A line kept out of the saved file stays in the current session's in-memory
  history until the session ends. Close the window after sensitive work.

### Install

1. Open PowerShell 7 and run `$PROFILE`. It prints the profile path.
2. If the file does not exist, create it: `New-Item -ItemType File -Force $PROFILE`.
3. Open it (`notepad $PROFILE`), paste the snippet and save.
4. Start a new PowerShell session.

### Check it works

Use harmless text only.

1. In a new session, run `echo mullwise-check-visible`, then `rto --help`.
2. Run `Get-Content (Get-PSReadLineOption).HistorySavePath -Tail 5`.
3. The `echo` line should be there after the session saves it. The `rto --help` line should not.

Lines are written as each command is accepted, so step 2 works in the same
session. If `rto --help` appears, the handler is not loaded: run
`(Get-PSReadLineOption).AddToHistoryHandler` and check it is not empty.

### Find and scrub existing history

1. Find the file: `(Get-PSReadLineOption).HistorySavePath`.
2. Search it for what you want gone, for example
   `Select-String -Path (Get-PSReadLineOption).HistorySavePath -Pattern 'rto'`.
3. Close every PowerShell window. Open sessions can write the file back.
4. Delete only the matching lines, or the whole file if you prefer:
   `Remove-Item (Get-PSReadLineOption).HistorySavePath`.

Deleting a file does not wipe it from the disk. With no disk encryption, the old
bytes may remain recoverable.

## Cleaning up

Run this after real use, and before you hand the PC to anyone.

- [ ] Delete old transcripts and tool-results under `%USERPROFILE%\.claude\projects\<RTO workspace>\`.
- [ ] Check the `memory` folder there is empty.
- [ ] Delete Desktop sessions, including scheduled-run sessions.
- [ ] Scrub the PSReadLine history (above).
- [ ] Check no export, backup or plaintext file sits in a OneDrive folder.
- [ ] Check Remote Control is off and no remote transcripts remain.
- [ ] Read the `status` warning and clear what it names.
