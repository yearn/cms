'use client'

import { useEffect, useRef, useState } from 'react'
import Footer from '../components/Footer'
import Header from '../components/Header'
import RestoreScroll from '../components/RestoreScroll'
import { MainScrollContext } from '../hooks/useMainScroll'

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const mainScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  // Preserve the Vite app's client-only shell while header state reads browser storage during render.
  if (!mounted) return null

  return (
    <MainScrollContext.Provider value={{ mainScrollRef }}>
      <main className="relative w-full min-h-screen overflow-x-hidden">
        <div id="main-scroll" ref={mainScrollRef} className="fixed inset-0 min-h-screen flex flex-col overflow-y-auto">
          <RestoreScroll />
          <Header />
          <div className="px-1 py-6">{children}</div>
          <Footer />
        </div>
      </main>
    </MainScrollContext.Provider>
  )
}
