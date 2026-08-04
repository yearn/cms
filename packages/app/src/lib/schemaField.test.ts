import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import { isSchemaFieldObsolete, isSchemaFieldReadOnly } from './schemaField'

describe('isSchemaFieldReadOnly', () => {
  test('keeps an ordinary field editable', () => {
    expect(isSchemaFieldReadOnly({}, false)).toBe(false)
  })

  test('disables a field marked obsolete in its Zod metadata', () => {
    const schema = z.object({
      legacyField: z.string().meta({ obsolete: true }),
    })
    const jsonSchema = z.toJSONSchema(schema)
    const legacyField = jsonSchema.properties?.legacyField ?? {}

    expect(isSchemaFieldObsolete(legacyField)).toBe(true)
    expect(isSchemaFieldReadOnly(legacyField, false)).toBe(true)
  })

  test('honors form-wide read-only mode', () => {
    expect(isSchemaFieldReadOnly({}, true)).toBe(true)
  })

  test('does not disable fields when obsolete is false', () => {
    expect(isSchemaFieldReadOnly({ obsolete: false }, false)).toBe(false)
  })
})
