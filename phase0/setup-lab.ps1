#Requires -Version 7.0
<#
.SYNOPSIS
  Creates (or refreshes) the Mullwise phase-0 method lab (issue #9).

.DESCRIPTION
  Copies the rto-lab skill, the lab's CLAUDE.md and its hygiene settings into a lab folder,
  seeds an empty vault and sets a hard stop (10 days by default).

  Gates: the lab must not be inside OneDrive or a git repository. Only NON-SENSITIVE
  thoughts belong in the lab, because it stores plain Markdown on disk.

  Re-running it on an existing lab refreshes the skill, settings and CLAUDE.md. It never
  touches the vault or the stop date.

.PARAMETER LabPath
  Where to create the lab. Defaults to $HOME\rto-lab.

.PARAMETER Days
  Trial length before the hard stop, from 1 to 10. Defaults to 10.

.EXAMPLE
  pwsh -File phase0\setup-lab.ps1
#>
[CmdletBinding(SupportsShouldProcess)]
param(
  [string]$LabPath = (Join-Path $HOME 'rto-lab'),
  [ValidateRange(1, 10)][int]$Days = 10
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$phase0 = $PSScriptRoot
$lab = [System.IO.Path]::GetFullPath($LabPath).TrimEnd('\', '/')

# Gate 1: not inside a synced folder.
$syncRoots = @($env:OneDrive, $env:OneDriveConsumer, $env:OneDriveCommercial) |
  Where-Object { $_ } |
  ForEach-Object { [System.IO.Path]::GetFullPath($_).TrimEnd('\', '/') } |
  Select-Object -Unique
foreach ($root in $syncRoots) {
  if ($lab -ieq $root -or $lab.StartsWith("$root\", [StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing: '$lab' is inside OneDrive ('$root'). Pick a folder outside any synced location."
  }
}

# Gate 2: not inside a git work tree (thoughts must never be committable).
$probe = $lab
while ($probe -and -not (Test-Path -LiteralPath $probe)) { $probe = Split-Path -Parent $probe }
if ($probe) {
  $inside = & git -C $probe rev-parse --is-inside-work-tree 2>$null
  if ($LASTEXITCODE -eq 0 -and "$inside".Trim() -eq 'true') {
    throw "Refusing: '$lab' is inside a git repository. Pick a folder outside any repo."
  }
  $global:LASTEXITCODE = 0 # git exits 128 outside a repo, which is the expected case
}

$isRefresh = Test-Path -LiteralPath (Join-Path $lab 'LAB-STOP.txt')
$skillDest = Join-Path $lab '.claude\skills\rto-lab'
$vault = Join-Path $lab 'vault'

if (-not $PSCmdlet.ShouldProcess($lab, ($isRefresh ? 'Refresh lab skill and settings' : 'Create method lab'))) {
  return
}

# Skill, settings and CLAUDE.md are always refreshed from the repo.
New-Item -ItemType Directory -Force -Path $skillDest, (Join-Path $vault 'subjects') | Out-Null
Copy-Item -Recurse -Force -Path (Join-Path $phase0 'rto-lab\*') -Destination $skillDest
Copy-Item -Force -LiteralPath (Join-Path $phase0 'workspace\settings.json') -Destination (Join-Path $lab '.claude\settings.json')
Copy-Item -Force -LiteralPath (Join-Path $phase0 'workspace\CLAUDE.md') -Destination (Join-Path $lab 'CLAUDE.md')

# The vault and stop date are created once and never overwritten.
$today = Get-Date -Format 'yyyy-MM-dd'
$seed = [ordered]@{
  'inbox.md'      = "# Inbox`n"
  'proposals.md'  = "# Proposals`n`n## Pending`n`n## Decided`n"
  'log.md'        = "# Change log`n"
  'meta.md'       = "last_digest: $today`nunlinked:`n"
  'lab-notes.md'  = "# Lab notes (meta: notes about the method)`n"
}
foreach ($name in $seed.Keys) {
  $file = Join-Path $vault $name
  if (-not (Test-Path -LiteralPath $file)) {
    Set-Content -LiteralPath $file -Value $seed[$name] -NoNewline -Encoding utf8
  }
}

$stopFile = Join-Path $lab 'LAB-STOP.txt'
if (-not (Test-Path -LiteralPath $stopFile)) {
  $stop = (Get-Date).AddDays($Days).ToString('yyyy-MM-dd')
  Set-Content -LiteralPath $stopFile -Encoding utf8 -Value @(
    "started: $today"
    "stop: $stop"
    'rule: non-sensitive thoughts only. At the stop, run phase0/teardown-lab.ps1 from the mullwise repo.'
  )
}

$stopLine = (Get-Content -LiteralPath $stopFile | Where-Object { $_ -like 'stop:*' }) -replace '^stop:\s*', ''
$projectDir = Join-Path $HOME ('.claude\projects\' + ($lab -replace '[^A-Za-z0-9]', '-'))

Write-Host ''
Write-Host ($isRefresh ? "Lab refreshed: $lab" : "Lab created: $lab") -ForegroundColor Green
Write-Host "  Hard stop:        $stopLine"
Write-Host "  Claude data dir:  $projectDir  (deleted by teardown-lab.ps1)"
Write-Host ''
Write-Host 'Next:'
Write-Host "  1. In the Claude desktop app, open a Code session in $lab"
Write-Host '  2. Say "help", then just type thoughts. Use "meta: ..." for notes about the method.'
Write-Host '  3. Non-sensitive thoughts only. At the stop date, run phase0\teardown-lab.ps1'
