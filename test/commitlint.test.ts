import lint from '@commitlint/lint'
import load from '@commitlint/load'
import { beforeAll, describe, expect, it } from 'vitest'
import preflightCommitlint from '../src/presets/commitlint'

/** Derived from `lint`'s own signature so it cannot drift from what it accepts. */
type ParserOpts = NonNullable<Parameters<typeof lint>[2]>['parserOpts']

/**
 * The preset as commitlint itself sees it, with `extends` resolved and
 * config-conventional's rules merged underneath ours.
 *
 * Asserting against the source object alone would only prove what we wrote
 * down. Everything this preset is *for* lives in the merge — the inherited
 * rules it leaves alone, and the two it overrides — so the tests below lint
 * real commit subjects through commitlint's own loader instead.
 */
let resolved: Awaited<ReturnType<typeof load>>

const check = (message: string) =>
  lint(message, resolved.rules, {
    // `load` types this `unknown` — it is whatever the resolved parser preset
    // happens to export. Narrowing it here keeps the assertion honest about
    // where the value comes from without widening `lint`'s own signature.
    parserOpts: resolved.parserPreset?.parserOpts as ParserOpts,
  })

beforeAll(async () => {
  resolved = await load(preflightCommitlint)
})

describe('@victortolbert/preflight/commitlint', () => {
  it('is consumed through `extends`, unlike the taze preset', () => {
    // ADR-0007. A commitlint config carries resolvable references, so it cannot
    // be spread into the consumer's config the way ADR-0004's presets are —
    // this key is the mechanism, not decoration.
    expect(preflightCommitlint.extends).toEqual(['@commitlint/config-conventional'])
  })

  it('inherits config-conventional rather than restating it', async () => {
    // The merged config should carry rules this preset never mentions. If a
    // future edit breaks the `extends` resolution, the preset silently shrinks
    // to its own two rules and stops asserting almost everything — which is
    // exactly how the rejected flat-object shape failed while looking fine.
    const ownRules = Object.keys(preflightCommitlint.rules)

    expect(Object.keys(resolved.rules).length).toBeGreaterThan(ownRules.length)
    expect(resolved.rules).toHaveProperty('subject-empty')
    expect(resolved.rules).toHaveProperty('header-max-length')
  })

  it.each([
    'feat: add app/error.vue, remove dead root error.vue',
    'docs: refresh CLAUDE.md and directory READMEs for current architecture',
    'fix(llm-vo): correct the optimizer contrast ratio',
  ])('accepts conventional subjects — %s', async (message) => {
    expect((await check(message)).valid).toBe(true)
  })

  it.each([
    'content(guides): refresh guides for current stack',
    'content(reference): set visibility to private for all reference pages',
  ])('accepts the `content` type these repos actually use — %s', async (message) => {
    // 11 commits across five months in the application repo. Stock
    // config-conventional rejects both of these.
    expect((await check(message)).valid).toBe(true)
  })

  it.each([
    'cwds: a one-day-burst typo type',
    'i: a bare typo',
    'deps: superseded by `build` and `chore`',
  ])('still rejects off-enum types — %s', async (message) => {
    const report = await check(message)

    expect(report.valid).toBe(false)
    expect(report.errors.map(error => error.name)).toContain('type-enum')
  })

  it.each([
    'ci: SHA-pin every GitHub Action, and converge versions (#47)',
    'fix(llm-vo): WCAG contrast and accessibility pass across optimizer UI',
    'build(railway): Chromium-capable Dockerfile + railway.json for container deploy',
  ])('warns without failing on acronym-initial subjects — %s', async (message) => {
    // The rule cannot distinguish an acronym from Sentence Case, and no subset
    // of its case list admits these. Warning is the only setting that keeps the
    // rule while letting correct English through, and `valid` staying true is
    // what stops the hook rejecting the commit.
    const report = await check(message)

    expect(report.valid).toBe(true)
    expect(report.warnings.map(warning => warning.name)).toContain('subject-case')
  })

  it('still fails a message that is not a conventional commit at all', async () => {
    const report = await check('Squashed snapshot of develop into main')

    expect(report.valid).toBe(false)
    expect(report.errors.map(error => error.name)).toEqual(
      expect.arrayContaining(['type-empty', 'subject-empty']),
    )
  })

  it('leaves the inherited length limits alone', async () => {
    // Measured across 1,472 commits: longest header 104 (two commits), longest
    // body line 83. Both limits are 100, so neither needed changing — and an
    // earlier reading that said otherwise turned out to be an artifact of
    // linting a commit *range*, which mangles bodies.
    expect(resolved.rules['header-max-length']).toEqual([2, 'always', 100])
    expect(resolved.rules['body-max-line-length']).toEqual([2, 'always', 100])
  })
})
