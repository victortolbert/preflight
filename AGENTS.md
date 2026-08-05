# AGENTS.md

## Agent skills

### Issue tracker

Issues live as GitHub issues on `victortolbert/preflight`, via the `gh` CLI. **This repo is public — see the sanitization rule** in `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## What this repo is

The public, generic Preflight package. [`SPEC.md`](./SPEC.md) is decision-complete and is the source of truth for what v1 should be; read it before proposing changes to scope.

**Preflight is upstream.** Real-world use happens in private consuming projects. Findings from those projects flow back here as sanitized public issues — never as verbatim internal detail. That direction of flow is what keeps this repo safe to publish, and it is a property to preserve, not a habit to rely on.
