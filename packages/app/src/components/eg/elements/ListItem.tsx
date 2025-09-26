import type { HTMLAttributes } from 'react'
import { forwardRef } from 'react'
import { cn } from '../cn'

export type ListItemProps = HTMLAttributes<HTMLDivElement> & {
  className?: string
  variant?: 'xl' | 'lg' | 'base'
}

function listItemClassName(props: ListItemProps) {
  const { className } = props
  return cn(`
    relative flex items-center px-6 py-3 rounded-primary cursor-pointer
    outline-none focus:ring-0 focus:outline-none
    
    /* Using ListItem-specific design system tokens (same as secondary button) */
    text-[var(--color-interactive-secondary-text)]
    bg-[var(--color-listitem-bg)]
    border border-[var(--color-interactive-secondary-border)]
    
    hover:bg-[var(--color-listitem-bg-hover)]
    focus:bg-[var(--color-listitem-bg-focus)]
    active:bg-[var(--color-listitem-bg-active)]
    
    /* Disabled state */
    data-[disabled=true]:bg-[var(--color-listitem-bg-disabled)]
    data-[disabled=true]:text-[var(--color-interactive-disabled-text)]
    data-[disabled=true]:border-[var(--color-interactive-disabled-border)]
    data-[disabled=true]:cursor-not-allowed
    
    data-[variant=xl]:min-h-24 data-[variant=xl]:text-xl
    data-[variant=lg]:min-h-20 data-[variant=lg]:text-lg
    data-[variant=base]:min-h-16 data-[variant=base]:text-base
    
    ${className}
  `)
}

const ListItem = forwardRef<HTMLDivElement, ListItemProps>(
  ({ children, className, variant = 'base', tabIndex = 0, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-variant={variant}
        className={listItemClassName({ className, variant })}
        tabIndex={tabIndex}
        {...props}
      >
        {children}
      </div>
    )
  },
)

ListItem.displayName = 'ListItem'

export default ListItem
