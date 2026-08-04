import { describe, expect, test } from 'bun:test'
import { VaultMetadataSchema } from './VaultMetadata'

describe('VaultMetadataSchema', () => {
  test('defaults isNeverShown to false', () => {
    expect(VaultMetadataSchema.shape.isNeverShown.parse(undefined)).toBe(false)
  })
})
