import type { ImgHTMLAttributes } from 'react'
import { useMemo, useState } from 'react'
import { cn } from './cn'

interface ImgOrBg extends ImgHTMLAttributes<HTMLImageElement> {
  bgClassName?: string
  children?: React.ReactNode
}

export default function ImgOrBg({ className, bgClassName, children, ...imageProps }: ImgOrBg) {
  const [loaded, setLoaded] = useState(false)
  const imageClassName = useMemo(() => (loaded ? 'block' : 'hidden'), [loaded])
  return (
    <div className={cn('isolate relative', className)} style={{ width: imageProps.width, height: imageProps.height }}>
      <div
        title={imageProps.alt}
        style={{ width: imageProps.width, height: imageProps.height }}
        className={cn('absolute z-0 inset-0 bg-[var(--card-border)]', bgClassName)}
      >
        {children}
      </div>
      <img
        {...imageProps}
        alt={imageProps.alt ?? ''}
        onLoad={() => setLoaded(true)}
        width={imageProps.width ?? 32}
        height={imageProps.height ?? 32}
        className={cn('absolute z-10 inset-0', imageClassName)}
      />
    </div>
  )
}