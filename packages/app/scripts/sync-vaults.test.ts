import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test'
import { fetchVaultsFromKong } from './sync-vaults'

let fetchMock: ReturnType<typeof spyOn<typeof globalThis, 'fetch'>>
beforeEach(() => {
  fetchMock = spyOn(globalThis, 'fetch')
})
afterEach(() => fetchMock.mockRestore())

function vault(index: number) {
  return {
    chainId: index % 2 === 0 ? 1 : 8453,
    address: `0x${index.toString(16).padStart(40, '0')}`,
    name: `Vault ${index}`,
    registry: '',
    apiVersion: '3.0.4',
    vaultType: 1,
  }
}

function serveVaults(count: number) {
  const vaults = Array.from({ length: count }, (_, index) => vault(index))
  fetchMock.mockImplementation((async (_input, init) => {
    const { query, variables } = JSON.parse(init?.body as string)
    expect(query).toContain('vaults(yearn: true, limit: $limit, offset: $offset)')
    const limit = Math.min(variables?.limit ?? 100, 1000)
    const offset = variables?.offset ?? 0
    return Response.json({ data: { vaults: vaults.slice(offset, offset + limit) } })
  }) as typeof fetch)
  return vaults
}

describe('Kong vault pagination', () => {
  test('fetches every vault across multiple full pages and a partial final page', async () => {
    const expected = serveVaults(2105)
    expect(await fetchVaultsFromKong()).toEqual(expected)
    expect(fetchMock.mock.calls.map(([, init]) => JSON.parse(init?.body as string).variables)).toEqual([
      { limit: 1000, offset: 0 },
      { limit: 1000, offset: 1000 },
      { limit: 1000, offset: 2000 },
    ])
  })

  test('rejects the entire fetch when a later page fails', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ data: { vaults: Array.from({ length: 1000 }, (_, i) => vault(i)) } }),
    )
    fetchMock.mockResolvedValueOnce(new Response('Unavailable', { status: 503 }))
    await expect(fetchVaultsFromKong()).rejects.toThrow('Kong request failed: 503')
  })
})
