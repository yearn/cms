import { create } from 'zustand'

const STORAGE_KEY = 'toggleChainStore'

const loadState = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return new Set((parsed.toggledChains as number[]) || [])
    }
  } catch {}
  return new Set([1])
}

export const useToggleChainStore = create<{
  toggledChains: Set<number>
  toggleChain: (chainId: number, on?: boolean) => void
}>((set) => ({
  toggledChains: loadState(),
  toggleChain: (chainId, on) =>
    set((state) => {
      const newToggledChains = new Set(state.toggledChains)
      if (newToggledChains.has(chainId) && !on) {
        newToggledChains.delete(chainId)
      } else if (on === undefined || on) {
        newToggledChains.add(chainId)
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ toggledChains: [...newToggledChains] }))
      return { toggledChains: newToggledChains }
    }),
}))