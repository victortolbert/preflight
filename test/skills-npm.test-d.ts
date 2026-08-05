import type { CommandOptions } from 'skills-npm'
import { defineConfig } from 'skills-npm'
import { assertType, describe, expectTypeOf, it } from 'vitest'
import preflightSkillsNpm from '../src/presets/skills-npm'

describe('@victortolbert/preflight/skills-npm types', () => {
  it('composes through skills-npm\'s own `defineConfig`, which is the line consumers write', () => {
    const composed = defineConfig({
      ...preflightSkillsNpm,
      source: 'package.json',
    })

    expectTypeOf(composed).toExtend<Partial<CommandOptions>>()
  })

  it('composes into a bare options object too, for consumers not calling `defineConfig`', () => {
    assertType<Partial<CommandOptions>>({
      ...preflightSkillsNpm,
      agents: ['claude-code'],
    })
  })

  it('rejects a key skills-npm does not have', () => {
    // The load-bearing half of "typed options object". Without it, every other
    // assertion here passes for a preset typed as `{}` or `any`.
    assertType<Partial<CommandOptions>>({
      ...preflightSkillsNpm,
      // @ts-expect-error — `sources` is not a `CommandOptions` key.
      sources: 'package.json',
    })
  })
})
