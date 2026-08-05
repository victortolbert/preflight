import type { ManagedFile } from '../src/index'
import { describe, expectTypeOf, it } from 'vitest'
import { MANAGED_FILES } from '../src/templates'

describe('MANAGED_FILES', () => {
  it('is exhaustive of `ManagedFile`, in both directions', () => {
    // The union types a consumer's `unmanaged`; the list is what the CLI walks.
    // They have to exist separately, so this is what stops them drifting apart —
    // a file in one and not the other would otherwise be silently unwritable or
    // silently un-opt-out-able.
    expectTypeOf<typeof MANAGED_FILES[number]>().toEqualTypeOf<ManagedFile>()
  })
})
