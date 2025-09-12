import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '../cn'

export type FooterProps = HTMLAttributes<HTMLElement> & {
  className?: string
}

function footerClassName(props: FooterProps) {
  const { className } = props
  return cn(`
    px-8 w-full min-h-20
    flex items-center justify-between 
    border-t border-interactive-secondary-border backdrop-blur-lg
    
    ${className}
  `)
}

const Footer = forwardRef<HTMLElement, FooterProps>(({ className, children, ...props }, ref) => {
  return (
    <footer ref={ref} className={footerClassName({ className })} {...props}>
      {children}
    </footer>
  )
})

Footer.displayName = 'Footer'

export default Footer
