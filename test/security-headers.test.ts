import { describe, expect, it } from 'vitest'
import preflightSecurityHeaders from '../src/presets/security-headers'

describe('@victortolbert/preflight/security-headers', () => {
  it('default-exports a plain options object', () => {
    // ADR-0004: a preset is an options object consumers spread. Nothing here is
    // resolved by name, so this is the ordinary mechanism rather than ADR-0007's
    // `extends` exception.
    expect(Object.getPrototypeOf(preflightSecurityHeaders)).toBe(Object.prototype)
  })

  it('matches every route at any depth, not just the first segment', () => {
    // The single translation in this preset that is not mechanical. Both repos'
    // `netlify.toml` writes `for = "/*"`, which under Netlify's glob matches any
    // depth. Nitro's matcher differs: `/*` is one segment. A literal port would
    // cover `/about` and miss `/podcasts/admin/settings` — failing open, and
    // silently, since every page still renders.
    expect(Object.keys(preflightSecurityHeaders)).toEqual(['/**'])
  })

  it('carries exactly the three headers the consuming repos agree on', () => {
    // ADR-0012 measured both `netlify.toml` header blocks as byte-identical.
    // Pinning the key set is what stops a fourth header arriving later on one
    // repo's say-so, which is the failure SPEC §2 describes.
    expect(Object.keys(preflightSecurityHeaders['/**'].headers).sort()).toEqual([
      'Referrer-Policy',
      'X-Content-Type-Options',
      'X-Frame-Options',
    ])
  })

  it('carries the values both repos already set, unchanged', () => {
    // Extracted, not chosen. If a value here ever stops matching what the repos
    // carry, the preset has started leading rather than recording agreement.
    expect(preflightSecurityHeaders['/**'].headers).toEqual({
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    })
  })

  it('ships neither cache rule from the same agreed block', () => {
    // The `netlify.toml` blocks agree on five rules, not three. `/_nuxt/*` is
    // dropped because Nitro already sets that exact header — ADR-0003's case
    // against config that guards nothing. `/img/*` is dropped because it serves
    // unhashed `public/` files, where `immutable` means a replaced image is
    // ignored for a year.
    const serialised = JSON.stringify(preflightSecurityHeaders)

    expect(serialised).not.toContain('_nuxt')
    expect(serialised).not.toContain('/img')
    expect(serialised).not.toContain('immutable')
  })

  it('sets no header neither repo has ever set', () => {
    // HSTS and CSP are the two a reader looks for first, and neither repo sets
    // either on any host. ADR-0009 is the ADR about reading silence as consensus;
    // this asserts the lesson stuck. Both also carry deployment risk this package
    // cannot measure — HSTS is near-irreversible once pinned.
    const names = Object.keys(preflightSecurityHeaders['/**'].headers).map(n => n.toLowerCase())

    expect(names).not.toContain('strict-transport-security')
    expect(names).not.toContain('content-security-policy')
  })

  it('composes with a consumer\'s own route rules without colliding', () => {
    // SPEC §4's shape: the consumer spreads the preset and declares divergence
    // at the point of divergence. Both repos' existing `routeRules` are redirects
    // keyed by concrete paths, so nothing they carry shares this preset's key.
    const composed = {
      ...preflightSecurityHeaders,
      '/app': { redirect: '/dashboard' },
    }

    expect(Object.keys(composed).sort()).toEqual(['/**', '/app'])
    expect(composed['/**']).toBe(preflightSecurityHeaders['/**'])
  })
})
