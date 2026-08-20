# This repo represents its author, not an employer

This package is public. The projects it is measured against are private, and some of them are professional work — exploratory repos that carry an employer's systems, terminology, and in places their code. Until now the only rule governing what could be said about them was scoped to the issue tracker, and the surfaces carrying the most detail were governed by nothing.

The rule this ADR states is one sentence: **the public surface is representative of the author, not of any employer or client.** Its operational form is [`docs/agents/publishing.md`](../agents/publishing.md).

## The measurement

An inventory of every mention of the private consuming repos across all 76 tracked files, bucketed by what the mention discloses:

| Bucket | Count |
|---|---|
| Bare name only | **0** |
| Neutral factual state | 30 |
| **Shortcoming, defect, or drift** | **32** |
| **Internal implementation detail** | **41** |
| Total | 103 |

**There is no benign tail.** Every mention sits inside a measurement, which is what this project's method produces and why the count is not a lapse in discipline — it is discipline pointed at the wrong surface.

By surface, against the one rule that existed:

| Surface | Governed | Contents |
|---|---|---|
| Issues | **yes** | 8 issues, 7 compliant |
| PR bodies | no | ~96 lines across ~30 PRs |
| PR **titles** | no | one names a private repo, visible without opening it |
| ADRs, `SPEC.md`, `.gitignore` | no | the 73 sensitive mentions above |
| Shipped source, and the npm tarball | no | a private repo's name, and role prose, in `dist/` |

The single rule was working as written and protecting the least material. That is the failure mode of a rule that names a *surface* instead of a *principle* — and it was written eighteen minutes before this repo's first issue, while the tracker was being set up, which is exactly how a scope gets set by accident.

## Two findings that set the shape

**Role labels were already in use, and were already defeated.** This repo refers to "the template" and "the application repo" **114 times**. Six table header rows bound those roles to names — and one binding de-anonymizes every role reference a reader encounters afterwards, in that file and every other. The generalized form was in place and leaking through six cells.

**Nothing load-bearing needed a name.** Checked against the inventory rather than assumed: what carries the arguments here is the *relationship* between repos — that two share ancestry so their agreement is inheritance, that a third does not so its agreement is finally evidence. Roles express all of that. A count attached to a role argues exactly as well as a count attached to a name.

Those two together are why the remedy is cheap. The expensive-sounding version — redact 103 mentions — is not the one that matters; cutting six bindings is.

## Considered Options

- **Make the repo private.** Rejected. It solves a writing problem with infrastructure, and it destroys the upstream/downstream discipline that keeps this package generic — a boundary only has teeth while there is something to cross. It also would not reach the published tarball.
- **Widen the existing tracker rule in place.** Rejected: it repeats the original mistake, leaving the principle in a file named after one surface.
- **Redact repository names everywhere, mechanically.** Rejected as both too much and too little. Too much, because role labels lose nothing and reading the ADRs would degrade for no gain. Too little, because names are not the only exposure — paths, SHAs, links, hostnames and deployment detail are, and a name-only sweep would have left them.
- **Rewrite history and force-push.** Rejected. Redaction's value is against casual discovery, not determined investigation, and a force-push on a published package's repo buys very little of the latter while costing real risk.
- **State the principle, apply it to every surface, and fix facts at source where possible** — chosen.

## Consequences

`docs/agents/publishing.md` governs every world-readable surface, including PR titles, commit messages, and anything shipped in the tarball. `AGENTS.md` points at it, and `docs/agents/issue-tracker.md` defers to it rather than carrying its own copy.

**The author's own identifiers stay.** Personal accounts, domains, and a sole proprietorship are what a repo representing its author should carry; stripping them would work against the rule rather than for it.

**This ADR obeys its own rule**, which is the cheapest available test of whether the rule is writable. Every claim above is stated by role, with exact counts, and nothing is lost.

### Two conventions had to be reconciled

**`evidence-grading.md` requires a file path, a command, or a URL on every empirical claim.** The reconciliation is that evidence is graded *for the person who can check it*, and for anything measured in a private repo that is the maintainer. A role, an exact count, and the command that produced it is fully gradeable; the named form adds nothing a reader outside the project could act on.

**`CONTEXT.md` said the opposite.** Its *Avoid* line instructed authors to "name the repos a finding was measured against" — committed the same day as this ADR, and correct under the convention it was written for. It is superseded here. The instruction it was reaching for survives in the useful form: name the *role*, and never let a plural stand in for a measurement.

**`evidence-grading.md` says "do not retrofit"; this rule does.** The distinction is consequence. Backfilling citations across settled ADRs is busywork against a cost that has already been paid. A disclosure is live until it is removed, so it is worth a sweep — bounded to editing in place, with no history rewrite, on the reasoning above.

## What would change the answer

A consuming repo becoming public would collapse the derivation chain this rule is built around, and the names in it would stop being exposures. That is a decision not yet made for any of them, and it has its own precondition — the repo would have to be clean first, which is the same work by a different route.

The rule would also need revisiting if this package acquired contributors, since "representative of its author" is a criterion with one author in it.
