import { createContext, type RefObject, useContext } from 'react'

interface MainScrollContextType {
  mainScrollRef: RefObject<HTMLDivElement | null>
}

export const MainScrollContext = createContext<MainScrollContextType | null>(null)

export const useMainScroll = () => {
  const context = useContext(MainScrollContext)
  if (!context) {
    throw new Error('useMainScroll must be used within MainScrollProvider')
  }
  return context
}
