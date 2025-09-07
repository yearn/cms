import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../cn'

export const InputClassName = cn(`
relative px-4 py-3 
font-mono text-lg

/* Using design system tokens */
text-[var(--color-input-text)] 
bg-[var(--color-input-bg)] 
border border-[var(--color-input-border)]
placeholder:text-[var(--color-input-placeholder)]/60

hover:bg-[var(--color-input-bg-hover)] 
hover:border-[var(--color-input-border-hover)]

focus:text-[var(--color-input-text-focus)]
focus:border-[var(--color-input-border-focus)] 
focus:bg-[var(--color-input-bg-focus)]
focus:placeholder:text-[var(--color-input-placeholder-focus)]

active:bg-[var(--color-input-bg-active)] 
active:border-[var(--color-input-border-active)]

/* Disabled state */
data-[disabled=true]:bg-[var(--color-input-bg-disabled)]/40
data-[disabled=true]:border-[var(--color-input-border-disabled)]/40
data-[disabled=true]:text-[var(--color-input-text-disabled)]
data-[disabled=true]:placeholder:text-[var(--color-input-placeholder)]/40

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