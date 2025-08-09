import { useRef } from 'react'
import { Outlet } from 'react-router-dom'
import Footer from '../components/Footer'
import Header from '../components/Header'
import { MainScrollContext } from '../contexts/MainScrollContext'

export default function Layout() {
  const mainScrollRef = useRef<HTMLDivElement>(null)
  return (
    <MainScrollContext.Provider value={{ mainScrollRef }}>
      <main className="relative w-full min-h-screen overflow-x-hidden">
        <div id="main-scroll" ref={mainScrollRef} className="fixed inset-0 min-h-screen flex flex-col overflow-y-auto">
          <Header />
          <Outlet />
          <Footer />
        </div>
      </main>
    </MainScrollContext.Provider>
  )
}
