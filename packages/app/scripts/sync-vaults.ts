#!/usr/bin/env bun

import { chains } from '../lib/chains'
import { type VaultMetadata, VaultMetadataSchema } from '../schemas/VaultMetadata'

interface KongVault {
  chainId: number
  address: string
  name: string
  registry: string
  apiVersion: string
  vaultType?: number
}

interface KongResponse {
  data: {
    vaults: KongVault[]
  }
}


const KONG_ENDPOINT = 'https://kong.yearn.farm/api/gql'
const KONG_QUERY = `
  query {
    vaults(yearn: true) {
      chainId
      address
      name
      registry
      apiVersion
      vaultType
    }
  }
`

const SUPPORTED_CHAIN_IDS = Object.keys(chains).map(Number)

async function fetchVaultsFromKong(): Promise<KongVault[]> {
  console.log('Fetching vaults from Kong API...')
  
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
  
  if (!result.data?.vaults) {
    throw new Error('Invalid Kong response structure')
  }

  console.log(`Fetched ${result.data.vaults.length} vaults from Kong API`)
  return result.data.vaults
}

async function loadExistingVaults(chainId: number): Promise<VaultMetadata[]> {
  const filePath = `${import.meta.dir}/../../cdn/vaults/${chainId}.json`
  
  try {
    const file = Bun.file(filePath)
    const exists = await file.exists()
    
    if (!exists) {
      console.log(`No existing vault file for chain ${chainId}, creating empty array`)
      return []
    }
    
    const content = await file.text()
    return JSON.parse(content) as VaultMetadata[]
  } catch (error) {
    console.error(`Error loading existing vaults for chain ${chainId}:`, error)
    return []
  }
}

async function saveVaults(chainId: number, vaults: VaultMetadata[]): Promise<void> {
  const filePath = `${import.meta.dir}/../../cdn/vaults/${chainId}.json`
  const content = JSON.stringify(vaults, null, 2) + '\n'
  
  await Bun.write(filePath, content)
  console.log(`Saved ${vaults.length} vaults to ${filePath}`)
}

// Known registry addresses mapped to their ydaemon handler types
// Based on complete registry analysis from ydaemon codebase
const REGISTRY_HANDLERS = {
  // V2 Standard Registries (handleV02Vault) - Legacy
  '0xe15461b18ee31b7379019dc523231c57d1cbc18c': { label: 'YEARN', handler: 'V02_STANDARD' }, // Ethereum V1
  '0x3199437193625dccd6f9c9e98bdf93582200eb1f': { label: 'YEARN', handler: 'V02_STANDARD' }, // Arbitrum V2
  '0x727fe1759430df13655ddb0731df210a8a1f8b54': { label: 'YEARN', handler: 'V02_STANDARD' }, // Fantom V2
  '0x1ba4eb0f44ab82541e56669e18972b0d6037dfe0': { label: 'YEARN', handler: 'V02_STANDARD' }, // Optimism V2
  
  // V2 Experimental Registry (handleV02ExperimentalVault)
  '0x50c1a2ea0a861a967d9d0ffe2ae4012c2e053804': { label: 'YEARN', handler: 'V02_EXPERIMENTAL' }, // Ethereum V2 Experimental
  
  // V3 Registries (handleV03Vault)
  '0xaf1f5e1c19cb68b30aad73846effdf78a5863319': { label: 'YEARN', handler: 'V03' }, // Ethereum V3
  '0x79286dd38c9017e5423073ba1d328373a35e4a6c': { label: 'YEARN', handler: 'V03' }, // Optimism V3
  '0xf3885ede00171997bfadaa98e01e167b53a78ec5': { label: 'YEARN', handler: 'V03' }, // Base V3
  
  // V4 Registries (handleV04Vault)
  '0xff31a1b020c868f6ea3f61eb953344920eeca3af': { label: 'YEARN', handler: 'V04' }, // Multi-chain V4
  '0xa693365ff5f5e65a03616fe98098318ca80e6427': { label: 'YEARN', handler: 'V04' }, // Ethereum V4
  '0xd40ecf29e001c76dcc4cc0d9cd50520ce845b038': { label: 'YEARN', handler: 'V04' }, // Multi-chain V4
  '0xff5e3a7c4cbfa9dd361385c24c3a0a4ee63ce500': { label: 'YEARN', handler: 'V04' }, // Polygon V4
  
  // V5 Registries (handleV05Vault)
  '0xe9e8c89c8fc7e8b8f23425688eb68987231178e5': { label: 'JUICED', handler: 'V05' }, // Juiced V5
  '0x444045c5c13c246e117ed36437303cac8e250ab0': { label: 'PUBLIC_ERC4626', handler: 'V05' }, // Public ERC4626 V5
  '0x770d0d1fb036483ed4abb6d53c1c88fb277d812f': { label: 'PUBLIC_ERC4626', handler: 'V05' }, // Public ERC4626 V5 Stealth
  
  // V6 Registries (handleV06Vault_Gamma)
  '0xd5967178702250d9f0eac34258ebba99b9a28ed0': { label: 'YEARN', handler: 'V06' }, // Polygon V6 Gamma
  
  // Special Registries
  '0xd499ccf3e93f4cfb335ac388e3c896d59cdde7c3': { label: 'POOL_TOGETHER', handler: 'V05' }, // Pool Together
  '0x842b22eb2a1c1c54344eddbe6959f787c2d15844': { label: 'COVE', handler: 'V05' }, // Cove
  '0x8020fb37b21e0ef1707ada7a914baf44f9045e52': { label: 'POOL_TOGETHER', handler: 'V05' } // Pool Together Arbitrum
} as const

