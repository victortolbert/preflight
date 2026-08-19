# The accessibility gap is three rules, not thirteen

SPEC §10.1 ranks the accessibility gap first in the v2 backlog, describes it as "the only divergence found with user-facing consequence," and calls it "the cheapest to check." Checking it changes the item. The headline divergence — 13 `vue-a11y` overrides in the application repo against 3 in the template — is **mostly a difference in content, not policy**. The agreement worth shipping is three rules, and on the only one where the repos genuinely disagree, the template's answer is already the better one and already carries its rationale.

This is the second backlog item to be reframed rather than confirmed by measuring it. [ADR-0007](./0007-commitlint-presets-are-consumed-via-extends.md) and [ADR-0008](./0008-commit-linting-is-opt-in.md) were the first.

## The measurement

Each repo's `vue-a11y` overrides were removed from `eslint.config.mjs`, leaving `vue: { a11y: true }` in place, and `pnpm exec eslint . --format json` was run. Configs were restored via `git checkout --` and both repos verified byte-clean afterwards.

| | `uxlab` (application) | `nuxt-kickstart` (template) |
|---|---|---|
| Files linted | 801 | 500 |
| Under its own config | 0 `vue-a11y`; 60 errors from unrelated rules | **0 `vue-a11y`, 0 errors, 0 warnings** |
| Under stock a11y defaults | **233** (227 errors + 6 warnings), **13 of 13 rules** | **25** (21 errors + 4 warnings), **3 rules** |
| Overrides carried | 13, all bare `'off'`, no comments | 3 — 2 `'off'`, 1 `'error'` with rationale |

**No suppression is stale.** All 13 of the application repo's rules fire. Taken at face value that vindicates the backlog item, and it is where an earlier reading of this measurement stopped.

### 87 of the 233 are not violations

`vue-a11y/no-aria-hidden-on-focusable` accounts for 92 hits. Resolving every hit to the attribute value on the element it flagged:

| Value | Count | |
|---|---|---|
| `aria-hidden="false"` | **87** | exposes the element — hides nothing |
| `aria-hidden="true"` | **5** | genuine defect |

The rule tests for the attribute's *presence*, never its value — `node_modules/.pnpm/eslint-plugin-vuejs-accessibility@2.5.0_.../dist/rules/no-aria-hidden-on-focusable.js`:

```js
const hasAriaHidden = getElementAttributeValue(node, "aria-hidden");
if (hasAriaHidden && hasFocusableElement(node)) { context.report({ node, messageId: "default" }) }
```

`getElementAttributeValue` returns the string `"false"`, which is truthy, so `aria-hidden="false"` reports. The same file declares `schema: []` — **the rule takes no options and cannot be tuned.** `'off'` is the only available lever, which makes the application repo's suppression the correct call rather than a lapse.

### The template already solved the next-largest rule

`vue-a11y/label-has-for` is the largest rule in both repos under stock defaults. The template does not disable it — `nuxt-kickstart/eslint.config.mjs:94-97` tunes it, with the reason written down:

```js
// default (both) rejects valid patterns with wrapped form controls.
'vue-a11y/label-has-for': ['error', { required: { some: ['nesting', 'id'] } }],
```

| Repo | Stock default | Under the template's tuning |
|---|---|---|
| `nuxt-kickstart` | 21 | **0** |
| `uxlab` | 96 | **46** |

The tuning eliminates the template's hits entirely and halves the application repo's. Those 50 were the false positive the template had already diagnosed; the surviving 46 are real.

### Most of the remainder is one repo's showcase

Applying the template's full ruleset to the application repo leaves 177 hits, of which **127 fall in `app/pages/cwds/` and `app/pages/examples/`** — a 26-file component showcase the template has no equivalent of. 50 are in product code.

**Each repo's override set is exactly the set of rules its own content trips.** The template carries three overrides because three rules fire in it; the application repo carries thirteen because thirteen fire. Neither repo has suppressed a rule it did not need to. The 13-vs-3 gap is a consequence of one repo containing a component gallery, and it is not evidence of disagreement about accessibility policy.

