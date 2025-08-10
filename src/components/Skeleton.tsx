import { cn } from '../../lib/cn'

export default function Skeleton({ className, style, children }: { className?: string, style?: React.CSSProperties, children?: React.ReactNode }) {
  return <div className={cn('animate-suspense rounded-primary', className)} style={style}>
    {children}
  </div>
}