/**
 * Determines the vault type and kind based on registry address and vaultType parameter
 * This follows the exact logic from ydaemon's indexer handlers
 */
function determineVaultType(registry: string, vaultType?: number): { type: string, kind: string } {
  const registryData = REGISTRY_HANDLERS[registry.toLowerCase() as keyof typeof REGISTRY_HANDLERS]
  
  // Default values for unknown registries - fallback to Legacy for safety
  if (!registryData) {
    return { type: "Yearn Vault", kind: "Legacy" }
  }
  
  // Route to appropriate handler based on registry address (matching ydaemon logic)
  switch (registryData.handler) {
    case 'V02_STANDARD':
      // handleV02Vault: Always "Yearn Vault" + "Legacy"
      return { type: "Yearn Vault", kind: "Legacy" }
      
    case 'V02_EXPERIMENTAL':
      // handleV02ExperimentalVault: Always "Experimental Yearn Vault" + "Legacy"
      return { type: "Experimental Yearn Vault", kind: "Legacy" }
      
    case 'V03':
      // handleV03Vault: "Yearn Vault" by default, "Automated Yearn Vault" if vaultType=2, always "Legacy" kind
      if (vaultType === 2) {
        return { type: "Automated Yearn Vault", kind: "Legacy" }
      }
      return { type: "Yearn Vault", kind: "Legacy" }
      
    case 'V04': {
      // handleV04Vault: Always "Yearn Vault", kind determined by vaultType (0=Legacy, 1=Multi, 2=Single)
      let kind = "Legacy"  // Default fallback
      if (vaultType === 0) {
        kind = "Legacy"
      } else if (vaultType === 1) {
        kind = "Multi Strategy"
      } else if (vaultType === 2) {
        kind = "Single Strategy"
      }
      return { type: "Yearn Vault", kind }
    }
      
    case 'V05':
      // handleV05Vault: Always "Yearn Vault" + "Multi Strategy"
      return { type: "Yearn Vault", kind: "Multi Strategy" }
      
    case 'V06':
      // handleV06Vault_Gamma and similar: Always "Yearn Vault" + "Multi Strategy"
      return { type: "Yearn Vault", kind: "Multi Strategy" }
      
    default:
      // Unknown handler type, use safe defaults
      return { type: "Yearn Vault", kind: "Legacy" }
  }
}

/**
 * Automatically categorizes a vault based on its name, following ydaemon logic
 * Checks for protocol patterns, then asset patterns, with fallback to "Volatile"
 */
function categorizeVault(name: string): string {
  const lowerName = name.toLowerCase()
  
  // Protocol-specific patterns (order matters - first match wins)
  const protocolPatterns = [
    { keywords: ['curve', 'crv'], category: 'Curve' },
    { keywords: ['balancer', 'bal'], category: 'Balancer' },
    { keywords: ['velodrome', 'velo'], category: 'Velodrome' },
    { keywords: ['aerodrome', 'aero'], category: 'Aerodrome' },
    { keywords: ['gamma'], category: 'Gamma' },
    { keywords: ['pendle'], category: 'Pendle' },
    { keywords: ['prisma'], category: 'Prisma' }
  ]
  
  // Check protocol patterns first
  for (const pattern of protocolPatterns) {
    if (pattern.keywords.some(keyword => lowerName.includes(keyword))) {
      return pattern.category
    }
  }
  
  // Asset-based patterns
  const bitcoinPatterns = ['btc', 'bitcoin']
  const ethPatterns = ['eth', 'ethereum']
  const stableCoinPatterns = [
    'dai', 'rai', 'mim', 'dola', 'usd', 'eur', 'aud', 'chf', 'krw', 'gbp', 'jpy',
    'usdc', 'usdt', 'busd', 'frax', 'lusd', 'susd'
  ]
  
  // Check for stablecoin patterns
  if (stableCoinPatterns.some(stable => lowerName.includes(stable))) {
    return 'Stablecoin'
  }
  
  // Check for volatile asset patterns
  if (bitcoinPatterns.some(btc => lowerName.includes(btc)) || 
      ethPatterns.some(eth => lowerName.includes(eth))) {
    return 'Volatile'
  }
  
  // Default fallback
  return ''
}

