# How to manage CMS metadata schemas

This guide explains how to modify the Zod schemas that define vault, strategy, and token metadata shapes.

## Schema locations

All schemas live in `packages/app/schemas/`:

- `VaultMetadata.ts` - Vault metadata shape
- `StrategyMetadata.ts` - Strategy metadata shape
- `TokenMetadata.ts` - Token metadata shape
- `index.ts` - Shared schemas (e.g., `AddressSchema`)

## Making changes

### 1. Update the schema

Edit the relevant schema file. For example, to add a new boolean field to vaults:

```ts
// packages/app/schemas/VaultMetadata.ts
export const VaultMetadataSchema = z.object({
  // ...existing fields
  isNewFeature: z.boolean(),
})
```

### 2. Handle optional vs required fields

- **New required fields** will cause validation errors for existing data. Either:
  - Make the field optional with `.optional()`
  - Add default values in sync scripts
  - Backfill existing CDN data

- **New optional fields** are safer and won't break existing data:
  ```ts
  newField: z.string().optional(),
  ```

### 3. Adding enum values

For fields like `protocols`, `type`, or `stability`, add new values to the enum:

```ts
protocols: z.array(z.enum(['Curve', 'Balancer', 'NewProtocol'])),
```

### 4. Test your changes

```bash
bun dev
```

Navigate to a vault or strategy in the UI to verify the form renders correctly with your new fields.

## Schema conventions

- Use `AddressSchema` for Ethereum addresses
- Boolean flags should default to `false` when optional
- Group related fields in nested objects (e.g., `migration`, `stability`, `inclusion`)
- Export the inferred TypeScript type alongside the schema:
  ```ts
  export type VaultMetadata = z.infer<typeof VaultMetadataSchema>
  ```
