import { useState, useEffect } from 'react'
import { PiSun, PiMoon, PiDesktop } from 'react-icons/pi'
import Button from './elements/Button'
import FlyInFromBottom from './motion/FlyInFromBottom'
import { useMounted } from '../hooks/useMounted'

type Theme = 'light' | 'dark' | 'system'

export default function ThemeToggle() {
  const mounted = useMounted()
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme') as Theme
      return stored || 'system'
    }
    return 'system'
  })

  useEffect(() => {
    const root = document.documentElement
    
    // Remove all theme classes
    root.classList.remove('light', 'dark')
    
    // Apply the appropriate class
    if (theme === 'light') {
      root.classList.add('light')
    } else if (theme === 'dark') {
      root.classList.add('dark')
    }
    // If theme is 'system', no class is added (uses media query)
    
    // Save to localStorage
    localStorage.setItem('theme', theme)
  }, [theme])

  const cycleTheme = () => {
    setTheme(current => {
      if (current === 'light') return 'dark'
      if (current === 'dark') return 'system'
      return 'light'
    })
  }

  const getIcon = () => {
    if (theme === 'light') return <PiSun />
    if (theme === 'dark') return <PiMoon />
    return <PiDesktop />
  }

  return (
    <Button
      onClick={cycleTheme}
      className="p-5"
      aria-label={`Current theme: ${theme}. Click to change.`}
    >
      <FlyInFromBottom _key={theme} parentMounted={mounted}>
        {getIcon()}
      </FlyInFromBottom>
    </Button>
  )
}