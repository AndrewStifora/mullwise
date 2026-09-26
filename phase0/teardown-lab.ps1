#Requires -Version 7.0
<#
.SYNOPSIS
  Ends the Mullwise method lab: permanently deletes the lab and Claude Code's local data for it.

.DESCRIPTION
  Deletes:
    - the lab folder: vault, skill, settings, CLAUDE.md
    - ~/.claude/projects/<encoded lab path>: session transcripts, auto memory, tool-results
  It asks for confirmation first (-Confirm:$false skips the prompt).

  Not covered, so do these by hand: delete the lab's sessions in the Claude desktop app
  (Code tab), then confirm the purge on issue #9.

  Safety: refuses any folder that has no LAB-STOP.txt, so it can't delete an arbitrary
  directory.

.PARAMETER LabPath
  The lab to remove. Defaults to $HOME\rto-lab.

.PARAMETER KeepNotesTo
  Optional file path. Copies vault\lab-notes.md (your meta: notes about the method) there
  before deleting. Review it for anything personal before sharing it.

.EXAMPLE
  pwsh -File phase0\teardown-lab.ps1 -KeepNotesTo $HOME\Desktop\lab-notes.md
#>
[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'High')]
param(
  [string]$LabPath = (Join-Path $HOME 'rto-lab'),
  [string]$KeepNotesTo
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$lab = [System.IO.Path]::GetFullPath($LabPath).TrimEnd('\', '/')
if (-not (Test-Path -LiteralPath (Join-Path $lab 'LAB-STOP.txt'))) {
  throw "Refusing: '$lab' has no LAB-STOP.txt, so it doesn't look like a Mullwise lab."
}

$projectsRoot = [System.IO.Path]::GetFullPath((Join-Path $HOME '.claude\projects'))
$projectDir = Join-Path $projectsRoot ($lab -replace '[^A-Za-z0-9]', '-')

if ($KeepNotesTo) {
  $notes = Join-Path $lab 'vault\lab-notes.md'
  if (Test-Path -LiteralPath $notes) {
    Copy-Item -LiteralPath $notes -Destination $KeepNotesTo -Force
    Write-Host "Kept method notes: $KeepNotesTo (review before sharing)"
  }
}

$targets = @($lab, $projectDir) | Where-Object { Test-Path -LiteralPath $_ }
Write-Host 'This permanently deletes:'
$targets | ForEach-Object { Write-Host "  $_" }

if ($PSCmdlet.ShouldProcess(($targets -join '; '), 'Permanently delete the method lab')) {
  foreach ($target in $targets) {
    Remove-Item -LiteralPath $target -Recurse -Force
  }
  $left = $targets | Where-Object { Test-Path -LiteralPath $_ }
  if ($left) { throw "Some paths still exist: $($left -join ', ')" }

  Write-Host ''
  Write-Host 'Deleted.' -ForegroundColor Green
  Write-Host 'Remaining manual steps:'
  Write-Host '  1. Claude desktop app > Code tab: delete the sessions that ran in the lab folder.'
  Write-Host '  2. Comment "purge confirmed" on issue #9.'
}
