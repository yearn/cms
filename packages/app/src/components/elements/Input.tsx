import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../../../lib/cn'

export const InputClassName = cn(`
relative px-4 py-3 
font-mono text-lg

text-content-primary bg-surface-elevated border border-surface-border
placeholder:text-secondary-500/60

hover:bg-surface-overlay hover:border-interactive-primary-border

focus:text-content-primary
focus:border-interactive-primary-border 
focus:bg-surface-overlay
focus:placeholder:text-secondary-600

data-[disabled=true]:border-surface-border/40
data-[disabled=true]:text-secondary-400 
data-[disabled=true]:bg-surface-base/40
data-[disabled=true]:placeholder:text-secondary-500/40

truncate
outline-none focus:ring-0 focus:outline-none
rounded-primary`)

type Props = InputHTMLAttributes<HTMLInputElement> & {
  theme?: 'default' | 'warn' | 'error'
  className?: string
}

const Input = forwardRef<HTMLInputElement, Props>(({ className, theme, ...props }, ref) => {
  const borderClassName = theme === 'warn' ? '!border-yellow-400' : theme === 'error' ? '!border-red-500' : ''
  return (
    <input
      data-disabled={props.disabled}
      ref={ref}
      {...props}
      className={cn(InputClassName, className, borderClassName)}
    />
  )
})

Input.displayName = 'Input'

export default Input
