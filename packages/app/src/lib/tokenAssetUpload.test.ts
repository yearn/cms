import { describe, expect, test } from 'bun:test'
import {
  applyUploadUrlParams,
  buildTokenAssetFormData,
  createChainAssetItem,
  createTokenAssetItem,
  type TokenAssetItem,
} from './tokenAssetUpload'

const ADDRESS_A = '0x000000000000000000000000000000000000000a'
const ADDRESS_B = '0x000000000000000000000000000000000000000b'

function draftToken(): TokenAssetItem {
  const svg = new File(['<svg/>'], 'draft.svg', { type: 'image/svg+xml' })
  return {
    ...createTokenAssetItem(),
    id: 'draft-token',
    chainId: '1',
    address: ADDRESS_A,
    name: 'Token A',
    files: { svg },
    preview: { svg: 'blob:draft', png32: 'data:image/png;base64,MzI=', png128: 'data:image/png;base64,MTI4' },
  }
}

describe('applyUploadUrlParams', () => {
  test('restores a draft when there are no identity parameters', () => {
    const draft = draftToken()
    const result = applyUploadUrlParams({}, [draft], [createChainAssetItem()])

    expect(result.tokenItems[0]?.id).toBe(draft.id)
    expect(result.tokenItems[0]?.files.svg).toBe(draft.files.svg as File)
  })

  test('restores a draft when the URL identity matches case-insensitively', () => {
    const draft = draftToken()
    const result = applyUploadUrlParams(
      { chainId: '1', address: ADDRESS_A.toUpperCase().replace('0X', '0x') },
      [draft],
      [createChainAssetItem()],
    )

    expect(result.tokenItems[0]?.id).toBe(draft.id)
    expect(result.tokenItems[0]?.files.svg).toBe(draft.files.svg as File)
  })

  test('starts a clean item when the URL identity differs from the draft', () => {
    const draft = draftToken()
    const result = applyUploadUrlParams(
      { chainId: '1', address: ADDRESS_B, name: 'Token B' },
      [draft],
      [createChainAssetItem()],
    )
    const item = result.tokenItems[0]

    expect(item?.id).not.toBe(draft.id)
    expect(item?.address).toBe(ADDRESS_B)
    expect(item?.name).toBe('Token B')
    expect(item?.files).toEqual({})
    expect(item?.preview).toEqual({})
    expect(item?.generatePng).toBe(true)
  })
})

describe('buildTokenAssetFormData', () => {
  test('selects generated or manual PNGs according to the current mode without discarding either', async () => {
    const manual32 = new File(['manual-32'], 'manual-32.png', { type: 'image/png' })
    const manual128 = new File(['manual-128'], 'manual-128.png', { type: 'image/png' })
    const item = {
      ...draftToken(),
      files: { ...draftToken().files, png32: manual32, png128: manual128 },
      preview: {
        svg: 'blob:draft',
        png32: 'data:image/png;base64,Z2VuZXJhdGVkLTMy',
        png128: 'data:image/png;base64,Z2VuZXJhdGVkLTEyOA==',
      },
    }

    item.generatePng = false
    const manualForm = await buildTokenAssetFormData('token', [item], [], 'title', 'body')
    expect((manualForm.get(`png32_${item.id}`) as File).name).toBe('manual-32.png')
    expect(await (manualForm.get(`png32_${item.id}`) as File).text()).toBe('manual-32')

    item.generatePng = true
    const generatedForm = await buildTokenAssetFormData('token', [item], [], 'title', 'body')
    expect((generatedForm.get(`png32_${item.id}`) as File).name).toBe('logo-32.png')
    expect(await (generatedForm.get(`png32_${item.id}`) as File).text()).toBe('generated-32')
    expect(await (generatedForm.get(`png128_${item.id}`) as File).text()).toBe('generated-128')

    item.generatePng = false
    const restoredManualForm = await buildTokenAssetFormData('token', [item], [], 'title', 'body')
    expect(await (restoredManualForm.get(`png32_${item.id}`) as File).text()).toBe('manual-32')
    expect(item.files.png32).toBe(manual32)
    expect(item.files.png128).toBe(manual128)
  })
})
