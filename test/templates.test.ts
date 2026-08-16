import { describe, expect, it } from 'vitest'
import { MANAGED_FILES, readTemplate } from '../src/templates'

describe('templates', () => {
  it.each(MANAGED_FILES)('ships a template for %s', async (file) => {
    await expect(readTemplate(file)).resolves.toBeTypeOf('string')
  })

  it.each(MANAGED_FILES)('%s is not empty, because an empty file is itself a configuration', async (file) => {
    expect((await readTemplate(file)).trim().length).toBeGreaterThan(0)
  })
})

describe('.editorconfig', () => {
  /** Parsed as key/value pairs, ignoring comments, section headers and blanks. */
  const settings = async () => Object.fromEntries(
    (await readTemplate('.editorconfig'))
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && !line.startsWith('['))
      .map(line => line.split('=').map(part => part.trim()) as [string, string]),
  )

  it('restates the four rules both consuming repos already enforce', async () => {
    // Derived, not chosen — every key here has a counterpart in an eslint rule
    // that both repos hold byte-identically (ADR-0014):
    //   style/indent: ["error", 2]         -> indent_style, indent_size
    //   style/eol-last: ["error", "always"] -> insert_final_newline
    //   style/no-trailing-spaces            -> trim_trailing_whitespace
    // The `.editorconfig` in both repos is 0 bytes, so there was nothing to
    // extract from the file itself; the agreement lives in `eslint.config.mjs`.
    await expect(settings()).resolves.toEqual({
      'root': 'true',
      'indent_style': 'space',
      'indent_size': '2',
      'insert_final_newline': 'true',
      'trim_trailing_whitespace': 'true',
    })
  })

  it('sets no key neither repo has an opinion on', async () => {
    // `end_of_line` is the tempting one, and `style/linebreak-style` is set in
    // neither repo. ADR-0009 is the ADR about reading silence as agreement, and
    // this asserts the lesson held for a managed file as well as a preset.
    const keys = Object.keys(await settings())

    expect(keys).not.toContain('end_of_line')
    expect(keys).not.toContain('charset')
  })

  it('declares itself the root, so the result does not depend on the machine', async () => {
    // Without this, editorconfig keeps walking up past the project — a stray
    // `~/.editorconfig` would change what a contributor's editor does. A managed
    // file whose effect varies by checkout location is not managed.
    await expect(settings()).resolves.toMatchObject({ root: 'true' })
  })
})
