import { StrategyMetadataSchema } from './StrategyMetadata'
import { VaultMetadataSchema } from './VaultMetadata'
import { YearnFiSchema } from './YearnFi'

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

export const globals = {
  yearnFi: {
    schema: YearnFiSchema,
    displayName: 'YearnFi Content',
    description: 'Global site content and branding',
  },
} as const

export type GlobalKey = keyof typeof globals
export const getGlobal = (key: GlobalKey) => globals[key]
export const getGlobalKeys = () => Object.keys(globals) as GlobalKey[]
