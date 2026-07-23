import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

export default function RestoreScroll() {
  const pathname = usePathname()
  useEffect(() => {
    const scrollcontainer = document.getElementById('main-scroll')
    if (scrollcontainer) scrollcontainer.scrollTo(0, 0)
  }, [pathname])

  return null
}
