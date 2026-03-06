import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CollectionKey } from '../../schemas/cms'

export type DraftableCollection = Extract<CollectionKey, 'vaults' | 'strategies' | 'tokens'>

type DraftValue = Record<string, unknown> | unknown[] | string | number | boolean | null | undefined

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getDraftKeys(left: Record<string, unknown>, right: Record<string, unknown>): string[] {
  return Array.from(new Set([...Object.keys(left), ...Object.keys(right)]))
}

function areDraftValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((item, index) => {
        return areDraftValuesEqual(item, right[index])
      })
    )
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    return getDraftKeys(left, right).every((key) => areDraftValuesEqual(left[key], right[key]))
  }

  return false
}

export function buildDraftPatch(base: unknown, draft: unknown): DraftValue {
  if (areDraftValuesEqual(base, draft)) {
    return undefined
  }

  if (!isPlainObject(base) || !isPlainObject(draft)) {
    return draft as DraftValue
  }

  const patch: Record<string, unknown> = {}

  for (const key of getDraftKeys(base, draft)) {
    const nestedPatch = buildDraftPatch(base[key], draft[key])
    if (nestedPatch !== undefined) {
      patch[key] = nestedPatch
    }
  }

  return Object.keys(patch).length > 0 ? patch : undefined
}

export function applyDraftPatch(source: unknown, patch: DraftValue): DraftValue {
  if (patch === undefined) {
    return source as DraftValue
  }

  if (!isPlainObject(patch)) {
    return patch
  }

  const sourceObject = isPlainObject(source) ? source : {}
  const merged: Record<string, unknown> = { ...sourceObject }

  for (const [key, patchValue] of Object.entries(patch)) {
    if (patchValue === undefined) {
      delete merged[key]
      continue
    }

    merged[key] = applyDraftPatch(sourceObject[key], patchValue as DraftValue)
  }

  return merged
}

export type DraftCartItem = {
  id: string
  collection: DraftableCollection
  chainId: number
  address: string
  name: string
  path: string
  item: Record<string, unknown>
  patch: DraftValue
}

type DraftCartStore = {
  items: Record<string, DraftCartItem>
  upsertItem: (item: DraftCartItem) => void
  removeItem: (id: string) => void
  clearItems: () => void
}

const STORAGE_KEY = 'draft-cart-store'

export function getDraftCartItemId(collection: DraftableCollection, chainId: number, address: string): string {
  return `${collection}:${chainId}:${address.toLowerCase()}`
}

export function getDraftCartPath(collection: DraftableCollection, chainId: number): string {
  return `packages/cdn/${collection}/${chainId}.json`
}

export const useDraftCartStore = create<DraftCartStore>()(
  persist(
    (set) => ({
      items: {},
      upsertItem: (item) =>
        set((state) => ({
          items: {
            ...state.items,
            [item.id]: item,
          },
        })),
      removeItem: (id) =>
        set((state) => {
          const { [id]: _removedItem, ...items } = state.items
          return { items }
        }),
      clearItems: () => set({ items: {} }),
    }),
    {
      name: STORAGE_KEY,
    },
  ),
)
