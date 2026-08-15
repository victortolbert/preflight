# The eslint style dispute is two rules, and both stay local

SPEC §10.4 deferred eslint because the consuming repos "answered style questions in opposite directions." Measuring finds the sentence true and the item closeable anyway. The disagreement is **two rules**. Both are deliberate, both are cheap to leave alone, and centralising either would make one repo materially worse to buy nothing. **Preflight ships nothing for eslint style.** The item closes as resolved rather than blocked.

This is the fourth backlog item reframed rather than confirmed by measuring it, after [ADR-0007](./0007-commitlint-presets-are-consumed-via-extends.md) and [ADR-0008](./0008-commit-linting-is-opt-in.md) (item 2), [ADR-0009](./0009-the-accessibility-gap-is-three-rules.md) (item 1), and the §10.3 re-measurement. Unlike those three, this one ends with nothing to ship — which is a result, not a failure to find one.

## The measurement

`eslint --print-config` was run in each repo against the same two paths, and the resolved rule sets compared by name, severity, and options. `pnpm exec` writes `Already up to date` to stdout, which corrupts the JSON; the captures were stripped to the first `{` before parsing.

| | `nuxt.config.ts` | `app/app.vue` |
|---|---|---|
| `uxlab` rules | 361 | 502 |
| `nuxt-kickstart` rules | 360 | 516 |
| Identical — name, severity **and** options | **358** | **487** |
| Severity disagreements | **0** | **11** |

The headline is agreement, and stopping there is this section's characteristic error: the residue is small, but it is precisely the disputed part. Reading 487/517 as "settled" would repeat SPEC §10's warning almost exactly.

### The 11 severity disagreements

Ten are the documented `vue-a11y` suppressions, already owned by [ADR-0009](./0009-the-accessibility-gap-is-three-rules.md) and item 1. The eleventh is `vue/html-self-closing`, which turns out not to be a disagreement at all — see below.

## A correction to the previous pass

An earlier reading of this measurement recorded **three** disputed rules and stated that all three were "set explicitly in both repos." That is wrong for `vue/html-self-closing`: `uxlab` does not set it anywhere. It takes `@antfu/eslint-config`'s default of `warn`, and the only explicit setting is the template's.

The error mattered. "Both repos chose opposite values" and "one repo chose, the other never expressed a preference" are different problems with different answers, and only the first is a dispute.

## The two genuine disputes

Both are set explicitly in both repos, in opposite directions, and every hit is autofixable — so the cost is diff churn and review burden, not manual work.

| Rule | `uxlab` | `nuxt-kickstart` | Cost to converge on the other's |
|---|---|---|---|
| `vue/component-name-in-template-casing` | `PascalCase` | `kebab-case` | uxlab: 1,782 hits / **264 of 301** linted `app/` SFCs · nk: 1,168 hits / **138 of 159** |
| `vue/block-order` | `template, style, script` | `template, script, style` | uxlab: 69 hits / 69 files · nk: 39 hits / 39 files |

**What the denominators count**, since the two repos' happen to mean different things. `301` and `159` are the `.vue` files **eslint lints under `app/`**, which is the population either rule could act on. For `nuxt-kickstart` that is also its entire tracked set — all 159 `.vue` files live under `app/` and none are ignored, so tracked, linted and `app/`-scoped all coincide. For `uxlab` they do not: `git ls-files '*.vue'` reports **307**, of which 303 are under `app/`, and eslint ignores 2 of those as vendored Video.js DOM snapshots — hence 301. The other 4 are one stray `error-1.vue` at the repo root and three files inside `uxlab-eds-starter/prototype/`, a nested prototype. That coincidence in the template is why the mismatch went unlabelled: checking `159` against `git ls-files` confirms it, and checking `301` the same way does not. Verified 2026-08-15; `uxlab`'s `.vue` count has been 307 for at least 120 commits, so this was the state when this ADR was written and not later drift.

**Neither centralises, because the two repos have genuinely different audiences.** The template's `kebab-case` makes its templates read as HTML, which is what a starter's snippets are for — it enforces this on framework components too, so it writes `<nuxt-page>` and `<u-button>`. The application repo's `PascalCase` matches the Vue SFC style guide and the Nuxt UI documentation its components are written against. Each is right where it sits.

