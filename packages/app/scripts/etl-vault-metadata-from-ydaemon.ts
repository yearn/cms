import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createPublicClient, http, parseAbi } from 'viem'
import { z } from 'zod'
import { chains } from '../lib/chains'
import { AddressSchema } from '../schemas'
import { type VaultMetadata, VaultMetadataSchema } from '../schemas/VaultMetadata'

z.ZodString.prototype.optionalString = function () {
  return this.nullish().or(z.literal(''))
}

const optionalString = (schema: z.ZodType<string>) => schema.nullish().or(z.literal(''))

export const YDaemonVaultMetadataSchema = z.object({
  chainID: z.number(),
  address: AddressSchema,
  registry: optionalString(AddressSchema),
  type: z.enum(['Yearn Vault', 'Experimental Yearn Vault', 'Automated Yearn Vault', 'Single Strategy']),
  kind: optionalString(z.enum(['Multi Strategy', 'Legacy', 'Single Strategy'])),
  endorsed: z.boolean().optional(),
  metadata: z
    .object({
      isRetired: z.boolean().optional(),
      isHidden: z.boolean().optional(),
      isAggregator: z.boolean().optional(),
      isBoosted: z.boolean().optional(),
      isAutomated: z.boolean().optional(),
      isHighlighted: z.boolean().optional(),
      isPool: z.boolean().optional(),
      shouldUseV2APR: z.boolean().optional(),
      migration: z
        .object({
          available: z.boolean(),
          target: z.string(),
          contract: z.string(),
        })
        .optional(),
      stability: z
        .object({
          stability: optionalString(z.enum(['Unknown', 'Correlated', 'Stable', 'Volatile', 'Unstable'])),
          stableBaseAsset: z.string().nullish(),
        })
        .nullish(),
      category: z.string().optional(),
      displayName: z.string().optional(),
      displaySymbol: z.string().optional(),
      description: z.string().optional(),
      sourceURI: z.string().optional(),
      uiNotice: z.string().optional(),
      protocols: z.array(z.enum(['Curve', 'BeethovenX', 'Gamma', 'Balancer', 'Yearn'])).nullish(),
      inclusion: z
        .object({
          isSet: z.boolean(),
          isYearn: z.boolean(),
          isYearnJuiced: z.boolean(),
          isGimme: z.boolean(),
          isPoolTogether: z.boolean(),
          isCove: z.boolean(),
          isMorpho: z.boolean(),
          isKatana: z.boolean(),
          isPublicERC4626: z.boolean(),
        })
        .optional(),
    })
    .optional(),
})

export type YDaemonVaultMetadata = z.infer<typeof YDaemonVaultMetadataSchema>

