# The test toolchain ships nothing, and the silence was in the config

SPEC §10.8 reads: *"tsconfig, vitest, playwright — and with them, the version-pinning and catalog questions return with real weight, since these are tools whose version differences change results silently rather than loudly."*

It is the only backlog entry that predicts a **failure mode** rather than a disagreement, and the prediction was right: something in this toolchain is silently wrong. It is not the versions, and it is not in a file this item would have led anyone to open.

Nothing ships. This is the eighth and last of §10's original items to be measured.

## The risk the entry names is not there

### Versions

Installed rather than declared, since declared ranges overlap and say nothing about what runs:

| | the application repo | the template |
|---|---|---|
| `typescript` | 6.0.3 | **6.0.3 — identical** |
| `vitest` | 4.1.10 | 4.1.8 |
| `@playwright/test` | 1.62.1 | 1.60.0 |
| `vue-tsc` | 3.3.9 | 3.3.5 |
| `happy-dom` | 20.11.1 | 20.10.3 |

Every gap sits inside overlapping caret ranges, so it is **lockfile age rather than policy** — the same finding [ADR-0011](./0011-the-eslint-style-dispute-is-two-rules-and-both-stay-local.md) reached for `@antfu/eslint-config` 9.2.0 against 9.3.0. And TypeScript, the one tool here where a version difference genuinely would change results without saying so, is **identical in both**.

### Catalogs

The entry says the catalog question "returns with real weight." Both repos have a `pnpm-workspace.yaml`, **neither defines a `catalog` key**, and **zero** dependencies in either use `catalog:`. It is not a question the repos have answered differently; it is one nobody has asked.

## The silence is real, and it is in `vitest.config.ts`

Two settings in the application repo are inert, and nothing reports either:

**1. `teardownTimeout: 5000` is inside a project block, where it does nothing.** Vitest's own types settle this — `ProjectConfig = Omit<InlineConfig, NonProjectOptions | "sequencer" | "deps">`, and `NonProjectOptions` lists `teardownTimeout` among the keys a project may not set. **The template repo has it at the root, with a comment explaining exactly this.**

**2. The `e2e` branch of `include: ['test/{e2e,unit}/*.{test,spec}.ts']` matches nothing.** That repo's Playwright specs live at `./e2e`, not `test/e2e/`, which holds zero files.

So **the template's test config is more correct than the application's** — in the repo that does not run end-to-end tests in CI, against the one that does. Neither error is loud; neither is a version; and the item's framing would have sent a reader to the lockfiles.

## The three files, measured

| File | Finding |
|---|---|
| `tsconfig.json` | A 17-line diff carrying **one** semantic difference — the template adds a fifth project reference for a local directory. The four Nuxt references are identical, and the rest of the diff is formatting: one repo expands each object across four lines, the other writes them inline. It is a Nuxt-generated stub either way. |
| `vitest.config.ts` | ~93% identical, and the shared part is the problem — see below. |
| `playwright.config.ts` | **Genuinely divergent**: 115 lines against 43, different `testDir`, an auth-setup project and five specs and a full CI job on one side against one spec and no CI reference at all on the other. |

### Why the 93% cannot ship

The shared portion of `vitest.config.ts` is not configuration data. It is **module-level structure that has to execute in the consumer**:

- a `structuredClone` monkey-patch, working around a `@nuxt/test-utils` behaviour — a side effect at import time, not an options object
- a `sharedAlias` map built from `fileURLToPath(new URL('./shared', import.meta.url))`, which resolves relative to *the file it is written in*

[ADR-0004](./0004-presets-are-composable-options-objects.md) defines a preset as a typed options object the consumer spreads. Neither of these is one: a side effect cannot be spread, and a path computed from `import.meta.url` computes the wrong path the moment it moves into this package. This is [ADR-0007](./0007-commitlint-presets-are-consumed-via-extends.md)'s "carries resolvable references" in a new form — except commitlint had `extends` to fall back on, and there is no equivalent here.

The residue that *is* portable is the `coverage` block, byte-identical in both. It encodes one shared directory layout (`app/composables`, `server/**`, `lib/**`), which both repos have because one was scaffolded from the other. Shipping it would centralise a layout rather than a policy — [ADR-0009](./0009-the-accessibility-gap-is-three-rules.md)'s caution that the current sample cannot distinguish "describes these two repos" from "describes the package."

## Considered Options

- **Ship the coverage block.** Rejected on the layout argument above. It is real agreement, and agreement about a directory structure that a third consumer would not share.
- **Ship a `tsconfig.json` template as a managed file.** Rejected: the file is a Nuxt-generated stub whose only variation is one repo-specific project reference, and a managed file cannot express "these four references plus whatever you need." It would also cost another breaking release ([ADR-0010](./0010-the-version-contract.md)) to manage a file neither repo hand-writes.
- **Ship a `playwright.config.ts` template.** Rejected on the measurement — this is [ADR-0006](./0006-ci-workflows-are-not-yet-shareable.md)'s finding again, in the file CI runs rather than the workflow that runs it. One repo has an auth fixture, a database migration step and five specs; the other has one spec and no runner.
- **Pin versions, or introduce a catalog.** Rejected as solving a problem that does not exist: the skew is lockfile age within compatible ranges, and neither repo uses catalogs at all.

## Consequences

**§10.8 closes with nothing shipped**, which makes it the second item to do so after §10.4 — but for a different reason. §10.4's sentence was true and the dispute was real; this one names a risk that is absent while correctly predicting a failure it does not locate.

**Two inert settings belong to the application repo, not here.** Preflight ships configuration and does not fix consumers' files ([ADR-0009](./0009-the-accessibility-gap-is-three-rules.md) declined the same thing for five accessibility defects). The `teardownTimeout` fix is a two-line move the application repo can copy verbatim from the template, comment included.

**A method note, and this one closes the section.** Eight of §10's original items are now measured, and **not one was confirmed as written**. They were reversed (§10.3), reframed (§10.2), reinterpreted (§10.1), closed-with-nothing-shipped (§10.4), found *bigger* than stated (§10.5), dissolved entirely (§10.6), right-about-the-file-wrong-about-the-scope (§10.7), and now wrong-about-the-mechanism (§10.8). SPEC §247 warned the ordering was reasoned rather than measured and predicted that measuring could move an item in any direction. Eight for eight, it did — and the more useful lesson is narrower than "the backlog was wrong": **every entry described a file, and every entry was written by someone who had not opened it.** That is the failure Preflight exists to catch, and this section is the largest instance of it in the project's own documentation.
