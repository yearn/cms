import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../../lib/cn'

export const TextareaClassName = cn(`
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

reset-truncate
outline-none focus:ring-0 focus:outline-none
rounded-primary`)

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  theme?: 'default' | 'warn' | 'error'
  className?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, Props>(({ className, theme, ...props }, ref) => {
  const borderClassName = theme === 'warn' ? '!border-yellow-400' : theme === 'error' ? '!border-red-500' : ''
  return (
    <textarea
      data-disabled={props.disabled}
      ref={ref}
      {...props}
      className={cn(TextareaClassName, className, borderClassName)}
    />
  )
})

Textarea.displayName = 'Textarea'

export default Textarea
