import { useCallback, useMemo } from 'react'
import { create } from 'zustand'

type HoverCardStore = {
  isOpen: {
    [key: string]: boolean
  }
  openHoverCard: (hoverCardId: string) => void
  closeHoverCard: (hoverCardId: string) => void
}

const useHoverCardStore = create<HoverCardStore>((set) => ({
  isOpen: {},
  openHoverCard: (hoverCardId: string) => set((state) => ({ isOpen: { ...state.isOpen, [hoverCardId]: true } })),
  closeHoverCard: (hoverCardId: string) => set((state) => ({ isOpen: { ...state.isOpen, [hoverCardId]: false } })),
}))

export function useHoverCard(hoverCardId: string) {
  const store = useHoverCardStore()
  const isOpen = useMemo(() => store.isOpen[hoverCardId] === true, [store.isOpen, hoverCardId])
  const openHoverCard = useCallback(() => store.openHoverCard(hoverCardId), [store, hoverCardId])
  const closeHoverCard = useCallback(() => store.closeHoverCard(hoverCardId), [store, hoverCardId])
  return { isOpen, openHoverCard, closeHoverCard }
}
