import type { PreflightConfig } from '../src/index'
import { assertType, describe, expectTypeOf, it } from 'vitest'
import { definePreflightConfig } from '../src/index'

describe('definePreflightConfig types', () => {
  it('types the `unmanaged` field', () => {
    // SPEC §6's escape hatch. The ticket exists because §3's exports map had no
    // path this could come from, which left `unmanaged` untypeable.
    assertType<PreflightConfig>(definePreflightConfig({ unmanaged: ['.nvmrc'] }))
  })

  it('accepts an `as const` declaration', () => {
    // Ordinary config-file style, and a mutable `ManagedFile[]` would reject it.
    assertType<PreflightConfig>(definePreflightConfig({
      unmanaged: ['.nvmrc', 'axe-linter.yml'] as const,
    }))
  })

  it('rejects a file Preflight does not manage', () => {
    definePreflightConfig({
      // @ts-expect-error — `.nvmcr` is not a managed file.
      unmanaged: ['.nvmcr'],
    })
  })

  it('accepts a config that declares nothing', () => {
    assertType<PreflightConfig>(definePreflightConfig({}))
  })

  it('returns the config type, so a consumer can re-read what they declared', () => {
    expectTypeOf(definePreflightConfig({})).toEqualTypeOf<PreflightConfig>()
  })
})
