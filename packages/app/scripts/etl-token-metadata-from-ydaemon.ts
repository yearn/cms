/************************************************************************************************
 * ETL Token Metadata from YDaemon
 *
 * Fetches token metadata from ydaemon API and transforms it to CMS format.
 * Writes the transformed data to packages/cdn/tokens/{chainId}.json files.
 * Uses TokenMetadata schema for validation and type safety.
 ************************************************************************************************/

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { AddressSchema } from '../schemas'
import { type TokenMetadata, TokenMetadataSchema } from '../schemas/TokenMetadata'

const YDaemonTokenMetadataSchema = z.object({
  address: AddressSchema,
  name: z.string(),
  symbol: z.string(),
  decimals: z.number().int().min(0).max(255),
  isVault: z.boolean().optional(),
  display_name: z.string().optional(),
  display_symbol: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  underlyingTokens: z.array(AddressSchema).optional(),
})

type YDaemonTokenMetadata = z.infer<typeof YDaemonTokenMetadataSchema>

function transformYdaemonToYcms(yd: YDaemonTokenMetadata, chainId: number): TokenMetadata {
  return TokenMetadataSchema.parse({
    address: yd.address,
    chainId: chainId,
    name: yd.name,
    symbol: yd.symbol,
    displayName: yd.display_name,
    displaySymbol: yd.display_symbol,
    description: yd.description,
    category: yd.category,
    decimals: yd.decimals,
  })
}

async function fetchYDaemonTokens(): Promise<Record<string, Record<string, YDaemonTokenMetadata>>> {
  console.log('🔄 Fetching token metadata from ydaemon...')

  const response = await fetch('https://ydaemon.yearn.fi/tokens/all')
  if (!response.ok) {
    throw new Error(`Failed to fetch ydaemon tokens: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  console.log('✅ Successfully fetched token metadata from ydaemon')

  return data
}

async function main() {
  try {
    const allTokens = await fetchYDaemonTokens()

    // Process each chain
    for (const [chainIdStr, tokens] of Object.entries(allTokens)) {
      const chainId = parseInt(chainIdStr, 10)
      if (Number.isNaN(chainId) || chainId <= 0) {
        console.log(`⚠️  Skipping invalid chainId: ${chainIdStr}`)
        continue
      }

      console.log(`🔄 Processing chain ${chainId}...`)

      // Transform tokens for this chain
      const transformedTokens: TokenMetadata[] = []

      for (const [address, tokenData] of Object.entries(tokens)) {
        try {
          // Parse and validate ydaemon token data
          const ydaemonToken = YDaemonTokenMetadataSchema.parse({
            ...tokenData,
            address: address,
          })

          // Transform to CMS format
          const cmsToken = transformYdaemonToYcms(ydaemonToken, chainId)
          transformedTokens.push(cmsToken)
        } catch (error) {
          console.log(
            `⚠️  Skipping invalid token ${address} on chain ${chainId}:`,
            error instanceof Error ? error.message : error,
          )
        }
      }

      // Write to CDN file
      const cdnPath = join(__dirname, '../../cdn/tokens', `${chainId}.json`)
      await mkdir(join(__dirname, '../../cdn/tokens'), { recursive: true })
      await writeFile(cdnPath, JSON.stringify(transformedTokens, null, 2))

      console.log(`✅ Updated ${transformedTokens.length} tokens for chain ${chainId}: ${cdnPath}`)
    }

    console.log('🎉 Token metadata ETL completed successfully!')
  } catch (error) {
    console.error('❌ Error processing token metadata:', error)
    process.exit(1)
  }
}

main()
