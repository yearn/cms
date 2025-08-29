#!/usr/bin/env bun

/************************************************************************************************
 * Token Sync Script
 *
 * Fetches token metadata from Kong GraphQL API and synchronizes with local CDN data.
 * Categorizes tokens based on contract calls to determine if they are Yearn Vaults,
 * Curve LP tokens, or other types. Appends new tokens to existing data.
 ************************************************************************************************/

import { type Address, createPublicClient, http, parseAbi } from 'viem'
import { chains } from '../lib/chains'
import { type TokenMetadata, TokenMetadataSchema } from '../schemas/TokenMetadata'

interface KongToken {
  chainId: number
  address: string
  name: string
  symbol: string
  decimals: number
}

interface KongResponse {
  data: {
    tokens: KongToken[]
  }
}

const KONG_ENDPOINT = 'https://kong.yearn.farm/api/gql'
const KONG_QUERY = `
  query Query {
    tokens {
      chainId
      address
      name
      symbol
      decimals
    }
  }
`
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const SUPPORTED_CHAIN_IDS = Object.keys(chains).map(Number)

// Curve Pool Registry addresses for each chain
// Used to detect Curve LP tokens via get_pool_from_lp_token call
const CURVE_REGISTRY_ADDRESSES: Record<number, string> = {
  1: '0x90E00ACe148ca3b23Ac1bC8C240C2a7Dd9c2d7f5', // Ethereum
  10: '0x0000000022d53366457f9d5e68ec105046fc4383', // Optimism
  100: '0x0000000022d53366457f9d5e68ec105046fc4383', // Gnosis
  137: '0x0000000022d53366457f9d5e68ec105046fc4383', // Polygon
  250: '0x0000000022d53366457f9d5e68ec105046fc4383', // Fantom
  42161: '0x0000000022d53366457f9d5e68ec105046fc4383', // Arbitrum
  // Base (8453), Sonic (146), and Katana (747474) don't have Curve registries
}

async function categorizeTokens(tokens: KongToken[], chainId: number): Promise<TokenMetadata[]> {
  const chain = chains[chainId]
  if (!chain) {
    console.log(`⚠️  Chain ${chainId} not supported, using basic categorization`)
    return tokens.map((token) => createBasicTokenFromKong(token))
  }

  const url = process.env[`RPC_${chainId}`]
  if (!url) {
    throw Error(`⚠️  No RPC URL, envar not set "RPC_${chainId}"`)
  }

  const rpc = createPublicClient({ chain, transport: http(url) })

  // Process tokens in batches to avoid RPC limits
  const batchSize = 50
  const categorizedTokens: TokenMetadata[] = []

  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize)

    // Get Curve registry address for this chain
    const curveRegistryAddress = CURVE_REGISTRY_ADDRESSES[chainId]

    // Prepare multicall for token categorization
    const calls = batch.flatMap((token) => {
      const tokenCalls: any[] = [
        // Check if it's a Yearn V2 vault (has token() method)
        {
          address: token.address as Address,
          abi: parseAbi(['function token() view returns (address)']),
          functionName: 'token' as const,
        },
        // Check if it's a Yearn V3 vault (has asset() method)
        {
          address: token.address as Address,
          abi: parseAbi(['function asset() view returns (address)']),
          functionName: 'asset' as const,
        },
      ]

      // Add Curve LP token check if registry is available for this chain
      if (curveRegistryAddress) {
        tokenCalls.push({
          address: curveRegistryAddress as Address,
          abi: parseAbi(['function get_pool_from_lp_token(address) view returns (address)']),
          functionName: 'get_pool_from_lp_token' as const,
          args: [token.address as Address],
        })
      }

      return tokenCalls
    })
    try {
      const results = await rpc.multicall({ contracts: calls })
      // Calculate calls per token (2 for Yearn checks, +1 if Curve registry available)
      const callsPerToken = curveRegistryAddress ? 3 : 2

      // Process results for each token in the batch
      for (let j = 0; j < batch.length; j++) {
        const token = batch[j]
        const baseIndex = j * callsPerToken
        const tokenResult = results[baseIndex] // token() call
        const assetResult = results[baseIndex + 1] // asset() call
        const curveResult = curveRegistryAddress ? results[baseIndex + 2] : null // get_pool_from_lp_token() call

        // Determine category based on contract call results
        let category = ''

        // Check if it's a Yearn Vault (V2 or V3)
        const isV2YearnVault = tokenResult?.status === 'success' && tokenResult.result !== ZERO_ADDRESS
        const isV3YearnVault = assetResult?.status === 'success' && assetResult.result !== ZERO_ADDRESS

        if (isV2YearnVault || isV3YearnVault) {
          category = 'yVault'
        } else {
          // Check if it's a Curve LP token
          const isCurveLpToken = curveResult?.status === 'success' && curveResult.result !== ZERO_ADDRESS
          if (isCurveLpToken) {
            category = 'Curve'
          } else {
            category = ''
          }
        }

        const categorizedToken = TokenMetadataSchema.parse({
          chainId: token.chainId,
          address: token.address.toLowerCase(),
          name: token.name,
          symbol: token.symbol,
          displayName: token.name,
          displaySymbol: token.symbol,
          description: '',
          category: category,
          decimals: token.decimals,
        })

        categorizedTokens.push(categorizedToken)
      }
    } catch {
      // Fallback to basic tokens without categorization
      batch.forEach((token) => {
        categorizedTokens.push(createBasicTokenFromKong(token))
      })
    }
  }

  return categorizedTokens
}

