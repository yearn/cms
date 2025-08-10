import { useEffect, useState } from 'react'
import { PiArrowUp } from 'react-icons/pi'
import { cn } from '../../lib/cn'
import { useMainScroll } from '../hooks/useMainScroll'
import Button from './elements/Button'

export default function BackItUp() {
  const { mainScrollRef } = useMainScroll()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!mainScrollRef.current) return
    const element = mainScrollRef.current
    const handleScroll = () => setShow(element.scrollTop > 800)
    element.addEventListener('scroll', handleScroll)
    return () => element.removeEventListener('scroll', handleScroll)
  }, [mainScrollRef.current])

  return <Button 
    data-show={show} 
    onClick={() => mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })} 
    className={cn(`
      fixed bottom-32 right-32 
      p-0 size-16 rounded-full!
      data-[show=true]:opacity-100 data-[show=false]:opacity-0 
      transition-opacity duration-100
    `)}>
      <PiArrowUp className="size-9" />
    </Button>
}
