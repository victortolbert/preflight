import type { UserConfig } from '@commitlint/types'
import { assertType, describe, expectTypeOf, it } from 'vitest'
import preflightCommitlint from '../src/presets/commitlint'

describe('@victortolbert/preflight/commitlint types', () => {
  it('is assignable to commitlint\'s own config type', () => {
    expectTypeOf(preflightCommitlint).toExtend<UserConfig>()
  })

  it('types the line a consumer actually writes', () => {
    // The whole consumer-side surface, verbatim from the README. Unlike the
    // taze preset there is nothing to spread here — ADR-0007 — so this, rather
    // than a composition example, is what the type needs to admit.
    assertType<UserConfig>({ extends: ['@victortolbert/preflight/commitlint'] })
  })

  it('keeps `extends` a concrete array', () => {
    // `UserConfig['extends']` is `string | string[] | undefined`. Narrowing
    // matters for the same reason it does in the taze preset: a widened type is
    // one a consumer cannot read from or extend without asserting.
    expectTypeOf(preflightCommitlint.extends).toEqualTypeOf<string[]>()
  })
})
