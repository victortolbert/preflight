import { describe, expect, it } from 'vitest'
import { definePreflightConfig } from '../src/index'

describe('definePreflightConfig', () => {
  it('returns the config it was given, unchanged', () => {
    // Identity, as both peer dependencies' `defineConfig` are. It exists to
    // give `preflight.config.ts` a type, not to transform anything.
    const config = { unmanaged: ['.nvmrc' as const] }

    expect(definePreflightConfig(config)).toBe(config)
  })
})
