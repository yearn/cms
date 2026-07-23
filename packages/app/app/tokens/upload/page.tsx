import TokenAssetUpload, { type UploadUrlParams } from '../../../src/routes/TokenAssetUpload'

type SearchParams = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function TokenAssetUploadPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const rawMode = first(params.mode) ?? first(params.type) ?? first(params.target)
  const initialParams: UploadUrlParams = {
    mode: rawMode === 'chain' ? 'chain' : rawMode === 'token' ? 'token' : undefined,
    chainId: first(params.chainId) ?? first(params.chain),
    address: first(params.address) ?? first(params.token),
    name: first(params.name),
  }

  return <TokenAssetUpload initialParams={initialParams} />
}
