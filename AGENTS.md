# AGENTS.md

## Agent skills

### Publishing

**This repo is publicly representative of its author, not of any employer or client.** It governs every world-readable surface — docs, issues, PR bodies and titles, commit messages, and anything shipped in the tarball. Read it before writing on any of them. See `docs/agents/publishing.md`, and [ADR-0019](./docs/adr/0019-this-repo-represents-its-author-not-an-employer.md) for why.

### Issue tracker

Issues live as GitHub issues on `victortolbert/preflight`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Evidence

An empirical claim carries its evidence — a file path, a command, or a URL — or it carries the word *inferred*. See `docs/agents/evidence-grading.md`.

## What this repo is

The public, generic Preflight package. [`SPEC.md`](./SPEC.md) is decision-complete and is the source of truth for what v1 should be; read it before proposing changes to scope.

**Preflight is upstream.** Real-world use happens in private consuming projects. Findings from those projects flow back here **generalized — by role, never by name, and never as verbatim internal detail** — on every surface, not just the tracker. That direction of flow is what keeps this repo safe to publish, and it is a property to preserve, not a habit to rely on. `docs/agents/publishing.md` states what that costs in practice.
