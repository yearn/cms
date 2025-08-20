import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createPublicClient, http, parseAbi } from 'viem'
import { chains } from '../lib/chains'
import { type StrategyMetadata, StrategyMetadataSchema } from '../schemas/StrategyMetadata'

async function updateNames(strategies: StrategyMetadata[]) {
  const chainIds = Object.keys(chains).map(Number)
  for (const chainId of chainIds) {
    const strategiesForChain = strategies.filter((strategy) => strategy.chainId === chainId)
    const url = process.env[`RPC_${chainId}`]
    const rpc = createPublicClient({ chain: chains[chainId], transport: http(url) })

    const batchSize = 40
    for (let i = 0; i < strategiesForChain.length; i += batchSize) {
      const batch = strategiesForChain.slice(i, i + batchSize)
      const names = await rpc.multicall({
        contracts: batch.map((vault) => ({
          address: vault.address,
          abi: parseAbi(['function name() view returns (string)']),
          functionName: 'name',
        })),
      })
      console.log(`update names, ${chainId}, ${i + batchSize}/${strategiesForChain.length} vaults processed`)
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
    const source = join(__dirname, '../../../../ydaemon/data/meta/strategies')
    const files = await readdir(source)
    const protocols = new Set<string>()

    for (const file of files.filter((file) => file.endsWith('.json'))) {
      const chainId = parseInt(file.split('.')[0] ?? '0')
      if (chainId === 0) {
        throw new Error('chainId === 0')
      }

      const filePath = join(source, file)
      const content = await readFile(filePath, 'utf-8')
      const records = JSON.parse(content).strategies

      Object.values(records)
        .reduce((acc: string[], strategy: any) => {
          if (strategy.protocols) {
            acc.push(...strategy.protocols)
          }
          return acc
        }, [])
        .forEach((protocol) => protocols.add(protocol))

      let strategies = Object.keys(records)
        .map((address) => ({ ...records[address] }))
        .map((strategy) => ({ chainId: strategy.chainID, ...strategy }))
        .map((strategy) => ({ ...strategy, protocols: strategy.protocols ?? [] }))
        .map((strategy) => StrategyMetadataSchema.parse(strategy))

      // remove duplicates by address
      strategies = strategies.filter(
        (strategy, index, self) => index === self.findIndex((t) => t.address === strategy.address),
      )

      await updateNames(strategies)

      const cdnpath = join(__dirname, '../../cdn/strategies', `${chainId}.json`)
      await mkdir(join(__dirname, '../../cdn/strategies'), { recursive: true })
      await writeFile(cdnpath, JSON.stringify(strategies, null, 2))

      console.log(`content updated.. ${cdnpath}`)
    }

    // print protocols
    // console.log(Array.from(protocols).sort())
  } catch (error) {
    console.error('Error processing vault metadata:', error)
  }
}

main()
