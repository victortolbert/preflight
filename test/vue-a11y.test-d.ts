import { assertType, describe, expectTypeOf, it } from 'vitest'
import preflightVueA11y from '../src/presets/vue-a11y'

/**
 * The shape `@antfu/eslint-config` accepts for `vue.overrides` — a rule map.
 *
 * Modelled locally rather than imported. The plugin and its types arrive
 * transitively through `@antfu/eslint-config`, and both consuming repos run a
 * strict pnpm layout with no `shamefully-hoist`, so importing them here would
 * assert against a dependency this package does not declare.
 */
type RuleMap = Record<string, unknown>

describe('@victortolbert/preflight/vue-a11y types', () => {
  it('is assignable to an eslint rule map', () => {
    expectTypeOf(preflightVueA11y).toExtend<RuleMap>()
  })

  it('spreads into an overrides block alongside local rules, which is the line consumers write', () => {
    // The composition SPEC §4 describes: the preset supplies shared policy and
    // the consumer adds its own at the point of divergence, in one object.
    assertType<RuleMap>({
      ...preflightVueA11y,
      'vue-a11y/no-static-element-interactions': 'off',
    })
  })

  it('keeps `off` a literal rather than widening it to `string`', () => {
    // What `satisfies` buys over a type annotation, and the reason the preset
    // declares its own `RuleEntry` union instead of `Record<string, unknown>`.
    // A widened `string` would still spread, but would stop matching a consumer
    // config typed against eslint's own literal rule-level union.
    expectTypeOf(preflightVueA11y['vue-a11y/no-autofocus']).toEqualTypeOf<'off'>()
  })

  it('keeps `label-has-for` a tuple, so its options stay reachable', () => {
    // A consumer tightening or relaxing the association requirement needs to
    // read the shipped options rather than retype them; widening this to
    // `unknown[]` would make that a guess.
    expectTypeOf(preflightVueA11y['vue-a11y/label-has-for'])
      .toEqualTypeOf<['error', { required: { some: string[] } }]>()
  })
})
