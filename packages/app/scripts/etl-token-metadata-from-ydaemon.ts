/************************************************************************************************
 * ETL Token Metadata from YDaemon
 *
 * Fetches token metadata from ydaemon API and transforms it to CMS format.
 * Writes the transformed data to packages/cdn/tokens/{chainId}.json files.
 * Uses TokenMetadata schema for validation and type safety.
 ************************************************************************************************/

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { AddressSchema } from '../schemas'
import { type TokenMetadata, TokenMetadataSchema } from '../schemas/TokenMetadata'

const YDaemonTokenMetadataSchema = z.object({
  chainID: z.number().optional(),
  address: AddressSchema,
  name: z.string(),
  symbol: z.string(),
  decimals: z.number().int().min(0).max(255),
  displayName: z.string().optional(),
  displaySymbol: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional()
})

type YDaemonTokenMetadata = z.infer<typeof YDaemonTokenMetadataSchema>

function transformYdaemonToYcms(yd: YDaemonTokenMetadata, chainId: number): TokenMetadata {
  return TokenMetadataSchema.parse({
    chainId: chainId,
    address: yd.address,
    name: yd.name,
    symbol: yd.symbol,
    displayName: yd.displayName,
    displaySymbol: yd.displaySymbol,
    description: yd.description,
    category: yd.category,
    decimals: yd.decimals,
  })
}

async function fetchYDaemonTokens(): Promise<Record<string, Record<string, YDaemonTokenMetadata>>> {
  console.log('🔄 Reading token metadata from ydaemon files...')

  const source = join(__dirname, '../../../../ydaemon/data/meta/tokens')
  const files = await readdir(source)
  const result: Record<string, Record<string, YDaemonTokenMetadata>> = {}

  for (const file of files.filter((file) => file.endsWith('.json'))) {
    const chainId = file.split('.')[0]
    if (!chainId) {
      throw new Error('Invalid file name: no chainId found')
    }

    const filePath = join(source, file)
    const content = await readFile(filePath, 'utf-8')
    const data = JSON.parse(content)
    
    // Extract tokens from the nested structure
    result[chainId] = data.tokens || {}
  }

  console.log('✅ Successfully read token metadata from ydaemon files')
  return result
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
