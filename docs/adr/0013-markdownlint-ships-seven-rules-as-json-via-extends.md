# markdownlint ships seven rules, as JSON, via `extends`

SPEC §10.6 reads: *"markdownlint — a substantial set of rules in dispute."* The dispute is real on paper — the two repos' `.markdownlint.json` files share 8 entries and diverge on 14 — and the entry is still wrong about it. **There is no dispute, because one of the two repos has never run the tool.** What ships is seven rules, chosen by a criterion neither repo's config uses, in JSON, consumed through markdownlint's own `extends`.

This is the sixth backlog item measured. It is the second to be *reframed* rather than confirmed, and the first where the deciding evidence came from outside the repos entirely — the maintainer's account of where these files come from.

## The measurement

### The configs, as they stand

| | `uxlab` (application) | `nuxt-kickstart` (template) |
|---|---|---|
| Rules disabled | 9 | 21 |
| Of those, actually fire | **9 of 9** | **12 of 21** — 9 are stale |
| Rules firing but *not* disabled | **0** | **5** (281 hits) |
| Under its own config | **exit 0, clean** | **exit 1, 281 hits** |
| Invoked by | a `lint:md` script, run by hand | **nothing** — no script, no CI, no hook |

Under stock defaults the application repo has 6,727 hits across 750 files and the template 1,317 across 116. The application repo's nine suppressions are *exactly* the nine rules that fire in it: a config calibrated by someone actually running the tool. The template's is not — nine of its entries silence rules that fire nowhere, and five rules fire that it does not silence.

markdownlint in the template is **dead config** by `CONTEXT.md`'s definition: installed, configured, invoked by nothing.

### Why "8 agreed rules" is not agreement

The obvious reading is that the 8 shared entries are the shippable agreement and the 14 divergent ones are the dispute. That reading fails on provenance. **These files are carried between projects and edited, never authored against the repo they land in** — stated by the maintainer, and consistent with everything measured: an overlap between a calibrated config and one that has never been executed is inheritance, not consensus.

That is [ADR-0009](./0009-the-accessibility-gap-is-three-rules.md)'s lesson arriving in a new costume. There the trap was *silence* read as agreement. Here it is an unrun config that looks like a considered position because it is the same shape as one.

### The criterion that replaces it

A rule ships only if it **fires in both repos under stock defaults** *and* **survives `markdownlint --fix`**. The first half tests that both repos actually need it. The second separates policy from unfixed formatting.

Running `--fix` on copies and re-measuring:

| | stock | after `--fix` | auto-fixable |
|---|---|---|---|
| `uxlab` | 6,727 | 6,519 | 208 (3%) |
| `nuxt-kickstart` | 1,317 | 971 | **346 (26%)** |

Seven rules survive in both:

| Rule | `uxlab` | `nk` | |
|---|---|---|---|
| `MD013` | 5,474 | 839 | line length |
| `MD060` | 279 | 62 | table column alignment |
| `MD033` | 215 | 9 | inline HTML |
| `MD036` | 161 | 10 | emphasis as heading |
| `MD025` | 142 | 16 | multiple top-level headings |
| `MD040` | 128 | 26 | fenced code without language |
| `MD024` | 83 | 4 | duplicate headings |

**Three exclusions, each for a different reason:**

- **`MD034` — disabled in both repos, and dropped.** Bare URLs are 100% auto-fixable: 158 hits in the application repo, 8 in the template, **zero after `--fix`**. Disabling it is a decision to keep bare URLs rather than run the fixer once — a house style, not a shared need.
- **`MD041` — disabled in both repos, and dropped.** It fires 37 times in the application repo and **zero** times in the template. ADR-0009's rule applies: a repo that has never had occasion to hold a view has not agreed. It stays local, and the application repo carries it as an override.
- **The template's other 13.** `MD007`, `MD022`, `MD028`, `MD031`, `MD032` are nearly all auto-fixable and fire nowhere in the application repo; the remaining 8 (`MD001`, `MD003`, `MD018`, `MD023`, `MD026`, `MD046`, `MD051`, `MD053`) fire in neither repo at all. Unfixed formatting and inherited noise.

### `MD013` is disabled, not tuned, and that was measured

It was the one candidate for tuning rather than disabling — it takes `line_length`, `tables` and `code_blocks` options, and disabling the largest rule outright deserves resistance. Measured across both repos:

| Setting | `uxlab` | `nk` |
|---|---|---|
| default (80) | 5,474 | 838 |
| `tables: false, code_blocks: false` | 4,618 | 433 |
| + `line_length: 120` | 2,279 | 234 |
| + `line_length: 160` | 1,292 | 128 |

No setting reaches zero, and a rule nobody can get to zero is a permanent red rather than a guard. So it ships as `false`.

Worth recording for whoever revisits it: the content is **not** uniformly unwrapped. Across 65,467 non-blank lines of authored markdown in the application repo, 90.1% already fit inside 80 characters; 4.7% exceed 120 and 1.4% exceed 240, with a longest line of 5,237. The violations are a long tail, not a house style — which means a cleanup could make this rule enforceable later, unlike the others here.

