import type { CheckOptions } from 'taze'
import { defineConfig } from 'taze'
import { assertType, describe, expectTypeOf, it } from 'vitest'
import preflightTaze from '../src/presets/taze'

describe('@victortolbert/preflight/taze types', () => {
  it('is assignable to taze\'s own option type', () => {
    expectTypeOf(preflightTaze).toExtend<Partial<CheckOptions>>()
  })

  it('composes through taze\'s own `defineConfig`, which is the line consumers write', () => {
    // SPEC §4's worked example verbatim. Asserting against `Partial<CheckOptions>`
    // alone would only be equivalent for as long as that stays `defineConfig`'s
    // parameter type, and nothing pins that.
    const composed = defineConfig({
      ...preflightTaze,
      exclude: [...preflightTaze.exclude, '@internal/*'],
    })

    expectTypeOf(composed).toExtend<Partial<CheckOptions>>()
  })

  it('composes into a bare options object too, for consumers not calling `defineConfig`', () => {
    assertType<Partial<CheckOptions>>({
      ...preflightTaze,
      exclude: [...preflightTaze.exclude, '@internal/*'],
    })
  })

  it('keeps `exclude` a concrete array rather than taze\'s `string | string[] | undefined`', () => {
    // This is the difference ADR-0004 turns on. `defineConfig(...)` returns
    // `Partial<CheckOptions>`, which widens `exclude` to a union including
    // `undefined` — and a consumer cannot spread that.
    expectTypeOf(preflightTaze.exclude).toEqualTypeOf<string[]>()
  })
})
