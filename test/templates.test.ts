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
