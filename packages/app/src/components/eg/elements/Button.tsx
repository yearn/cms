import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '../cn'

export type Variant = 'accent' | 'primary' | 'secondary' | 'error' | 'busy'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  className?: string
  variant?: Variant
}

function buttonClassName(props: ButtonProps) {
  const { className, variant } = props
  const busy = variant === 'busy'

  return cn(`
    relative h-[42px] px-8 flex items-center justify-center
    text-2xl tracking-wide
    drop-shadow-4 drop-shadow-black
    border cursor-pointer rounded-primary whitespace-nowrap

    data-[variant=accent]:bg-interactive-accent
    data-[variant=accent]:text-interactive-accent-text
    data-[variant=accent]:border-interactive-accent-border
    data-[variant=accent]:hover:bg-interactive-accent-hover
    data-[variant=accent]:active:bg-interactive-accent-active
    
    data-[variant=primary]:bg-interactive-primary
    data-[variant=primary]:text-interactive-primary-text
    data-[variant=primary]:border-interactive-primary-border
    data-[variant=primary]:hover:bg-interactive-primary-hover
    data-[variant=primary]:active:bg-interactive-primary-active
    
    data-[variant=secondary]:bg-interactive-secondary
    data-[variant=secondary]:text-interactive-secondary-text
    data-[variant=secondary]:border-interactive-secondary-border
    data-[variant=secondary]:hover:bg-interactive-secondary-hover
    data-[variant=secondary]:active:bg-interactive-secondary-active
    
    data-[variant=error]:bg-red-500
    data-[variant=error]:text-red-50
    data-[variant=error]:border-red-500
    data-[variant=error]:hover:bg-red-400
    data-[variant=error]:active:bg-red-300
    data-[variant=error]:drop-shadow-none
    data-[variant=error]:pointer-events-none

    data-[variant=busy]:text-transparent
    data-[variant=busy]:border-interactive-secondary-border
    data-[variant=busy]:animate-skeleton
    
    disabled:bg-interactive-disabled
    disabled:text-interactive-disabled-text!
    disabled:border-interactive-disabled-border
    disabled:cursor-default
    disabled:drop-shadow-none
    disabled:pointer-events-none
    
    data-[variant=busy]:pointer-events-none
    
    ${busy && 'pointer-events-none'}
    ${className}`)
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', children, ...props }, ref) => {
    return (
      <button data-variant={variant} ref={ref} {...props} className={buttonClassName({ className, variant })}>
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'

export default Button