function createBasicTokenFromKong(kongToken: KongToken): TokenMetadata {
  return TokenMetadataSchema.parse({
    chainId: kongToken.chainId,
    address: kongToken.address.toLowerCase(),
    name: kongToken.name,
    symbol: kongToken.symbol,
    displayName: kongToken.name,
    displaySymbol: kongToken.symbol,
    description: '',
    category: '',
    decimals: kongToken.decimals,
  })
}

async function fetchTokensFromKong(): Promise<KongToken[]> {
  console.log('Fetching tokens from Kong API...')
  const response = await fetch(KONG_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: KONG_QUERY,
    }),
  })

  if (!response.ok) {
    throw new Error(`Kong request failed: ${response.status} ${response.statusText}`)
  }

  const result: KongResponse = await response.json()

  if (!result.data?.tokens) {
    throw new Error('Invalid Kong response structure')
  }

  return result.data.tokens
}

async function loadExistingTokens(chainId: number): Promise<TokenMetadata[]> {
  const filePath = `${import.meta.dir}/../../cdn/tokens/${chainId}.json`

  try {
    const file = Bun.file(filePath)
    const exists = await file.exists()

    if (!exists) {
      return []
    }

    const content = await file.text()
    return JSON.parse(content) as TokenMetadata[]
  } catch {
    return []
  }
}

async function saveTokens(chainId: number, tokens: TokenMetadata[]): Promise<void> {
  const filePath = `${import.meta.dir}/../../cdn/tokens/${chainId}.json`
  const content = JSON.stringify(tokens, null, 2) + '\n'

  await Bun.write(filePath, content)
}

async function updateTokensForChain(chainId: number, kongTokens: KongToken[]): Promise<number> {
  const chainTokens = kongTokens.filter((token) => token.chainId === chainId)
  const existingTokens = await loadExistingTokens(chainId)

  // Create a set of existing token addresses for quick lookup
  const existingAddresses = new Set(existingTokens.map((token) => token.address.toLowerCase()))

  // Find new tokens that don't exist in the current data
  const newTokens = chainTokens.filter((token) => !existingAddresses.has(token.address.toLowerCase()))

  if (newTokens.length === 0) {
    return 0
  }

  // Categorize new tokens with contract calls
  const categorizedTokens = await categorizeTokens(newTokens, chainId)

  // Append new tokens to existing ones
  const updatedTokens = [...existingTokens, ...categorizedTokens]

  await saveTokens(chainId, updatedTokens)

  return newTokens.length
}

async function main(): Promise<void> {
  try {
    const kongTokens = await fetchTokensFromKong()

    let totalNewTokens = 0

    // Process each supported chain
    for (const chainId of SUPPORTED_CHAIN_IDS) {
      const newTokensCount = await updateTokensForChain(chainId, kongTokens)
      totalNewTokens += newTokensCount
    }

    console.log(`\n🎉 Sync complete! Added ${totalNewTokens} new tokens across all chains.`)

    if (totalNewTokens === 0) {
      console.log('✅ All token data is up to date.')
    }
  } catch (error) {
    console.error('❌ Error syncing tokens:', error)
    process.exit(1)
  }
}

main()
