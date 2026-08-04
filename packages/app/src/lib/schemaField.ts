export type SchemaFieldMetadata = {
  obsolete?: boolean
}

export function isSchemaFieldObsolete(schema: unknown) {
  return typeof schema === 'object' && schema !== null && (schema as SchemaFieldMetadata).obsolete === true
}

export function isSchemaFieldReadOnly(schema: unknown, readOnly: boolean) {
  return readOnly || isSchemaFieldObsolete(schema)
}
