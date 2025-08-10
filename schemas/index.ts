import z from 'zod'
import { StrategyMetadataSchema } from './StrategyMetadata'
import { VaultMetadataSchema } from './VaultMetadata'

export const AddressSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/)

export const collections = {
  StrategyMetadata: StrategyMetadataSchema,
  VaultMetadata: VaultMetadataSchema
} as const

export const globals = {}
