import { getChainIconUrl } from '../../../lib/assets'
import { chains } from '../../../lib/chains'
import { cn } from './cn'
import ImgOrBg from './ImgOrBg'

type Props = {
  chainId: number
  size?: number
  className?: string
  bgClassName?: string
}

export default function ChainIcon({ chainId, size = 24, className, bgClassName }: Props) {
  return (
    <ImgOrBg
      bgClassName={cn('rounded-full', bgClassName)}
      src={getChainIconUrl(chainId)}
      alt={chains[chainId]?.name}
      width={size}
      height={size}
      className={cn('rounded-full', className)}
    />
  )
}