function transformYdaemonToYcms(yd: YDaemonVaultMetadata): VaultMetadata {
  return VaultMetadataSchema.parse({
    chainId: yd.chainID,
    address: yd.address,
    name: '',
    registry: yd.registry ? AddressSchema.parse(yd.registry) : undefined,
    ydaemonType: yd.type,
    ydaemonKind: yd.kind === '' ? 'None' : yd.kind as 'Multi Strategy' | 'Legacy' | 'Single Strategy' | 'None',
    ydaemonEndorsed: yd.endorsed ?? false,
    isRetired: yd.metadata?.isRetired ?? false,
    isHidden: yd.metadata?.isHidden ?? false,
    isAggregator: yd.metadata?.isAggregator ?? false,
    isBoosted: yd.metadata?.isBoosted ?? false,
    isAutomated: yd.metadata?.isAutomated ?? false,
    isHighlighted: yd.metadata?.isHighlighted ?? false,
    isPool: yd.metadata?.isPool ?? false,
    shouldUseV2APR: yd.metadata?.shouldUseV2APR ?? false,
    migration: {
      available: yd.metadata?.migration?.available ?? false,
      target: yd.metadata?.migration?.target ? AddressSchema.parse(yd.metadata.migration.target) : undefined,
      contract: yd.metadata?.migration?.contract ? AddressSchema.parse(yd.metadata.migration.contract) : undefined,
    },
    stability: {
      stability: yd.metadata?.stability?.stability === '' ? 'Unknown' : yd.metadata?.stability?.stability as 'Unknown' | 'Correlated' | 'Stable' | 'Volatile' | 'Unstable',
      stableBaseAsset: yd.metadata?.stability?.stableBaseAsset ?? undefined,
    },
    category: yd.metadata?.category ?? undefined,
    displayName: yd.metadata?.displayName ?? undefined,
    displaySymbol: yd.metadata?.displaySymbol ?? undefined,
    description: yd.metadata?.description ?? undefined,
    sourceURI: yd.metadata?.sourceURI ?? undefined,
    uiNotice: yd.metadata?.uiNotice ?? undefined,
    protocols: yd.metadata?.protocols ?? [],
    inclusion: {
      isSet: yd.metadata?.inclusion?.isSet ?? false,
      isYearn: yd.metadata?.inclusion?.isYearn ?? false,
      isYearnJuiced: yd.metadata?.inclusion?.isYearnJuiced ?? false,
      isGimme: yd.metadata?.inclusion?.isGimme ?? false,
      isPoolTogether: yd.metadata?.inclusion?.isPoolTogether ?? false,
      isCove: yd.metadata?.inclusion?.isCove ?? false,
      isMorpho: yd.metadata?.inclusion?.isMorpho ?? false,
      isKatana: yd.metadata?.inclusion?.isKatana ?? false,
      isPublicERC4626: yd.metadata?.inclusion?.isPublicERC4626 ?? false,
    },
  })
}

async function updateNames(vaults: VaultMetadata[]) {
  const chainIds = Object.keys(chains).map(Number)
  for (const chainId of chainIds) {
    const vaultsForChain = vaults.filter((vault) => vault.chainId === chainId)
    const url = process.env[`RPC_${chainId}`]
    const rpc = createPublicClient({ chain: chains[chainId], transport: http(url) })

    const batchSize = 40
    for (let i = 0; i < vaultsForChain.length; i += batchSize) {
      const batch = vaultsForChain.slice(i, i + batchSize)
      const names = await rpc.multicall({
        contracts: batch.map((vault) => ({
          address: vault.address,
          abi: parseAbi(['function name() view returns (string)']),
          functionName: 'name',
        })),
      })
      console.log(`update names, ${chainId}, ${i + batchSize}/${vaultsForChain.length} vaults processed`)
      for (let j = 0; j < batch.length; j++) {
        if (batch[j] === undefined || names[j] === undefined || names[j]!.status !== 'success') { 
          console.log(chainId, i, j, 'batch[j] !== undefined', batch[j] !== undefined)
          console.log(chainId, i, j, 'names[j] !== undefined', names[j] !== undefined)
          continue
        }
        batch[j]!.name = names[j]!.result as string
      }
    }
  }
}

async function main() {
  try {
    const source = join(__dirname, '../../../ydaemon/data/meta/vaults')
    const files = await readdir(source)

    for (const file of files.filter((file) => file.endsWith('.json'))) {
      const chainId = parseInt(file.split('.')[0] ?? '0')
      if (chainId === 0) { throw new Error('chainId === 0') }

      const filePath = join(source, file)
      const content = await readFile(filePath, 'utf-8')
      const records = JSON.parse(content).vaults

      const ydaemonVaults = Object.keys(records)
        .map((address) => ({ ...records[address] }))
        .map((vault) => YDaemonVaultMetadataSchema.parse(vault))

      const transformed = ydaemonVaults.map(transformYdaemonToYcms)
      await updateNames(transformed)

      const cdnpath = join(__dirname, '../../cdn/vaults', `${chainId}.json`)
      await mkdir(join(__dirname, '../../cdn/vaults'), { recursive: true })
      await writeFile(cdnpath, JSON.stringify(transformed, null, 2))

      console.log(`content updated.. ${cdnpath}`)
    }
  } catch (error) {
    console.error('Error processing vault metadata:', error)
  }
}

main()
