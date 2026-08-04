export type SchemaFieldMetadata = {
  obsolete?: boolean
}

export function isSchemaFieldReadOnly(schema: unknown, readOnly: boolean) {
  return (
    readOnly || (typeof schema === 'object' && schema !== null && (schema as SchemaFieldMetadata).obsolete === true)
  )
}
