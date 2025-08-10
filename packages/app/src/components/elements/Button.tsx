import { type ButtonHTMLAttributes, forwardRef, useMemo } from 'react'
import { cn } from '../../../lib/cn'

export type ThemeName = 'default' | 'disabled' | 'busy' | 'error'
export type Hierarchy = 'primary' | 'secondary'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  className?: string
  theme?: ThemeName
  h?: Hierarchy
}

export function buttonClassName(props: ButtonProps) {
  const { className, theme, h } = props
  const busy = theme === 'busy'
  const bg = 
    theme === 'error' ? 'bg-red-500'
    : h === 'secondary' ? 'bg-secondary-900' : 'bg-primary-50'
  const text = 
    theme === 'error' ? 'text-red-50'
    : h === 'secondary' ? 'text-neutral-300' : 'text-secondary-600'
  return cn(`
    relative h-8 px-8 py-5 flex items-center justify-center
    ${bg} text-2xl ${text} tracking-wide
    drop-shadow-4 drop-shadow-secondary-600/60

    hover:text-primary-50 hover:bg-neutral-900 hover:border-secondary-50

    active:text-primary-50 active:border-secondary-400 active:bg-secondary-900
    active:translate-1 active:drop-shadow-none

    disabled:bg-primary-50
    disabled:text-secondary-200
    disabled:hover:text-secondary-200
    disabled:cursor-default
    disabled:drop-shadow-none
    disabled:pointer-events-none

    data-[theme=error]:drop-shadow-none

    cursor-pointer rounded-primary whitespace-nowrap
    ${(busy || theme === 'error') && 'pointer-events-none'}
    ${`theme-${theme ?? 'default'}`}
    ${className}`)
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, theme, h, children, ...props }, ref) => {
  const busy = useMemo(() => theme === 'busy', [theme])
  return <button data-theme={theme} ref={ref} {...props} className={buttonClassName({ className, theme, h })}>
    {!busy && children}
  </button>
})

Button.displayName = 'Button'

export default Button