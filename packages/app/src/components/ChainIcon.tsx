import { getChainIconUrl } from '../../lib/assets'
import { chains } from '../../lib/chains'
import { cn } from '../../lib/cn'
import ImgOrBg from './ImgOrBg'

type Props = {
  chainId: number,
  size?: number,
  className?: string,
  bgClassName?: string,
  style?: React.CSSProperties
}

export default function ChainIcon(props: Props) {
  const { chainId, size, className, bgClassName, style } = props
  const src = getChainIconUrl(chainId)
  return <ImgOrBg
    bgClassName={cn('bg-neutral-900/60 rounded-full', bgClassName)}
    src={src}
    alt={chains[chainId].name}
    width={size ?? 32}
    height={size ?? 32}
    style={style}
    className={cn(chainId === 100 ? 'invert' : '', className)} />
}
