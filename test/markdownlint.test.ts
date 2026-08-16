import { describe, expect, it } from 'vitest'
import preflightMarkdownlint from '../presets/markdownlint.json' with { type: 'json' }

describe('@victortolbert/preflight/markdownlint', () => {
  it('is shipped as JSON, not as a built module', () => {
    // The one preset in this package that is not a `.mjs`, and it is not a
    // stylistic choice. markdownlint resolves `extends` through its own config
    // loader, which parses JSON, JSONC, YAML and TOML and — measured, in
    // ADR-0013 — **silently ignores** an ESM module: no error, no applied rules,
    // just a config that quietly does nothing. Shipping a `.mjs` here would
    // produce a subpath that resolves and has no effect.
    const target = new URL('../presets/markdownlint.json', import.meta.url)

    expect(target.pathname.endsWith('.json')).toBe(true)
    expect(Object.getPrototypeOf(preflightMarkdownlint)).toBe(Object.prototype)
  })

  it('carries exactly the seven rules measured as needed in both repos', () => {
    // ADR-0013's criterion, which is narrower than "both repos disable it":
    // a rule ships only if it fires in *both* consuming repos under stock
    // defaults **and** survives `markdownlint --fix`. Pinning the key set is
    // what stops the application repo's local needs, or the template's unrun
    // boilerplate, drifting in later.
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

  it('disables every rule it names', () => {
    // No rule here is tuned rather than disabled, unlike `vue-a11y`'s
    // `label-has-for`. MD013 was the candidate — it takes `line_length`,
    // `tables` and `code_blocks` options — and ADR-0013 measured the tuning:
    // at 160 with tables and code excluded it still leaves 1,292 standing
    // violations in the application repo. A rule nobody can get to zero is a
    // permanent red, not a guard.
    expect(Object.values(preflightMarkdownlint)).toEqual([false, false, false, false, false, false, false])
  })

  it('omits MD034, which both repos disable but which the fixer resolves entirely', () => {
    // The finding that makes this preset narrower than either repo's config.
    // Bare URLs are 100% auto-fixable — 158 hits in the application repo and 8
    // in the template, all gone after `--fix`. Disabling it is a decision to
    // keep bare URLs rather than run the fixer once, which is a house style
    // rather than a shared need.
    expect(preflightMarkdownlint).not.toHaveProperty('MD034')
  })

  it('omits MD041, which fires in only one of the two repos', () => {
    // Both repos disable it, so it looks agreed. It fires 37 times in the
    // application repo and **zero** times in the template — so the template has
    // never had occasion to hold a view, which is ADR-0009's lesson about
    // reading silence as consensus. It stays local to the repo that needs it.
    expect(preflightMarkdownlint).not.toHaveProperty('MD041')
  })

  it('omits the formatting rules the template disables instead of fixing', () => {
    // MD007, MD022, MD028, MD031 and MD032 are disabled in the template only,
    // fire nowhere in the application repo, and are nearly all auto-fixable.
    // They are unfixed formatting carried between projects, not policy.
    for (const rule of ['MD007', 'MD022', 'MD028', 'MD031', 'MD032']) {
      expect(preflightMarkdownlint).not.toHaveProperty(rule)
    }
  })

  it('names no rule that never fires in either repo', () => {
    // Nine of the template's twenty-one entries silence rules that fire in
    // neither repo. A preset guarding nothing is ADR-0003's case, and this is
    // the assertion that keeps them out.
    for (const rule of ['MD001', 'MD003', 'MD018', 'MD023', 'MD026', 'MD046', 'MD051', 'MD053']) {
      expect(preflightMarkdownlint).not.toHaveProperty(rule)
    }
  })
})
