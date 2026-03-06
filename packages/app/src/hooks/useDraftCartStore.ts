import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CollectionKey } from '../../schemas/cms'

export type DraftableCollection = Extract<CollectionKey, 'vaults' | 'strategies' | 'tokens'>

export type DraftCartItem = {
  id: string
  collection: DraftableCollection
  chainId: number
  address: string
  name: string
  path: string
  item: Record<string, unknown>
}

type DraftCartStore = {
  items: Record<string, DraftCartItem>
  upsertItem: (item: DraftCartItem) => void
  removeItem: (id: string) => void
  clearItems: () => void
}

const STORAGE_KEY = 'draft-cart-store'

export function getDraftCartItemId(collection: DraftableCollection, chainId: number, address: string) {
  return `${collection}:${chainId}:${address.toLowerCase()}`
}

export function getDraftCartPath(collection: DraftableCollection, chainId: number) {
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
          const items = { ...state.items }
          delete items[id]
          return { items }
        }),
      clearItems: () => set({ items: {} }),
    }),
    {
      name: STORAGE_KEY,
    },
  ),
)
