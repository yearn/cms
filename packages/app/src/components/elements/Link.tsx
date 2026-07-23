import NextLink, { type LinkProps } from 'next/link'
import { type AnchorHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../../lib/cn'

export const AnchorClassName = `
underline underline-offset-4
decoration-1 decoration-dashed
hover:text-primary-300 hover:decoration-primary-300
active:text-primary-600 active:decoration-primary-600
`

type Props = AnchorHTMLAttributes<HTMLAnchorElement> &
  LinkProps & {
    className?: string
  }

const Link = forwardRef<HTMLAnchorElement, Props>(({ className, children, ...props }, ref) => {
  return (
    <NextLink {...props} ref={ref} className={cn(AnchorClassName, className)}>
      {children}
    </NextLink>
  )
})

Link.displayName = 'Link'

export default Link
