#!/usr/bin/env bun

import { chains } from '../lib/chains'
import { type StrategyMetadata, StrategyMetadataSchema } from '../schemas/StrategyMetadata'

interface KongStrategy {
  chainId: number
  address: string
  name: string
}

interface KongResponse {
  data: {
    strategies: KongStrategy[]
  }
}

const KONG_ENDPOINT = 'https://kong.yearn.farm/api/gql'
const KONG_QUERY = `
  query {
    strategies {
      chainId
      address
      name
    }
  }
`

const SUPPORTED_CHAIN_IDS = Object.keys(chains).map(Number)

async function fetchStrategiesFromKong(): Promise<KongStrategy[]> {
  console.log('Fetching strategies from Kong API...')
  
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
  
  if (!result.data?.strategies) {
    throw new Error('Invalid Kong response structure')
  }

  console.log(`Fetched ${result.data.strategies.length} strategies from Kong API`)
  return result.data.strategies
}

async function loadExistingStrategies(chainId: number): Promise<StrategyMetadata[]> {
  const filePath = `${import.meta.dir}/../../cdn/strategies/${chainId}.json`
  
  try {
    const file = Bun.file(filePath)
    const exists = await file.exists()
    
    if (!exists) {
      console.log(`No existing strategy file for chain ${chainId}, creating empty array`)
      return []
    }
    
    const content = await file.text()
    return JSON.parse(content) as StrategyMetadata[]
  } catch (error) {
    console.error(`Error loading existing strategies for chain ${chainId}:`, error)
    return []
  }
}

async function saveStrategies(chainId: number, strategies: StrategyMetadata[]): Promise<void> {
  const filePath = `${import.meta.dir}/../../cdn/strategies/${chainId}.json`
  const content = JSON.stringify(strategies, null, 2) + '\n'
  
  await Bun.write(filePath, content)
  console.log(`Saved ${strategies.length} strategies to ${filePath}`)
}

function createStrategyFromKong(kongStrategy: KongStrategy): StrategyMetadata {
  return StrategyMetadataSchema.parse({
    chainId: kongStrategy.chainId,
    address: kongStrategy.address.toLowerCase(),
    name: kongStrategy.name,
    isRetired: false,
    protocols: []
  })
}

async function updateStrategiesForChain(chainId: number, kongStrategies: KongStrategy[]): Promise<number> {
  const chainStrategies = kongStrategies.filter(strategy => strategy.chainId === chainId)
  const existingStrategies = await loadExistingStrategies(chainId)
  
  // Create a set of existing strategy addresses for quick lookup
  const existingAddresses = new Set(
    existingStrategies.map(strategy => strategy.address.toLowerCase())
  )
  
  // Find new strategies that don't exist in the current data
  const newStrategies = chainStrategies.filter(
    strategy => !existingAddresses.has(strategy.address.toLowerCase())
  )
  
  if (newStrategies.length === 0) {
    console.log(`No new strategies found for chain ${chainId}`)
    return 0
  }
  
  console.log(`Found ${newStrategies.length} new strategies for chain ${chainId}`)
  
  // Convert Kong strategies to our format and append to existing strategies
  const updatedStrategies = [
    ...existingStrategies,
    ...newStrategies.map(createStrategyFromKong)
  ]
  
  await saveStrategies(chainId, updatedStrategies)
  
  return newStrategies.length
}

async function main(): Promise<void> {
  try {
    const kongStrategies = await fetchStrategiesFromKong()
    
    let totalNewStrategies = 0
    
    // Process each supported chain
    for (const chainId of SUPPORTED_CHAIN_IDS) {
      const newStrategiesCount = await updateStrategiesForChain(chainId, kongStrategies)
      totalNewStrategies += newStrategiesCount
    }
    
    console.log(`\n✅ Update complete! Added ${totalNewStrategies} new strategies across all chains.`)
    
    if (totalNewStrategies === 0) {
      console.log('All strategy data is up to date.')
    }
    
  } catch (error) {
    console.error('❌ Error updating strategies:', error)
    process.exit(1)
  }
}

main()