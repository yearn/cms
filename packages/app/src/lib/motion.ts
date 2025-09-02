import type { Transition } from 'framer-motion'

export const springs = {
  glitch: { type: 'spring' as const, stiffness: 2200, damping: 32 },
  slowGlitch: { type: 'spring' as const, stiffness: 1200, damping: 32 },
  roll: { type: 'spring' as const, stiffness: 700, damping: 30 },
  slowRoll: { type: 'spring' as const, stiffness: 300, damping: 30 }
} satisfies Record<string, Transition>