function createVaultFromKong(kongVault: KongVault): VaultMetadata {
  const { type, kind } = determineVaultType(
    kongVault.registry,
    kongVault.vaultType
  )
  const registryData = REGISTRY_HANDLERS[kongVault.registry.toLowerCase() as keyof typeof REGISTRY_HANDLERS]
  
  // Determine inclusion flags based on registry label (following ydaemon logic)
  const isYearn = registryData?.label === 'YEARN'
  const isYearnJuiced = registryData?.label === 'JUICED'
  const isPublicERC4626 = registryData?.label === 'PUBLIC_ERC4626'
  
  // Auto-categorize the vault based on its name
  const category = categorizeVault(kongVault.name)
  
  return VaultMetadataSchema.parse({
    chainId: kongVault.chainId,
    address: kongVault.address.toLowerCase(),
    name: kongVault.name,
    registry: kongVault.registry?.toLowerCase(),
    ydaemonType: type,
    ydaemonKind: kind, 
    ydaemonEndorsed: false,
    isRetired: false,
    isHidden: false,
    isAggregator: false,
    isBoosted: false,
    isAutomated: type === "Automated Yearn Vault",
    isHighlighted: false,
    isPool: false,
    shouldUseV2APR: false,
    category: category,
    displayName: "",
    displaySymbol: "",
    description: "",
    sourceURI: "",
    uiNotice: "",
    migration: {
      available: false,
    },
    stability: {
      stability: "Unknown",
    },
    protocols: ["Yearn"],
    inclusion: {
      isSet: true,
      isYearn: isYearn || false,                    // True for YEARN label registries 
      isYearnJuiced: isYearnJuiced || false,        // True for JUICED label registries
      isGimme: false,
      isPoolTogether: false,
      isCove: false,
      isMorpho: false,
      isKatana: false,
      isPublicERC4626: isPublicERC4626 || false,    // True for PUBLIC_ERC4626 registries
    }
  })
}

async function updateVaultsForChain(chainId: number, kongVaults: KongVault[]): Promise<number> {
  const chainVaults = kongVaults.filter(vault => vault.chainId === chainId)
  const existingVaults = await loadExistingVaults(chainId)
  
  // Create a set of existing vault addresses for quick lookup
  const existingAddresses = new Set(
    existingVaults.map(vault => vault.address.toLowerCase())
  )
  
  // Find new vaults that don't exist in the current data
  const newVaults = chainVaults.filter(
    vault => !existingAddresses.has(vault.address.toLowerCase())
  )
  
  if (newVaults.length === 0) {
    console.log(`No new vaults found for chain ${chainId}`)
    return 0
  }
  
  console.log(`Found ${newVaults.length} new vaults for chain ${chainId}`)
  
  // Convert Kong vaults to our format and append to existing vaults
  const updatedVaults = [
    ...existingVaults,
    ...newVaults.map(createVaultFromKong)
  ]
  
  await saveVaults(chainId, updatedVaults)
  
  return newVaults.length
}

async function main(): Promise<void> {
  try {
    const kongVaults = await fetchVaultsFromKong()
    
    let totalNewVaults = 0
    
    // Process each supported chain
    for (const chainId of SUPPORTED_CHAIN_IDS) {
      const newVaultsCount = await updateVaultsForChain(chainId, kongVaults)
      totalNewVaults += newVaultsCount
    }
    
    console.log(`\n✅ Update complete! Added ${totalNewVaults} new vaults across all chains.`)
    
    if (totalNewVaults === 0) {
      console.log('All vault data is up to date.')
    }
    
  } catch (error) {
    console.error('❌ Error updating vaults:', error)
    process.exit(1)
  }
}

main()