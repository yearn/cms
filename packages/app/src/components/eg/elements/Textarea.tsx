import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '../cn'
import { InputClassName } from './Input'

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  theme?: 'default' | 'warn' | 'error'
  className?: string
}

const TextareaClassName = cn(`
  text-sm
  reset-truncate
  border-1!
`)

const Textarea = forwardRef<HTMLTextAreaElement, Props>(({ className, theme, ...props }, ref) => {
  const borderClassName = theme === 'warn' ? '!border-yellow-400' : theme === 'error' ? '!border-red-500' : ''
  return (
    <textarea
      data-disabled={props.disabled}
      ref={ref}
      {...props}
      className={cn(InputClassName, TextareaClassName, className, borderClassName)}
    />
  )
})

Textarea.displayName = 'Textarea'

export default Textarea
