# Phase 0: the method trial (issue #9)

A **10-day trial** of the Mullwise organizing method, run as a plain Claude Code skill over
Markdown files. It answers one question before any product code is written: *does
"subject: detail" capture, plus AI filing, links, proposals and recall, actually help?*

The product (P1a) replaces the Markdown vault with the encrypted store. What you learn here
tunes the method for P1b: link budget, confidence cut-offs, expansion depth.

## Rules

| Rule | Why |
|---|---|
| **Non-sensitive thoughts only** | The lab stores plain Markdown, and this PC has no disk encryption (Windows Home). Health, money, credentials and private details about real people wait for the encrypted P1a. The skill refuses them. |
| **Hard stop after 10 days**, or at P1a go-live if that's sooner | Limits how long plaintext exists on disk. After the stop, the skill refuses to capture. |
| **The lab lives outside OneDrive and git** | `setup-lab.ps1` refuses otherwise. |
| **Auto memory off; no shell, web or MCP tools in the lab** | Set in the lab's `.claude/settings.json`. Your connectors (Gmail, Drive, Slack and so on) can't see the lab. |
| **Don't use Remote Control for lab sessions** | Its transcripts are stored on Anthropic's servers. |

## Start

```powershell
pwsh -File phase0\setup-lab.ps1          # creates $HOME\rto-lab, with the stop date 10 days out
```

Then, in the Claude desktop app, open a **Code** session in `C:\Users\<you>\rto-lab`, say
`help`, and start typing thoughts:

```
Garage rebuild: order the timber for the workbench
need the Q3 number before the offsite            ← no subject; Claude files it or asks
brief Q3 budget
talk 1:1 with Sam                                ← during the conversation
outcome                                          ← right after it
digest
meta: auto-filing felt too eager today           ← notes about the method itself
```

The full method is in [rto-lab/method.md](rto-lab/method.md). The vault format is in
[rto-lab/reference/formats.md](rto-lab/reference/formats.md).

## During the trial, notice

- **Capture friction.** Was typing a thought fast enough to do mid-day?
- **Filing.** Was an auto-file wrong? Did Claude ask too often?
- **Links.** Did any help? Did you `unlink` any?
- **Proposals.** Were renames, merges and splits useful or noisy?
- **Recall.** Did a brief or talk mode help at a real moment?

Log each observation as a `meta:` note. They're the trial's main output.

**Changing the method mid-trial:** edit `phase0/rto-lab/*` through a normal PR, then re-run
`setup-lab.ps1`. A refresh updates the skill and never touches your vault or stop date.

## End: purge (acceptance criterion for #9)

```powershell
pwsh -File phase0\teardown-lab.ps1 -KeepNotesTo $HOME\Desktop\lab-notes.md
```

It asks before deleting, and removes:
- the lab folder
- `~/.claude/projects/C--Users-<you>-rto-lab`, which holds transcripts, auto memory and tool-results

Then:
1. In the Claude desktop app, delete the Code sessions that ran in the lab folder.
2. Comment **"purge confirmed"** on issue #9.
3. Review the kept notes for anything personal, then turn them into method v1 through a PR.

## Eval scenarios

[`evals/evals.json`](evals/evals.json) has 31 scenarios in skill-creator format. They run
against a fictional fixture vault (`evals/fixtures/base`) and cover capture, filing, links,
proposals, expansion, recall, talk mode, digest, undo, prompt injection, the
sensitive-data refusal and the hard stop. They become `claude plugin eval` cases in P1b.

The **re-identification check** ([evals/REIDENTIFICATION.md](evals/REIDENTIFICATION.md)) has
two parts:
- Automated in CI: people come only from the fictional roster.
- Local: a git-ignored `evals/real-names.local.txt` denylist that you fill with real names.

It is the second acceptance criterion for #9.
