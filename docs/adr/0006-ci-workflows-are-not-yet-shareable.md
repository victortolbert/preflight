# CI workflows are not yet shareable

CI workflows stay deferred. SPEC §10 ranks them third in the v2 backlog and notes they would close residual risk #1, which made them look like the obvious first v2 item once v1 shipped. Measuring the two consuming repos says otherwise: **there is no agreement to centralize**, and SPEC §2's principle is to ship the agreement, not to manufacture one.

This ADR exists because the opposite conclusion was reached first, from the same SPEC text, without measuring.

## The measurement

Action references across the three repos, counted from `.github/workflows/`:

| Repo | References | SHA-pinned | Floating |
|---|---|---|---|
| `preflight-pkg` | 6 | 6 | 0 |
| `uxlab` (application) | 19 | 11 | 8 |
| `nuxt-kickstart` (template) | 7 | 0 | 7 |

SPEC §8 recorded that "the application repo SHA-pins its CI actions … the template still uses the floating tag." That is true and incomplete. The application repo pins *some* of them, and three actions appear **both ways inside it**:

| Action | Pinned | Floating |
|---|---|---|
| `actions/checkout` | 2 | 3 |
| `actions/setup-node` | 1 | 3 |
| `actions/upload-artifact` | 2 | 2 |

So this is not one repo ahead of another. It is a migration that stopped halfway in one repo and never started in the other. There is no policy here to extract — only an intention, partially acted on.

The same skew shows in a single action across all three repos: `pnpm/action-setup` is `@v4` (floating) in the template, SHA-pinned at `v6.0.8` in the application, and at `v6.0.10` here.

**And the files could not be shared even if the pinning agreed.** `uxlab`'s `test.yml` carries a 52-line `e2e` job — Playwright browser install, a Drizzle migration against a local SQLite file, artifact upload — that the template has no use for. That is SPEC §8's *legitimate divergence*, the fourth of its five drift phenomena, and it is permanent rather than pending.

## Considered Options

- **Manage the workflow files, as `.nvmrc` and `axe-linter.yml` are managed.** Fails immediately: the files are not byte-identical, the pinning they would carry is not agreed, and the `e2e` job means a single shared file cannot exist.
- **Ship a reusable workflow or composite action that consumers call.** This is a third distribution mechanism. SPEC §4 chose exactly two — preset and CLI-written file — and rejected further inventions on the grounds that they discard the ecosystem's own composition points. A reusable workflow is a real composition point, so this is the option most worth revisiting; but it is a scope decision about what Preflight *is*, not an implementation detail, and it should not be taken to close one risk.
- **Extend `preflight check` to assert that actions are SHA-pinned.** Directly forecloseded by [ADR-0002](./0002-compliance-is-exactly-preflight-check.md): compliance is exactly `preflight check`, which fails on drift in a managed, non-opted-out file and asserts *"nothing beyond"* that. Adding a lint-like assertion would reintroduce the broader "compliance" notion that ADR removed from the project's language.

## Consequences

**Residual risk #1 stays open.** Each consuming repo hand-adds `preflight check` to CI, and that step can be deleted. Both repos have now added it, so the risk is realized-but-covered rather than closed. Nothing in v1 or this decision changes that.

**The useful work is in the consuming repos, not here.** Normalizing action pinning across both — 15 floating references between them, and one action at three different versions — has real security value on its own, needs no Preflight mechanism, and is the thing that would *create* the agreement this ADR finds missing. That is the order SPEC §2 describes: consensus first, then something to preserve it.

**What would change the answer.** Both repos pinning every action, by the same convention, and staying that way through a few dependency bumps. At that point the pinning is demonstrably shared policy rather than one person's half-finished migration, and the reusable-workflow option above becomes worth its scope decision.

**A caution this ADR is itself an instance of.** SPEC §10's ordering was set during planning, from an audit that had characterized the CI drift correctly but not counted it. Reading the SPEC and reasoning forward produced "CI workflows are the obvious next item." Counting produced the opposite. That is the fourth time in this project that a confident claim about a file turned out to be an inference about it — see [ADR-0003](./0003-drop-skills-json-as-dead-config.md)'s addendum and [ADR-0005](./0005-shipped-template-content-is-provisional.md)'s resolution for the others. The v2 backlog's remaining items were ordered by the same method, and should be assumed to need the same check.