This is SPEC §2's principle arriving at its own edge case. "Ship the agreement, defer the disputes" was written expecting the disputes to be adjudicated later. Measured, these two have no later: there is no version of the rule that serves both repos, and imposing either rewrites ~90% of the losing repo's Vue files to make its templates read worse. Deferral was never a delay — it was the answer.

`vue/block-order` is cheap enough to converge (39–69 files) and was offered on those terms. It stays local for the same reason: cheapness is not a reason to standardise something neither repo is suffering from.

## The third rule is not a dispute

`vue/html-self-closing` is set only by the template, to `error` with `component: 'never'`, and it carries its reason:

```js
// Force explicit closing tags on components so snippets work in
// browsers via CDN (native HTML doesn't honor self-closing on
// custom elements).
```

That rationale is specific to being a template whose markup gets pasted into a browser. The application repo is not a snippet source, so the reason does not transfer — and adopting the rule there would cost 1,031 autofixable hits across 196 files in service of a constraint it does not have. It stays local to the template, which is exactly the "declared at the point of divergence" shape SPEC §4 describes.

## An unrelated finding: 15 unicorn rules stopped applying to `.vue`

Not a style question, but found by the same measurement and worth recording where the numbers are.

`@antfu/eslint-config` **9.1.0** scoped its unicorn block to `files: [GLOB_SRC]` — `**/*.?([cm])[jt]s?(x)`, which excludes `.vue`. Before that the block was unscoped. The repos sat on either side of the change (`uxlab` 9.2.0, `nuxt-kickstart` 9.0.0), so 15 unicorn rules silently stopped applying to `uxlab`'s Vue SFCs at upgrade, with nothing in either config to record it.

Where the **15** comes from, since it is otherwise unreproducible: the config enables **16** unicorn rules on a plain `.ts` file, and exactly one of them — `unicorn/filename-case` — is still applied to `.vue` by a separate block. The other 15 are the ones that fell out.

**Preflight ships no preset to restore them**, for three reasons measured in order:

1. **It costs nothing today.** Re-enabling all 15 rules across both repos' Vue files finds **0 violations** — 0 in `uxlab`'s 301 linted `app/` SFCs, 0 in `nuxt-kickstart`'s 159. Re-run on 2026-08-15 over the 6 `.vue` files that denominator excludes — the 2 ignored snapshots and the 4 outside `app/` — also finds **0**, so the result holds across all 307 and does not depend on the scoping.
2. **Upstream did it on purpose.** The change is [`8207876`](https://github.com/antfu/eslint-config/commit/8207876), released in 9.1.0 as `fix: update deps and scope unicorn rules`. It splits plugin registration from rule application so the rules stop firing on non-source files. `.vue` falling out is an unremarked consequence rather than a stated goal, but the commit is deliberate and no upstream issue reports the side effect.
3. **A preset guarding zero violations is the thing [ADR-0003](./0003-drop-skills-json-as-dead-config.md) exists to prevent.** Shipping one would mean a package release and an adoption PR in each consumer, to override a considered upstream decision, for no measured defect.

What *does* ship is version alignment: both repos already declare `^9.x`, so the skew was lockfile age rather than policy, and both move to 9.3.0. Diffing 9.2.0 against 9.3.0 finds a single changed line — an internal bundling change, `erasable-syntax-only` moving from an inlined chunk to a package import — and no rule changes at all.

## Decision

- **Preflight ships nothing for eslint style.** SPEC §10.4 closes as resolved.
- `vue/component-name-in-template-casing` and `vue/block-order` stay local and divergent, with the reason recorded here rather than left as "opposite directions."
- `vue/html-self-closing` stays local to the template, with its existing rationale.
- Both consumers move to `@antfu/eslint-config` 9.3.0, closing the skew.
- The unicorn/`.vue` gap is accepted as known and costless.

## What would change the answer

- **A measured violation.** If either repo accrues real unicorn hits in Vue `<script>` blocks, the gap stops being free and a preset becomes proportionate. The check is cheap — re-run the 15 rules against `**/*.vue`.
- **A third consumer.** Two repos with opposite, defensible conventions is a genuine split. A third arriving would break the tie, and would also be the first evidence that either convention generalises.
- **Upstream reversing the scoping**, or accepting a fix that restores `.vue`, which would remove the gap without Preflight owning anything.
- **The repos converging on their own.** If the template ever stops being a snippet source, or the application repo adopts kebab-case for unrelated reasons, the dispute dissolves and the rules become shippable agreement.
