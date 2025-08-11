import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../../../lib/cn'

export const InputClassName = cn(`
relative px-6 py-3 
font-mono text-lg

text-primary-400 bg-primary-950 border border-primary-600
placeholder:text-primary-500/60

hover:text-primary-600 hover:bg-black hover:border-primary-600
hover:placeholder:text-primary-800

hover:has-[:focus]:border-primary-500
has-[:focus]:text-secondary-300 
has-[:focus]:border-primary-500 
has-[:focus]:bg-black
has-[:focus]:placeholder:text-primary-800

focus:text-secondary-300 
focus:border-primary-500 
focus:bg-black
focus:placeholder:text-primary-800

data-[disabled=true]:border-primary-600/40
data-[disabled=true]:text-primary-900 
data-[disabled=true]:bg-black/40
data-[disabled=true]:placeholder:text-primary-500/240

truncate
outline-none focus:ring-0 focus:outline-none
rounded-primary`)

type Props = InputHTMLAttributes<HTMLInputElement> & {
  theme?: 'default' | 'warn' | 'error'
  className?: string
}

const Input = forwardRef<HTMLInputElement, Props>(({ className, theme, ...props }, ref) => {
  const borderClassName = theme === 'warn' ? '!border-yellow-400' : theme === 'error' ? '!border-red-500' : ''
  return <input data-disabled={props.disabled} ref={ref} {...props} className={cn(InputClassName, className, borderClassName)} />
})

Input.displayName = 'Input'

export default Input
