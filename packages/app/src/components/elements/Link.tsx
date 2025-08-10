import { type AnchorHTMLAttributes, forwardRef } from 'react'
import { Link as _Link } from 'react-router-dom'
import { cn } from '../../../lib/cn'

export const AnchorClassName = `
underline underline-offset-4
decoration-1 decoration-dashed
hover:text-primary-300 hover:decoration-primary-300
active:text-primary-600 active:decoration-primary-600
`

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  className?: string,
  to: string,
}

const Link = forwardRef<HTMLAnchorElement, Props>(({ className, children, ...props }, ref) => {
  return <_Link {...props} ref={ref} className={cn(AnchorClassName, className)}>
    {children}
  </_Link>
})

Link.displayName = 'Link'

export default Link