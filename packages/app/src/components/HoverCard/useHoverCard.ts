import { useCallback, useMemo } from 'react'
import { create } from 'zustand'

type HoverCardStore = {
  openCards: {
    [key: string]: boolean
  }
  openHoverCard: (cardId: string) => void
  closeHoverCard: (cardId: string) => void
}

const useHoverCardStore = create<HoverCardStore>((set) => ({
  openCards: {},
  openHoverCard: (cardId: string) => set((state) => ({ openCards: { ...state.openCards, [cardId]: true } })),
  closeHoverCard: (cardId: string) => set((state) => ({ openCards: { ...state.openCards, [cardId]: false } })),
}))

export function useHoverCard(cardId: string) {
  const store = useHoverCardStore()
  const isOpen = useMemo(() => store.openCards[cardId] === true, [store.openCards, cardId])

  const openHoverCard = useCallback(() => store.openHoverCard(cardId), [store, cardId])
  const closeHoverCard = useCallback(() => store.closeHoverCard(cardId), [store, cardId])

  return {
    isOpen,
    openHoverCard,
    closeHoverCard,
  }
}
