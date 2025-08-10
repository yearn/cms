import { StrategyMetadataSchema } from './StrategyMetadata'
import { VaultMetadataSchema } from './VaultMetadata'

export const collections = {
  StrategyMetadata: StrategyMetadataSchema,
  VaultMetadata: VaultMetadataSchema
} as const

export const globals = {}
