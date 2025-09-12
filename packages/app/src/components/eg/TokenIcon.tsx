import { getTokenIconUrl } from '../../../lib/assets'
import ChainIcon from './ChainIcon'
import { cn } from './cn'
import ImgOrBg from './ImgOrBg'

type Props = {
  chainId: number
  address: `0x${string}`
  size?: number
  showChain?: boolean
  className?: string
  bgClassName?: string
}

export default function TokenIcon(props: Props) {
  const { chainId, address, size, showChain, className, bgClassName } = props
  const src = getTokenIconUrl(chainId, address)

  return (
    <div className="relative isolate">
      <ImgOrBg
        bgClassName={cn('z-0 rounded-full', bgClassName)}
        src={src}
        alt={`Token ${address} image`}
        width={size ?? 32}
        height={size ?? 32}
        className={cn(chainId === 100 ? 'z-1 invert' : 'z-1', className)}
      />
      {showChain && (
        <ChainIcon
          chainId={chainId}
          size={Math.floor((size ?? 16) / 2.5)}
          className={cn(
            'outline-3 outline-[var(--background)] rounded-full absolute z-10 bottom-0 right-0',
            bgClassName,
          )}
        />
      )}
    </div>
  )
}
