# Mullwise

**Your random thought organizer.** Drop a thought; it connects the dots.

```
Budget: ask Sam about the Q3 timeline
ask Sam about the Q3 timeline            ← the subject is optional; Mullwise proposes one
```

Capture any thought as a one-line `subject: detail`. Mullwise, working inside
Claude:

- **connects** it to related thoughts through cross-references it adds automatically
  and always labels as AI-made
- **clarifies** your subjects by *proposing* better names, merges and splits, which
  wait for your OK
- **expands** a subject with the questions, options and branches you haven't thought of,
  always labelled as suggestions
- **recalls** any subject as a one-glance brief, an open-items checklist or an
  options / decision tree, plus a periodic digest

Subjects can be a **topic**, **person**, **talk**, **decision** or **project**. A
*talk* turns into a talk-time checklist, so you walk into a conversation with every
path and question you worked out, and afterwards you capture the outcome.

## Status

🧭 **Design phase.** No code yet. The research and product decisions are in `docs/`:

| Doc | What's in it |
|---|---|
| [Product vision](docs/product/vision.md) | Problem, core loop, subject kinds, kickoff decisions |
| [Name review](docs/product/naming.md) | Why *Mullwise*, and why not "RTO" |
| [Competitive landscape](docs/research/competitive-landscape.md) | ~40 products, what's defensible, pitfalls to avoid |
| [Verified platform & engineering facts](docs/research/platform-and-engineering-facts.md) | Fact-checked Claude, MCP, GitHub and tooling facts that the design relies on |

The architecture, roadmap, threat model and testing strategy land next.

## Principles

- **Private by default.** Thoughts live in an encrypted local store. Nothing leaves
  your machine except what Claude reads to answer you, and we say exactly what that is.
- **You stay in charge.** AI links are labelled and removable. AI restructuring is a
  proposal, never a silent rewrite. Everything can be undone.
- **No lock-in.** Full Markdown/JSON export at any time.

## Contributing & security

- [CONTRIBUTING.md](CONTRIBUTING.md): every change starts from an issue, gets its own
  branch, and lands through a PR that must pass CI.
- [SECURITY.md](SECURITY.md): report vulnerabilities privately, never in an issue.

## License

[MIT](LICENSE) © 2026 Andrew Stifora.

The license covers this repository's code and original docs. It grants no rights
to the Mullwise name. Third-party product names and quoted excerpts in
`docs/research/` belong to their owners.

---

<sub>Internal codename: RTO (Random Thought Organizer).</sub>
