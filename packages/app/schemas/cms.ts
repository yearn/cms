import { StrategyMetadataSchema } from './StrategyMetadata'
import { VaultMetadataSchema } from './VaultMetadata'

export const collections = {
  vaults: {
    schema: VaultMetadataSchema,
    displayName: 'Vaults',
    icon: 'vault',
    searchFields: ['name', 'address'] as const,
    listItemTemplate: 'vault' as const,
  },
  strategies: {
    schema: StrategyMetadataSchema,
    displayName: 'Strategies',
    icon: 'strategy',
    searchFields: ['name', 'address'] as const,
    listItemTemplate: 'strategy' as const,
  },
} as const

export type CollectionKey = keyof typeof collections
export const getCollection = (key: CollectionKey) => collections[key]
export const getCollectionKeys = () => Object.keys(collections) as CollectionKey[]

export const globals = {}
