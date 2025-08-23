import { z } from 'zod'
import { AddressSchema } from './index'

export const TokenMetadataSchema = z.object({
  address: AddressSchema,
  chainId: z.number().int().positive(),
  name: z.string(),
  symbol: z.string(),
  displayName: z.string().optional(),
  displaySymbol: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  decimals: z.number().int().min(0).max(255),
})

export type TokenMetadata = z.infer<typeof TokenMetadataSchema>
