# Competitive landscape

*v2, 2026-09-25, for the **general** random-thought organizer. 38 products were verified,
then adversarially re-checked (30 claims: 21 confirmed, 9 corrected, and the corrections are applied here).
Raw data: [`raw/2026-09-25-research-v2-general.json`](raw/2026-09-25-research-v2-general.json).
The v1 conversation-prep scan (still relevant to the `talk` kind) is in
[`raw/2026-09-25-research.json`](raw/2026-09-25-research.json).*

## The honest headline

**Being Claude-native is not a differentiator any more.** These are all already in the space:

| Already inside Claude | What it does |
|---|---|
| **Mem** (official Claude connector, Mar 2026, 15 tools) | Capture, recall and organize from Claude, including mobile |
| **Mem0** (Anthropic Connectors Directory) | Hosted memory layer across claude.ai, Desktop and Cowork |
| **Anthropic's Productivity plugin** (`anthropics/knowledge-work-plugins`) | Tracks people, projects and tasks in CLAUDE.md, `memory/` and TASKS.md, with stale-item triage |
| **claude-obsidian** (~15.2k★, MIT) | Self-organizing LLM wiki in Obsidian. Changes are gated by a reviewed JSON plan (`approved_plan_sha256`). BM25 plus an optional rerank. **No encryption.** |
| **obsidian-second-brain** (~4.6k★, MIT, 47 commands) | Person, decision and project notes. Dry-run merges with redirects. Scheduled morning, nightly and weekly agents. **Telegram phone capture.** Unencrypted files. |
| **Basic Memory** (AGPL) | Markdown plus a SQLite index over MCP. Typed observations. **No encryption at rest.** |
| **Hjarni** | Hosted Markdown KB for Claude and ChatGPT over MCP, iOS and Android apps, EU-hosted. Not end-to-end encrypted. |
| **Supermemory** | Managed MCP memory that auto-links **with no approval step** |
| **Anytype + official MCP** | Local-first, **end-to-end encrypted** typed objects that Claude can drive. This is the nearest do-it-yourself substitute. |
| **Einfall** (2026, solo developer, built with Claude Code) | Privacy-first capture of "fugitive thoughts", routed to agents through a **local MCP server**. $29.99 one-time. |
| Also MCP-enabled | Capacities (Pro), Tana, Twos, Recall, Voicenotes, Granola, AudioPen, Letterly, Evernote (beta) |

Platform absorption is real:
- Claude memory is free and shared between chat and Cowork (Aug 2026).
- ChatGPT's "Dreaming" memory (Jun 2026) reorganizes by topic in the background.
- Google Keep Live (paid Google AI plans) turns rambles into lists.

## What is still defensible

No surveyed product combines **all four**:

1. **One-line `subject: detail` capture.** The subject is optional and is fuzzy-matched to existing subjects and aliases, or proposed inline.
2. **Approval-gated restructuring.** One *Proposals* inbox for renames, merges, splits and subject guesses, each with a reason, evidence and confidence. Rejections are remembered. Cross-references are added automatically but labelled and removable.
3. **Action-first recall.** An open-items checklist, options / decision tree, and a talk-time checklist with outcome capture. **No surveyed note app offers decision-tree or talk-time views.**
4. **Real local encryption**, sending the model only the slice a request needs.

For a "me first" tool this is a green light: build the thing you want. For "others
later", position on that combination, never on "it's in Claude".

## Market pitfalls to design against

| Pitfall | Evidence | Design response |
|---|---|---|
| Auto-organization users can't inspect | Mem tag-search complaints; mymind Spaces can't be steered | Provenance on every link, a "why linked" line, a Proposals inbox, an undo log |
| Link noise | Smart Connections "highly irrelevant results" issue; "similarity is not duplication" | Cap AI links per thought, record a reason, track link acceptance rate in the digest |
| Silent AI rewrites | Mem Chat merges on command with no staged review; Notion Autofill re-runs on edits | Renames, merges and splits are **proposals only**. Merges leave aliases and redirects, never deletions. |
| Products dying or pivoting | Khoj Cloud shut down Apr 2026; Reor archived Mar 2026; Tana pivoted | Zero lock-in: full Markdown/JSON export at any time, documented schema |
| Per-note quotas punish micro-capture | Mem Free 25 notes/mo, Plus 50 | No quotas. AI runs on the owner's Claude plan. |
| "Private" meaning only cloud encryption at rest | mymind, Heptabase | Encrypted local store, a plain statement of what leaves the device |
| Complexity creep | Tana supertags; 47-command skills | A small command surface. The grammar does the work. |

## Features worth borrowing

| From | Idea |
|---|---|
| Tana (new) | Compare new input with the graph and issue a **merge proposal** instead of appending. MCP writes become proposals. |
| Smart Dedupe Pro | Near-duplicate review with four choices: keep separate / merge / archive / ignore |
| obsidian-second-brain | Merges dry-run by default and leave redirects. A background agent that can never delete or merge. Scheduled digests. Formal decision records. |
| claude-obsidian | Show an operation plan before applying. A lint pass for orphans and dead links. Contradictions stay visible. |
| Lightnote | Daily Insights and a weekly reflection letter as the digest format |
| Evernote | Auto-titles only when none was given (Mullwise asks instead of auto-applying) |
| Mem | A "Heads up" panel of related subjects while one is open |
| Voicethoughts / Keep Live | Split one ramble into several atomic thoughts, each with its own subject |
| Twos | Auto-classify each entry as a to-do or a note, which becomes Mullwise open items |
| Capacities | Typed objects plus "unlinked mentions" become subject kinds plus candidate links |
| Basic Memory | Categorized observations `[question]`, `[decision]` and `[option]` |
| Reflect | E2E encryption with an independent audit, and AI receives only the selected text. Caveat: the model provider still keeps logs. |
| Recall / Napkin | Spaced resurfacing, used to bring stale subjects back in the digest |

## Adjacent categories (for the `talk` and `person` kinds)

From the v1 scan:
- **SayIt**: a per-conversation script with likely replies.
- **Granola Briefs**: history-based pre-meeting briefs.
- **Fellow**: 1:1 agendas over MCP.
- **Dex**: pre-meeting brief emails.
- **GetBriefed, RapportBuddy, mathaka**: per-person facts.

None of them gathers your own thinking over days into a plan with a talk-time checklist and a debrief.
