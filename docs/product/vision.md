# Product vision

> **Mullwise**: *your random thought organizer*. The internal codename is **RTO** (Random
> Thought Organizer). See [naming.md](naming.md) for the name review.

## Problem

Thoughts arrive at random: an idea for a project, a question for someone, a worry
about a decision, a detail I must not forget. I jot them down, or don't, and
they end up scattered. When I need them, for example when I'm talking to the person,
making the decision or starting the work, I can't recall all the paths,
options and questions I had already worked out.

The motivating example is a conversation I need to have with someone. I think it
through completely, and by the time we talk I have forgotten half of it. But the
problem is general to **all** random thoughts.

## Job to be done

> When a thought hits me, I want to drop it in seconds as a simple
> *subject – detail*. The AI should find how it connects to my other thoughts and suggest
> clearer subjects, so that when I come back to a subject everything relevant is
> in front of me, organized.

## Core loop

| Stage | What happens |
|---|---|
| **Capture** | A one-liner: `Budget: ask Sam about the Q3 timeline`, or just `ask Sam about the Q3 timeline`. **The subject is optional.** If it's missing, AI proposes one. |
| **Connect** | AI finds **cross-references** between thoughts and subjects, and adds them automatically, labelled as AI-made. |
| **Clarify** | AI suggests **better subject names**, **merges** (two subjects that are really one) and **splits**. These wait for my OK. |
| **Expand** | AI actively suggests missing questions, options, objections and branches, always labelled *AI suggestion* rather than *mine*. |
| **Recall** | When I return to a subject: **one-glance brief**, **open-items checklist**, **options / decision tree**. |
| **Review** | A **periodic digest** of new connections, pending renames or merges, and stale or unresolved subjects. |

### Subject kinds

The core is general. Every thought belongs to a subject. A subject can optionally
have a **kind** that unlocks specialised views:

| Kind | Example | Unlocks |
|---|---|---|
| `topic` (default) | "Q3 budget" | brief, checklist, cross-refs |
| `person` | "Sam" | everything I want to raise with Sam, across subjects |
| `talk` | "1:1 with Sam, Friday" | **talk-time brief, live checklist, decision tree, outcome capture after** |
| `decision` | "Switch to the new CRM?" | options / decision tree, pros and cons, outcome |
| `project` | "Garage rebuild" | open items, related subjects |

Conversation prep stays first-class through the `talk` kind. It's one excellent use of a
general organizer, not the whole product.

## Decisions from the kickoff interview (2026-09-25)

| Topic | Decision | Implication |
|---|---|---|
| Scope | **General random-thought organizer.** Conversations were one example. | The core is Subject + Thought + cross-references. Talk is a subject kind. |
| Capture input | **Subject optional.** "subject: detail" or free text; AI proposes a subject when missing. | A cheap deterministic parser for "subject: detail", plus AI subject proposal. |
| AI changes | **Cross-references automatic (labelled). Renames, merges and splits need approval.** | Suggestion queue plus a change log. Links carry provenance and can be removed. |
| AI role | **Actively expand**, labelling AI suggestions vs. mine | Provenance on every item and link. |
| Recall | **Brief, open-items checklist, options / decision tree, periodic digest** | These apply to any subject. The `talk` kind adds talk-time use and outcome capture. |
| Talks | **First-class subject kind** | Subject kinds: topic, person, talk, decision, project. |
| Capture surface | **Desktop first** | v1 runs in Claude on the PC (Code tab / Desktop). Phone capture is phase 2 via a hosted connector. |
| Audience | **Me first, others later** | Single user now. The data model, naming and privacy posture must not block multi-user later. |
| Data home | **Easiest, but privacy-aware; always consider encryption** | Notes can be about real people. Encryption at rest is designed in from v1. |
| Repo | **GitHub, public** | Free enforced branch protection, CodeQL, secret scanning + push protection, Dependabot. User data never enters the repo. |
| Integrations (phase 2) | **Google Calendar, Trello / Dayhand, Pocket recordings** | Clean integration boundary in the core. Use existing connectors. None in v1. |
| Stack | **TypeScript** | Node 24 + pnpm. One language from local MCP server to hosted connector to app. |

## Non-goals for v1

- Mobile capture (phase 2)
- Multi-user accounts, sharing, collaboration
- Any internet-exposed service
- Integrations (Calendar, Trello, Pocket)
