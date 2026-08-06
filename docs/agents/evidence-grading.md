# Evidence Grading

How to write claims in this repo's documents so that an unchecked assertion is visible before it ships.

## The rule

> **An empirical claim carries its evidence — a file path, a command, or a URL — or it carries the word *inferred*.**

That is the whole convention. It is not a request to verify everything; it is a request to say which you did.

## What counts as an empirical claim

A statement about the world that is either true or false right now:

- what a tool does, or whether it is installed
- what a file contains
- what a command printed, or what a CI run showed
- the state of another repo, branch, or deployment

**Not** decisions, rationale, or definitions. A decision is made, not verified — "we ship five files because the disputes cost more than they return" needs an argument, not a citation. Don't grade ADR reasoning, `CONTEXT.md` entries, or scope calls. Grading everything is how a convention gets dropped.

## What counts as evidence

Name the thing you actually opened, and prefer the primary artifact over anything describing it:

| Evidence | Not evidence |
|---|---|
| `src/cli.ts:42` | "the CLI does X" |
| the output of `pnpm why taze` | "taze is a dependency" |
| an unpacked tarball, grepped | a package's README or description |
| the URL of the failing check | the check's display name |

A package description, a log line you did not see in full, and a config file written for a different tool are all *about* the thing. They are not the thing.

## Worked example

This repo shipped `.nvmrc` as `24`. The real file is `v24` — one byte, and enough to make `preflight sync` rewrite the file in both consuming repos on first contact. See [ADR-0005](../adr/0005-shipped-template-content-is-provisional.md)'s Resolution.

Under this rule the error would have been legible while it was being written:

> ✅ `.nvmrc` is `v24` — read from both consuming repos.
>
> ✅ `.nvmrc` should be `24` — **inferred** from `.github/workflows/ci.yml`, which hardcodes `node-version: 24`. Not read from `.nvmrc` itself.
>
> ❌ `.nvmrc` should be `24`. This one is well founded.

The middle line is the point. It is honest, it costs nothing to write, and it puts the gap in the reader's eye — a version pin inferred from a *different file, in a different syntax, written by a different hand* — at the moment someone could still act on it. The third line is what was actually written.

[ADR-0003](../adr/0003-drop-skills-json-as-dead-config.md) shows the rule already being followed, before it had a name: *"this was checked by unpacking all three published tarballs and grepping them, not inferred from their descriptions."* Match that.

## Why this exists rather than a reminder

Four confident claims in this project turned out to be inferences — counted in [ADR-0006](../adr/0006-ci-workflows-are-not-yet-shareable.md), which is itself the fourth. One of them, per ADR-0003, *"survived a specification, a ticket, and this ADR's own addendum, and was wrong the whole time — because every one of those described the file instead of opening it."*

The lesson has been restated after each. It keeps needing restatement because it depends on remembering at the moment of writing, and `SPEC.md` §7 settled an analogous problem the other way, on the grounds that **boundaries which depend on remembering do not hold**. A citation is an artifact. It survives the session, and it is checkable in review by someone who was not there.

## Where it applies

ADRs, issues, handoffs, and PR descriptions — anywhere a claim outlives the session that made it. Not source comments or commit subjects.

## Do not retrofit

Apply it going forward. Backfilling citations across settled ADRs is busywork, and those decisions are already made.

The first place it earns its keep is the **v2 backlog**. ADR-0006 records that SPEC §10's ordering was reasoned rather than counted, that counting reversed the top item, and that *"the v2 backlog's remaining items were ordered by the same method, and should be assumed to need the same check."* Measurement work is dense with empirical claims — grade them as they are made, and the reasoned-versus-measured distinction stops being a caveat in a footer.