## Considered Options

- **Ship all 13 suppressions as a preset**, on the strength of "none are stale." Rejected: 87 of the hits driving them are a rule bug, 127 of the rest are one repo's showcase, and ten of the thirteen rules never fire in the template at all. This would centralize one repo's content profile and call it agreement — precisely what SPEC §2 says not to do, and what [ADR-0006](./0006-ci-workflows-are-not-yet-shareable.md) declined for CI.
- **Adjudicate the ten disputed rules**, the reading SPEC §10 item 4 anticipates for eslint. Rejected as premature: there is no dispute to adjudicate. The template has never expressed an opinion on those ten, because nothing in it triggers them.
- **Defer the item entirely**, as ADR-0006 deferred CI. Rejected for the reason ADR-0008 gave when it declined the same option: the finding is the opposite one. There *is* measured agreement here — two rules held identically in both repos, and a third where one repo has a tuned answer that demonstrably improves the other. Deferring would discard a result, not avoid a risk.
- **Report the five real defects as part of this work.** Out of scope for Preflight, which ships configuration rather than fixes. They belong in the application repo's tracker (below).

## Consequences

**The item is rescoped, not closed.** What Preflight can ship is a three-rule preset:

| Rule | `uxlab` | `nuxt-kickstart` | Basis |
|---|---|---|---|
| `no-autofocus` | `'off'` | `'off'` | agreed in both |
| `media-has-caption` | `'off'` | `'off'` | agreed in both |
| `label-has-for` | `'off'` | tuned | the one real divergence — the template's tuning is strictly better |

That is a smaller deliverable than rank 1 implied, and a better-founded one. The other ten rules stay in the application repo, where they describe that repo's content.

**This is [ADR-0007](./0007-commitlint-presets-are-consumed-via-extends.md)'s shape again.** SPEC §10.2 found the stock commitlint config "wrong about this project," and the deliverable became a tuned ruleset rather than a guardrail. The same thing happened here twice over — a rule that fires on `aria-hidden="false"`, and a rule whose default rejects valid wrapped form controls. Two of the last three backlog items measured have turned out to be **stock defaults being wrong about this codebase**, which is a pattern worth carrying into the remaining items rather than a coincidence.

**Five genuine defects were found, and are not Preflight's to fix.** `aria-hidden="true"` on focusable elements in `uxlab`, in `app/pages/cwds/50-50-media-callout.vue`, `app/pages/cwds/utility-nav.vue`, and `app/pages/cwds/video-player.vue`. They should be filed there. Finding them is incidental evidence that the three-rule preset is worth having: the suppression hiding them was blanket, and a narrower one would have surfaced them years earlier.

**It narrows a caution [ADR-0005](./0005-shipped-template-content-is-provisional.md) raised.** That ADR noted `axe-linter.yml` sits among the agreed files, so shipping it is in scope, while shipping a *chosen* rule set "edges toward adjudicating the deferred dispute." The dispute is now sized: one rule, `label-has-for`, on which the template holds the better-documented position. The edge ADR-0005 was wary of is narrower than it looked, though the caution itself was correct to raise — that ADR is left as written.

**A caution about the untunable rule.** `no-aria-hidden-on-focusable` cannot be narrowed, so any future decision to enforce it repo-wide requires changing 87 call sites that are not wrong. If that rule is ever wanted, the cheaper path is upstream — the fix is a one-line value check in the plugin.

**What would change the answer.** The template growing content that trips the other ten rules, which would turn silence into a position and give those rules something to agree or disagree about. Failing that, a second application-shaped consumer would test whether the thirteen describe `uxlab` or describe applications generally — the current sample cannot distinguish those.

