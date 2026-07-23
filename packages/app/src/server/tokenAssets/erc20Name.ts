import { chains } from '@/lib/chains'

function getRpcUrl(chainId: number) {
  return (
    process.env[`RPC_URI_FOR_${chainId}`] ||
    process.env[`RPC_${chainId}`] ||
    process.env[`VITE_RPC_URI_FOR_${chainId}`] ||
    process.env[`VITE_RPC_${chainId}`] ||
    chains[chainId]?.rpcUrls.default.http[0]
  )
}

function decodeAbiString(result: string) {
  const hex = result.startsWith('0x') ? result.slice(2) : result
  if (hex.length >= 192) {
    const length = Number.parseInt(hex.slice(64, 128) || '0', 16)
    return Buffer.from(hex.slice(128, 128 + length * 2), 'hex')
      .toString('utf8')
      .split('\0')[0]
  }
  return Buffer.from(hex.replace(/00+$/, ''), 'hex').toString('utf8')
}

function jsonResponse(body: unknown, status: number) {
  return Response.json(body, { status })
}

export async function handleErc20Name(request: Request) {
  try {
    const body = (await request.json()) as { chainId?: number | string; address?: string }
    const chainId = Number(body.chainId)
    const address = String(body.address || '').trim()
    if (!Number.isInteger(chainId) || chainId <= 0) return jsonResponse({ error: 'Invalid chainId' }, 400)
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return jsonResponse({ error: 'Invalid address' }, 400)

    const rpc = getRpcUrl(chainId)
    if (!rpc) return jsonResponse({ error: 'No RPC configured for chain' }, 400)

    const response = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'eth_call',
        params: [{ to: address, data: '0x06fdde03' }, 'latest'],
      }),
    })
    const result = (await response.json()) as { result?: string; error?: { message?: string } }
    if (!response.ok || result.error) {
      return jsonResponse({ error: result.error?.message || `RPC HTTP ${response.status}` }, 502)
    }
    if (!result.result || result.result === '0x') return jsonResponse({ error: 'Empty result' }, 404)

    return jsonResponse({ name: decodeAbiString(result.result) }, 200)
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Lookup failed' }, 500)
  }
}
