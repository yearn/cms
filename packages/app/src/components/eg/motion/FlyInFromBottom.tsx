import type { Transition } from 'framer-motion'
import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { cn } from '../cn'
import { springs } from '../lib/motion'

export default function FlyInFromBottom({
  _key,
  transition = springs.roll,
  parentMounted,
  exit = 0,
  breakpoint = true,
  className,
  children,
}: {
  _key: string
  transition?: Transition
  parentMounted?: boolean
  exit?: -1 | 0 | 1
  breakpoint?: boolean
  className?: string
  children: React.ReactNode
}) {
  const initial = useMemo(
    () => (parentMounted === true || parentMounted === undefined ? { y: 8, opacity: 0 } : false),
    [parentMounted],
  )

  if (breakpoint)
    return (
      <motion.div
        key={`motion-${_key}`}
        transition={transition}
        initial={initial}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: exit * 8, opacity: 1 - Math.abs(exit) }}
        className={cn(className)}
      >
        {children}
      </motion.div>
    )

  return <div className={cn(className)}>{children}</div>
}