**A method note, since this ADR is the third instance.** SPEC §247 already warns that the v2 ordering "was reasoned, not measured," citing item 3. Item 1 has now moved too — not reversed like item 3, and not merely rescoped like item 2, but *reinterpreted*: the same 233 violations support "thirteen live suppressions" or "three shareable rules plus a rule bug" depending on whether the hits are resolved to their attribute values. Counting was not enough here; the count had to be read one hit at a time. The remaining backlog items were ordered by the same unmeasured method.

## Addendum, 2026-08-19 — the trigger is available, and the tuning has a residue this ADR did not measure

*What would change the answer* above names two triggers. One of them has fired.

**A second application-shaped consumer exists.** `ams-cloud-eds` adopted Preflight at `1.0.0` and spreads this preset into its `vue` overrides. It is the first repo Preflight was not extracted from, and unlike `uxlab` it does not descend from `nuxt-kickstart`, so it is the first opportunity to distinguish "describes `uxlab`" from "describes applications generally."

**That opportunity is unexercised, deliberately.** Answering it means stripping the overrides, running eslint and resolving each hit to the attribute that caused it — the method this ADR's own conclusion turned on, where 87 of 233 hits were a rule firing on `aria-hidden="false"` and counting alone would have missed it. That has not been done against `ams-cloud-eds`. The trigger is recorded as available so the question stays askable; nothing here answers it, and no count is claimed.

What adoption did produce is one measurement about the one rule this ADR tuned.

**The tuned rule is not silent in a component-library repo, and the residue is not the documented false positive.** `ams-cloud-eds` had `label-has-for` turned off entirely, with a comment blaming for/id sibling association — the same reasoning this ADR measured and rejected. Under the shipped `required: { some: ['nesting', 'id'] }`, exactly **one** violation survived: a `<label>` wrapping a Nuxt UI `<USelect>`.

**It is a third option this preset leaves at its default, not a limitation of the rule.** Read from `eslint-plugin-vuejs-accessibility@2.6.0` rather than inferred:

```js
// dist/rules/label-has-for.js — validateNesting
controlTypes.concat(controlComponents).includes(getElementType(child))
```

`controlTypes` is `["input", "meter", "progress", "select", "textarea"]`, and `getElementType` kebab-cases the raw tag name, so `<USelect>` resolves to `u-select` and matches nothing. But `controlComponents` is a first-class rule option, kebab-cased on the way in — `controlComponents: ['USelect']` makes the wrapped control pass on `nesting`.

So the rule exposes three options that bear on this — `components`, `controlComponents` and `required` — and this ADR tuned one. The claim that the tuning "removes exactly the false positives" was measured against two repos that wrap native controls; in a repo that wraps library components, one class of false positive remains and the option that addresses it was never set.

**Whether the preset should set it is left open, and is not a small question.** `controlComponents` takes literal component names, so setting it means Preflight naming a specific component library — [ADR-0012](./0012-security-headers-are-reclaimed-as-route-rules.md)'s shape, where a preset stopped being framework-independent and SPEC §3's claim narrowed. One repo wanting `USelect` is not evidence that Preflight should carry Nuxt UI's component list, and a preset that names components it cannot verify are controls would be asserting something it has not measured.

**The same mechanism appears in the other accessibility tool Preflight ships, unused.** `templates/axe-linter.yml` carries a commented-out `global-components:` key — Deque's documented answer to the identical problem, *"Lint `<AxeButton>` as though it was a `<button>`"*. Two tools, the same blind spot, the same remedy, and Preflight sets neither.

**How it was resolved in the adopting repo**, which is a consumer's decision and not this package's: an explicit `for`/`id` pair, after confirming `USelect` binds `:id` to its trigger element, so the fix associates the label at runtime rather than only satisfying eslint.

**What would change the answer here.** A second repo hitting the same residue — that would make it a property of component-library repos rather than of `ams-cloud-eds`, and would be the first evidence that `controlComponents` belongs in the preset. Failing that, the honest position is that the shipped tuning is right for the repos it was measured against and incomplete for repos it was not.
