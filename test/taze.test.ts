import { describe, expect, it } from 'vitest'
import preflightTaze from '../src/presets/taze'

describe('@victortolbert/preflight/taze', () => {
  it('default-exports a plain options object', () => {
    // ADR-0004: a preset is an options object consumers spread, not a finished
    // `defineConfig()` result they can only re-export whole. The type-level half
    // of this claim — that spreading it stays valid taze options — is in
    // `taze.test-d.ts`, which is where the difference actually bites.
    expect(Object.getPrototypeOf(preflightTaze)).toBe(Object.prototype)
  })
})
