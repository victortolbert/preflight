import { describe, expect, it } from 'vitest'
import preflightSkillsNpm from '../src/presets/skills-npm'

describe('@victortolbert/preflight/skills-npm', () => {
  it('default-exports a plain options object', () => {
    // ADR-0004, same as the taze preset. The type-level half of the claim is in
    // `skills-npm.test-d.ts`.
    expect(Object.getPrototypeOf(preflightSkillsNpm)).toBe(Object.prototype)
  })

  it('omits the placeholder `include` and `exclude` keys', () => {
    // SPEC §2: those keys hold the tool's own README placeholders — `@some/package`,
    // and the same two entries listed under both keys. Dropping them is the one
    // configuration change adoption makes.
    expect(Object.keys(preflightSkillsNpm)).not.toContain('include')
    expect(Object.keys(preflightSkillsNpm)).not.toContain('exclude')
  })
})
