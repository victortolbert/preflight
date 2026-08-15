import { assertType, describe, expectTypeOf, it } from 'vitest'
import preflightSecurityHeaders from '../src/presets/security-headers'

/**
 * The shape Nitro accepts for the subset of `routeRules` this preset writes.
 *
 * Restated here rather than imported from `nitropack`, for the reason the preset
 * itself gives: neither it nor `nuxt` is a dependency of this package, and both
 * consuming repos run a strict pnpm layout, so the import would be a phantom
 * dependency. That means these assertions check the preset against a *local*
 * restatement of Nitro's contract — they would not catch Nitro changing that
 * contract underneath us. `test/packaging.test.ts` covers the other half by
 * asserting no peer dependency is pulled in at runtime.
 */
interface RouteRules {
  [path: string]: {
    headers?: Record<string, string>
    redirect?: string
  }
}

describe('@victortolbert/preflight/security-headers types', () => {
  it('is assignable to the route-rules shape Nitro accepts', () => {
    expectTypeOf(preflightSecurityHeaders).toExtend<RouteRules>()
  })

  it('composes into a consumer\'s own route rules', () => {
    // SPEC §4's worked example, in the shape a consuming `nuxt.config.ts` writes
    // it — the preset spread first, local divergence declared after.
    assertType<RouteRules>({
      ...preflightSecurityHeaders,
      '/app': { redirect: '/dashboard' },
    })
  })

  it('widens header values to `string`, and that is fine here', () => {
    // Worth stating because it differs from `vue-a11y`, where the literal union
    // in `RuleEntry` keeps `'off'` as `'off'` and that narrowness is load-bearing
    // — a widened severity cannot be spread into a typed `overrides` block.
    //
    // Here the contract Nitro publishes for a header bag *is* `Record<string,
    // string>`, so `satisfies` widens `'DENY'` to `string` and nothing downstream
    // cares: spreading into `routeRules` type-checks either way. Asserting the
    // literal would be asserting an implementation detail of `satisfies` rather
    // than a property a consumer depends on.
    expectTypeOf(preflightSecurityHeaders['/**'].headers['X-Frame-Options'])
      .toEqualTypeOf<string>()
  })

  it('keeps the route key literal, so a consumer can index it', () => {
    expectTypeOf(preflightSecurityHeaders).toHaveProperty('/**')
  })

  it('allows a consumer to override one header while keeping the rest', () => {
    // The divergence path SPEC §4 describes: a consumer that needs same-origin
    // framing changes that one key rather than abandoning the preset.
    assertType<RouteRules>({
      ...preflightSecurityHeaders,
      '/**': {
        headers: {
          ...preflightSecurityHeaders['/**'].headers,
          'X-Frame-Options': 'SAMEORIGIN',
        },
      },
    })
  })
})
