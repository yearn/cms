#!/usr/bin/env bun

import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { createPublicClient, http, parseAbi } from 'viem'
import { chains } from '../lib/chains'
import type { VaultMetadata } from '../schemas/VaultMetadata'

const CHAIN_IDS = [1, 10, 8453] as const
const RPC_ENV_BY_CHAIN: Record<(typeof CHAIN_IDS)[number], string[]> = {
  1: ['RPC_URI_FOR_1', 'RPC_1', 'RPC_MAINNET'],
  10: ['RPC_URI_FOR_10', 'RPC_10', 'RPC_OPTIMISM'],
  8453: ['RPC_URI_FOR_8453', 'RPC_8453', 'RPC_BASE'],
}

const DEFAULT_OUTPUT_PATH = resolve(
  import.meta.dir,
  '../../../docs/temp/automated-deposit-limit-zero.json'
)

const args = process.argv.slice(2)
const shouldRetire = args.includes('--retire')
const concurrency = Number(getArgValue('--concurrency') ?? '6')
const outputPath = resolve(process.cwd(), getArgValue('--output') ?? DEFAULT_OUTPUT_PATH)

const depositLimitAbi = parseAbi(['function depositLimit() view returns (uint256)'])

type ChainResult = {
  automated: string[]
  zeroDepositLimit: string[]
  errors: Array<{ address: string; error: string }>
}

type Output = {
  generatedAt: string
  chains: Record<string, ChainResult>
}

function getArgValue(flag: string): string | undefined {
  const index = args.indexOf(flag)
  if (index === -1) return undefined
  return args[index + 1]
}

function getRpcUrl(chainId: (typeof CHAIN_IDS)[number]): string {
  const envKeys = RPC_ENV_BY_CHAIN[chainId] ?? []
  for (const key of envKeys) {
    const value = process.env[key]
    if (value) return value
  }
  throw new Error(`Missing RPC URL for chain ${chainId}. Set one of: ${envKeys.join(', ')}`)
}

async function loadVaults(chainId: number): Promise<{ filePath: string; vaults: VaultMetadata[] }> {
  const filePath = `${import.meta.dir}/../../cdn/vaults/${chainId}.json`
  const content = await Bun.file(filePath).text()
  return { filePath, vaults: JSON.parse(content) as VaultMetadata[] }
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const current = nextIndex++
      results[current] = await fn(items[current], current)
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  return results
}

async function main() {
  const output: Output = {
    generatedAt: new Date().toISOString(),
    chains: {},
  }

  for (const chainId of CHAIN_IDS) {
    const { filePath, vaults } = await loadVaults(chainId)
    const automatedByLower = new Map<string, string>()

    for (const vault of vaults) {
      if (!vault.isAutomated) continue
      const lower = vault.address.toLowerCase()
      if (!automatedByLower.has(lower)) {
        automatedByLower.set(lower, vault.address)
      }
    }

    const automated = [...automatedByLower.values()]
    const zeroDepositLimit: string[] = []
    const errors: Array<{ address: string; error: string }> = []

    const client = createPublicClient({
      chain: chains[chainId],
      transport: http(getRpcUrl(chainId)),
    })

    await mapLimit(automated, concurrency, async (address) => {
      try {
        const limit = await client.readContract({
          address: address as `0x${string}`,
          abi: depositLimitAbi,
          functionName: 'depositLimit',
        })
        if (limit === 0n) {
          zeroDepositLimit.push(address)
        }
      } catch (error) {
        errors.push({
          address,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    })

    if (shouldRetire && zeroDepositLimit.length > 0) {
      const zeroSet = new Set(zeroDepositLimit.map((addr) => addr.toLowerCase()))
      let changed = false
      for (const vault of vaults) {
        if (!zeroSet.has(vault.address.toLowerCase())) continue
        if (vault.isRetired) continue
        vault.isRetired = true
        changed = true
      }
      if (changed) {
        await Bun.write(filePath, JSON.stringify(vaults, null, 2) + '\n')
        console.log(`Updated ${filePath} (retired ${zeroDepositLimit.length})`)
      }
    }

    output.chains[String(chainId)] = {
      automated,
      zeroDepositLimit,
      errors,
    }

    console.log(
      `Chain ${chainId}: automated=${automated.length} zeroDepositLimit=${zeroDepositLimit.length} errors=${errors.length}`
    )
  }

  await mkdir(dirname(outputPath), { recursive: true })
  await Bun.write(outputPath, JSON.stringify(output, null, 2) + '\n')
  console.log(`Wrote results to ${outputPath}`)
}

await main()
