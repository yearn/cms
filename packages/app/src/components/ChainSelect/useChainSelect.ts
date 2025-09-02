import { create } from 'zustand'

const STORAGE_KEY = 'chainSelectStore'

const loadState = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return new Set((parsed.selectedChains as number[]) || [])
    }
  } catch {}
  return new Set([1])
}

type ChainSelectStore = {
  selectedChains: Set<number>
  toggleChain: (chainId: number) => void
  clearAll: () => void
  selectAll: (chainIds: number[]) => void
}

export const useChainSelectStore = create<ChainSelectStore>((set) => ({
  selectedChains: loadState(),
  toggleChain: (chainId: number) =>
    set((state) => {
      const newSet = new Set(state.selectedChains)
      if (newSet.has(chainId)) {
        newSet.delete(chainId)
      } else {
        newSet.add(chainId)
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ selectedChains: [...newSet] }))
      return { selectedChains: newSet }
    }),
  clearAll: () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ selectedChains: [] }))
    return set({ selectedChains: new Set() })
  },
  selectAll: (chainIds: number[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ selectedChains: chainIds }))
    return set({ selectedChains: new Set(chainIds) })
  },
}))

export function useChainSelect() {
  const { selectedChains, toggleChain, clearAll, selectAll } = useChainSelectStore()
  return {
    selectedChains,
    toggleChain,
    clearAll,
    selectAll,
    isSelected: (chainId: number) => selectedChains.has(chainId),
  }
}
