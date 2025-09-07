import { cn } from './cn'

export default function Skeleton({
  className,
  style,
  children,
}: {
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
}) {
  return (
    <div className={cn('animate-skeleton rounded-primary', className)} style={style}>
      {children}
    </div>
  )
}
