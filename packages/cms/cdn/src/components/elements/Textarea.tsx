import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { InputClassName } from './Input'

type Props = InputHTMLAttributes<HTMLTextAreaElement> & {
  theme?: 'default' | 'warn' | 'error'
  className?: string
}

const TextareaClassName = cn(`
  text-sm
  reset-truncate
  border-4!
`)

const Textarea = forwardRef<HTMLTextAreaElement, Props>(({ className, theme, ...props }, ref) => {
  const borderClassName = theme === 'warn' ? '!border-yellow-400' : theme === 'error' ? '!border-red-500' : ''
  return <textarea data-disabled={props.disabled} ref={ref} {...props} className={cn(InputClassName, TextareaClassName, className, borderClassName)} />
})

Textarea.displayName = 'Textarea'

export default Textarea
