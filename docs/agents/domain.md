# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

This repo is **single-context**: one `CONTEXT.md` and one `docs/adr/` at the root.

## Before exploring, read these

- **`SPEC.md`** at the repo root — decision-complete for v1, and the source of truth for scope. Read it before proposing anything that changes what Preflight ships.
- **`CONTEXT.md`** at the repo root — the glossary and ubiquitous language.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in.

If `CONTEXT.md` or `docs/adr/` don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill creates them lazily when terms or decisions actually get resolved.

## File structure

```
/
├── SPEC.md
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-example-decision.md
│   └── 0002-another-decision.md
└── src/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Terms already fixed by SPEC.md

Use these as written; they carry precise meanings in this project:

- **preset** — configuration consumed by reference via a subpath export. Cannot drift.
- **managed file** — a file the CLI writes and tracks by hash in `preflight-lock.json`.
- **unmanaged** — a managed file a consumer has explicitly opted out of, declared in `preflight.config.ts`. Distinct from *drift*, which is unexplained divergence.
- **drift** — divergence in a managed file that has not been declared. What `preflight check` fails on.

## Flag ADR conflicts

If your output contradicts an existing ADR — or `SPEC.md` — surface it explicitly rather than silently overriding:

> _Contradicts SPEC §2 (five-file scope) — but worth reopening because…_
