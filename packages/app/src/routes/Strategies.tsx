import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import type { StrategyMetadata } from '../../schemas/StrategyMetadata'
import BackItUp from '../components/BackItUp'
import Skeleton from '../components/eg/Skeleton'
import TokenIcon from '../components/eg/TokenIcon'
import Link from '../components/elements/Link'
import { useFinder } from '../components/Finder'
import { useStrategyMeta } from '../hooks/useStrategyMeta'
import { useToggleChainStore } from '../hooks/useToggleChainStore'

const INFINTE_SCROLL_FRAME_SIZE = 20

function List() {
  const { finderString } = useFinder()
  const { toggledChains } = useToggleChainStore()
  const { strategies } = useStrategyMeta()

  const filter: StrategyMetadata[] = useMemo(() => {
    return strategies.filter(
      (strategy: StrategyMetadata) =>
        toggledChains.has(strategy.chainId) &&
        (strategy.name.toLowerCase().includes(finderString.toLowerCase()) ||
          strategy.address.toLowerCase().includes(finderString.toLowerCase())),
    )
  }, [strategies, finderString, toggledChains])

  const [items, setItems] = useState<StrategyMetadata[]>(filter?.slice(0, INFINTE_SCROLL_FRAME_SIZE))
  useEffect(() => setItems(filter?.slice(0, INFINTE_SCROLL_FRAME_SIZE)), [filter])
  const hasMoreFrames = useMemo(() => items.length < filter.length, [items, filter])
  const fetchFrame = useCallback(() => {
    setItems((prevItems) => [
      ...prevItems,
      ...filter.slice(prevItems.length, prevItems.length + INFINTE_SCROLL_FRAME_SIZE),
    ])
  }, [filter])

  return (
    <InfiniteScroll
      scrollableTarget="main-scroll"
      dataLength={items.length}
      next={fetchFrame}
      hasMore={hasMoreFrames}
      loader={null}
      className="flex flex-col items-start justify-start gap-6"
    >
      {items.map((strategy: StrategyMetadata) => (
        <Link
          key={`${strategy.chainId}-${strategy.address}`}
          to={`/strategies/${strategy.chainId}/${strategy.address}`}
          className="flex items-center gap-6 text-lg"
        >
          <TokenIcon chainId={strategy.chainId} address={strategy.address as `0x${string}`} showChain size={48} />
          <div>
            {strategy.address.slice(0, 6)}..{strategy.address.slice(-6)}
          </div>
          <div>{strategy.name || 'No name onchain'}</div>
        </Link>
      ))}
    </InfiniteScroll>
  )
}

function StrategiesSkeleton() {
  return (
    <div className="w-200 flex flex-col items-start justify-start gap-6">
      <Skeleton className="w-full h-10" />
      <Skeleton className="w-full h-10" />
      <Skeleton className="w-full h-10" />
      <Skeleton className="w-full h-10" />
      <Skeleton className="w-full h-10" />
      <Skeleton className="w-full h-10" />
      <Skeleton className="w-full h-10" />
      <Skeleton className="w-full h-10" />
      <Skeleton className="w-full h-10" />
    </div>
  )
}

function Strategies() {
  return (
    <div className="px-8 pt-5 pb-16 flex flex-col">
      <Suspense fallback={<StrategiesSkeleton />}>
        <List />
      </Suspense>
      <BackItUp />
    </div>
  )
}

export default Strategies