## The mechanism was decided by measurement, not preference

markdownlint has **no composition point that accepts a JavaScript module**, and finding that out was most of the work:

| Form | Result |
|---|---|
| `.markdownlint.json` / `.yaml` | auto-discovered, applied |
| `.markdownlint.mjs` | **not auto-discovered** |
| `.markdownlint.cjs` | **not auto-discovered** |
| `-c preset.mjs` | **fails to parse** — tries JSON(C)/TOML/YAML only |
| `-c preset.cjs` | applied |
| `extends: "./preset.json"` | applied, and a local key overrides it |
| `extends: "./preset.mjs"` | **silently ignored — no error, no rules applied** |
| `extends: "@scope/pkg/subpath"` → JSON | **applied, and composes with local overrides** |

The last row is the design. A consumer writes:

```json
{
  "extends": "@victortolbert/preflight/markdownlint",
  "MD041": false
}
```

This is [ADR-0007](./0007-commitlint-presets-are-consumed-via-extends.md)'s shape for the second time, and for the same class of reason: the tool has its own reference mechanism, so Preflight uses it rather than inventing one. It stays a **preset** — never written into the consumer, composed at the point of use — so [ADR-0004](./0004-presets-are-composable-options-objects.md) still describes the package and no managed file is added.

**That last point is worth its own sentence, because it is a version-contract question.** [ADR-0010](./0010-the-version-contract.md) makes adding a managed file breaking — a `0.4.0` — since it lands as drift in a repo that chose nothing. A preset consumed by `extends` adds nothing to any repo until that repo writes the line, so this is additive and ships as a patch.

## Considered Options

- **Ship the 8 shared entries.** Rejected: it centralises one repo's calibration plus another's inherited boilerplate and calls the overlap consensus. Two of the eight — `MD034` and `MD041` — fail the criterion above.
- **Ship the application repo's 9, since that config demonstrably works.** Rejected for the same reason in the other direction. It works *for that repo*; `MD041` fires in nothing else, and SPEC §2 ships agreement rather than the better-tested party's preferences.
- **Ship a managed `.markdownlint.json`.** Genuinely tempting, because the problem being solved is a file copied between projects and never standardised, and a managed file is what stops that. Rejected on cost and fit: it is breaking under ADR-0010, it is all-or-nothing (a consumer needing one extra rule must go `unmanaged` and lose the whole thing), and `extends` already provides composition that managed files cannot.
- **Tune `MD013` rather than disable it.** Rejected on the table above — 1,292 standing violations at the most permissive setting tested.
- **Ship nothing until the template runs the tool.** This was the recommendation before the provenance was known, and it was wrong. Waiting for the template to form a position assumes a position is forming; these files have been inherited across projects without one for as long as they have existed. Deferring would have waited for an event with no cause.

## Consequences

**Adoption changes both repos, in opposite directions.** The template gains a config that reflects its content for the first time — after `--fix` and this preset it sits at 5 remaining hits, from 281. The application repo *loses* clean status unless it carries `MD041` locally: 37 hits without it. Both are recorded here so neither arrives as a surprise, and the application repo's override is SPEC §4's "declared at the point of divergence" working exactly as intended.

**Neither repo runs markdownlint in CI, and this does not change that.** The template has no script at all; the application repo has `lint:md` and nothing calls it. A preset does not make a tool run — [ADR-0008](./0008-commit-linting-is-opt-in.md) made that argument for commitlint and it holds here. Wiring it is the consumers' decision.

**A silent failure mode is now pinned by a test.** `extends` ignores an ESM target without erroring, so retargeting this subpath at a `.mjs` would leave every consumer's config resolving and doing nothing — a breaking change disguised as a build tidy-up. `test/stability.test.ts` asserts the subpath still points at the `.json`.

**This preset ships outside `dist`.** It is authored JSON rather than built output, because the consumable artifact *is* JSON and emitting an unused `.mjs` alongside it would be the dead surface [ADR-0003](./0003-drop-skills-json-as-dead-config.md) exists to prevent. `files` carries `presets` for that reason, asserted in the version-contract tests.

**What would change the answer.** The template running markdownlint and triaging its content, which would turn its config from inheritance into a position and make a genuine comparison possible for the first time. A markdown cleanup in the application repo, which could make `MD013` enforceable rather than permanently red. Or markdownlint gaining ESM config support, which would make the JSON-only constraint historical.

**A method note.** Measuring "stock defaults" here required explicitly re-enabling every rule by name: markdownlint-cli **merges** a discovered `.markdownlint.json` with `--config` per key, so `--config '{}'` silently falls back to the repo's own config and `--config '{"default": true}'` does not undo an explicit `MD013: false`. The same file produced 21 violations outside the repo and 0 inside it. ADR-0009's eslint method — strip the config, run, restore — does not transfer, and the failure is silent in both directions.
