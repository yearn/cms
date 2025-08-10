import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export const InputClassName = cn(`
relative px-6 py-3 
font-mono text-lg

text-secondary-600 bg-primary-50 border-4 border-secondary-600
placeholder:text-secondary-500/60

hover:text-primary-600 hover:bg-black hover:border-primary-600
hover:placeholder:text-primary-800

hover:has-[:focus]:border-primary-500
has-[:focus]:text-primary-300 
has-[:focus]:border-primary-500 
has-[:focus]:bg-black
has-[:focus]:placeholder:text-primary-800

focus:text-primary-300 
focus:border-primary-500 
focus:bg-black
focus:placeholder:text-primary-800

data-[disabled=true]:border-secondary-600/40
data-[disabled=true]:text-secondary-400 
data-[disabled=true]:bg-primary-50/40
data-[disabled=true]:placeholder:text-secondary-500/240

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
