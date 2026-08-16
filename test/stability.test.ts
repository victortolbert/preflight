import { describe, expect, it } from 'vitest'
import preflightMarkdownlint from '../presets/markdownlint.json' with { type: 'json' }
import pkg from '../package.json' with { type: 'json' }
import preflightCommitlint from '../src/presets/commitlint'
import preflightSecurityHeaders from '../src/presets/security-headers'
import preflightTaze from '../src/presets/taze'
import preflightVueA11y from '../src/presets/vue-a11y'

/**
 * The version contract, as assertions rather than prose.
 *
 * ADR-0010 enumerates what `@victortolbert/preflight` promises across versions,
 * and defines a breaking change as one that can *newly fail a consumer's build*.
 * A policy nothing checks is the shape of thing this project keeps deleting from
 * other people's repos — a documented mechanism that has quietly stopped
 * working ([ADR-0003](../docs/adr/0003-drop-skills-json-as-dead-config.md),
 * [ADR-0009](../docs/adr/0009-the-accessibility-gap-is-three-rules.md)). So the
 * covered surfaces are pinned here.
 *
 * **These tests are meant to fail when you change the surface.** A red assertion
 * is not a bug report; it is the question "is this release breaking?" arriving
 * before publish rather than after. Update the pin *and* the version in the same
 * change.
 *
 * Not pinned, deliberately: CLI commands and flags, which `cli-sync.test.ts` and
 * `cli-check.test.ts` exercise behaviourally — a literal flag list on top of
 * those would be assertion rather than coverage. The lock file format is not
 * pinned either; ADR-0010 declares it internal.
 */
describe('the version contract — ADR-0010', () => {
  it('exports exactly these subpaths', () => {
    // Pinned as a literal rather than derived from `pkg.exports`, which would
    // make the test agree with whatever the map happens to say. `packaging.test.ts`
    // catches a subpath being *added* without being accounted for; nothing caught
    // one being removed, and removal is the breaking direction.
    expect(Object.keys(pkg.exports)).toEqual([
      '.',
      './commitlint',
      './markdownlint',
      './security-headers',
      './taze',
      './vue-a11y',
      './package.json',
    ])
  })

  it('requires this Node floor', () => {
    // Raising it cannot break a build at runtime, but it makes the package
    // uninstallable for anyone below the new floor — the same class of harm, and
    // one no test of behaviour would notice.
    expect(pkg.engines.node).toBe('>=24')
  })
})

/**
 * Preset key sets, frozen.
 *
 * The surface with the least protection anywhere in the package. Managed files
 * pass through a lock and an explicit `preflight sync`; presets are consumed by
 * reference (SPEC §4), so a changed rule reaches every consumer on any version
 * their range allows, with no sync step and nothing in `preflight check` that
 * sees it. Adding an enforcing rule to any preset below can turn a consumer's
 * lint or commit hook red without them touching anything.
 */
describe('the version contract — preset surfaces', () => {
  it('freezes the commitlint preset to what it inherits and what it overrides', () => {
    expect(Object.keys(preflightCommitlint).sort()).toEqual(['extends', 'rules'])
    expect(preflightCommitlint.extends).toEqual(['@commitlint/config-conventional'])
    // Everything else config-conventional asserts is inherited untouched, so the
    // set of rules this preset *changes* is the whole of its own surface.
    expect(Object.keys(preflightCommitlint.rules).sort()).toEqual(['subject-case', 'type-enum'])
  })

  it('freezes the taze preset', () => {
    expect(Object.keys(preflightTaze).sort()).toEqual(['exclude'])
  })

  it('freezes the vue-a11y preset', () => {
    // Asserted here for the version contract, and again in `vue-a11y.test.ts`
    // for ADR-0009's reasoning about why the set is three rules and not thirteen.
    // The overlap is deliberate: the two tests answer different questions and
    // either one going green alone would be a gap.
    expect(Object.keys(preflightVueA11y).sort()).toEqual([
      'vue-a11y/label-has-for',
      'vue-a11y/media-has-caption',
      'vue-a11y/no-autofocus',
    ])
  })

  it('freezes the markdownlint preset, and the fact that it ships as JSON', () => {
    // The subpath target matters here in a way it does not for the others.
    // markdownlint's `extends` silently ignores an ESM module — no error, no
    // rules applied — so retargeting this subpath at a `.mjs` would leave every
    // consumer's config resolving and doing nothing. That is a breaking change
    // wearing the costume of a build tidy-up.
    expect(pkg.exports['./markdownlint']).toBe('./presets/markdownlint.json')
    expect(Object.keys(preflightMarkdownlint).sort()).toEqual([
      'MD013',
      'MD024',
      'MD025',
      'MD033',
      'MD036',
      'MD040',
      'MD060',
    ])
  })

  it('ships the directory that preset lives in', () => {
    // It sits outside `dist`, so `files` has to carry it explicitly or the
    // subpath resolves locally and 404s from the registry — SPEC §12's
    // characteristic first-publish failure.
    expect(pkg.files).toContain('presets')
  })

  it('freezes the security-headers preset', () => {
    // Both the route key and the header names, because for this preset the key
    // is part of the contract rather than packaging: `/**` and `/*` are both
    // valid Nitro rules with different coverage, so narrowing it would silently
    // stop protecting nested routes without failing anything else.
    expect(Object.keys(preflightSecurityHeaders)).toEqual(['/**'])
    expect(Object.keys(preflightSecurityHeaders['/**'].headers).sort()).toEqual([
      'Referrer-Policy',
      'X-Content-Type-Options',
      'X-Frame-Options',
    ])
  })
})
