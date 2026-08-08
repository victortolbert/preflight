import { describe, expect, it } from 'vitest'
import preflightVueA11y from '../src/presets/vue-a11y'

describe('@victortolbert/preflight/vue-a11y', () => {
  it('default-exports a plain options object', () => {
    // ADR-0004: a preset is an options object consumers spread. Unlike the
    // commitlint preset, nothing here is resolved by name, so this is the
    // ordinary mechanism rather than ADR-0007's exception.
    expect(Object.getPrototypeOf(preflightVueA11y)).toBe(Object.prototype)
  })

  it('carries exactly the three rules the consuming repos agree on', () => {
    // ADR-0009 measured the agreement at three rules. The application repo
    // silences ten more, but they never fire in the template, so the template
    // has never held a view on them — that is content difference, not consensus.
    // Pinning the key set here is what stops those ten drifting in later on the
    // strength of one repo's config, which is the failure SPEC §2 describes.
    expect(Object.keys(preflightVueA11y).sort()).toEqual([
      'vue-a11y/label-has-for',
      'vue-a11y/media-has-caption',
      'vue-a11y/no-autofocus',
    ])
  })

  it('tunes `label-has-for` rather than disabling it', () => {
    // The one rule the two repos genuinely disagreed on, and the reason this
    // preset is worth shipping at all. `some` accepts either association
    // mechanism; the stock `both` rejects a wrapped form control, which is valid
    // HTML. Measured: under `some` the template drops from 21 hits to 0 and the
    // application repo from 96 to 46 — the tuning removes the false positives
    // and leaves the rule catching real ones, so the level stays an error.
    expect(preflightVueA11y['vue-a11y/label-has-for']).toEqual([
      'error',
      { required: { some: ['nesting', 'id'] } },
    ])
  })

  it('silences only rules both repos silence', () => {
    // The two `'off'`s are held identically on both sides. If either ever
    // becomes a rule only one repo wants off, it stops being shared surface and
    // belongs in that repo rather than here.
    expect(preflightVueA11y['vue-a11y/no-autofocus']).toBe('off')
    expect(preflightVueA11y['vue-a11y/media-has-caption']).toBe('off')
  })
})
