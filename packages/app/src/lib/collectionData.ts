import { getCdnUrl } from '../../lib/cdn'
import { chains } from '../../lib/chains'
import type { CollectionKey } from '../../schemas/cms'

export type RawCollectionData = {
  flat: unknown[]
  rawJsonChainMap: Record<number, unknown[]>
}

export async function fetchCollectionData(collectionKey: CollectionKey): Promise<RawCollectionData> {
  const chainList = Object.values(chains)
  const responses = await Promise.all(
    chainList.map((chain) => fetch(`${getCdnUrl()}${collectionKey}/${chain.id}.json`)),
  )
  const jsons = await Promise.all(responses.map((response) => response.json()))

  const rawJsonChainMap: Record<number, unknown[]> = {}
  jsons.forEach((json, index) => {
    rawJsonChainMap[chainList[index]?.id ?? 0] = json
  })

  return { flat: jsons.flat(), rawJsonChainMap }
}
