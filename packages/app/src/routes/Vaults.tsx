import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import type { VaultMetadata } from '../../schemas/VaultMetadata'
import BackItUp from '../components/BackItUp'
import Link from '../components/elements/Link'
import { useFinder } from '../components/Finder'
import Skeleton from '../components/eg/Skeleton'
import { useToggleChainStore } from '../hooks/useToggleChainStore'
import TokenIcon from '../components/eg/TokenIcon'
import { useVaultsMeta } from '../hooks/useVaultMeta'

const INFINTE_SCROLL_FRAME_SIZE = 20

function List() {
  const { finderString } = useFinder()
  const { toggledChains } = useToggleChainStore()
  const { vaults } = useVaultsMeta()

  const filter: VaultMetadata[] = useMemo(() => {
    return vaults.filter(
      (vault: VaultMetadata) =>
        toggledChains.has(vault.chainId) &&
        (vault.name.toLowerCase().includes(finderString.toLowerCase()) ||
          vault.address.toLowerCase().includes(finderString.toLowerCase())),
    )
  }, [vaults, finderString, toggledChains])

  const [items, setItems] = useState<VaultMetadata[]>(filter?.slice(0, INFINTE_SCROLL_FRAME_SIZE))
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
      {items.map((vault: VaultMetadata) => (
        <Link
          key={`${vault.chainId}-${vault.address}`}
          to={`/vaults/${vault.chainId}/${vault.address}`}
          className="flex items-center gap-6 text-lg"
        >
          <TokenIcon chainId={vault.chainId} address={vault.address as `0x${string}`} showChain size={48} />
          <div>
            {vault.address.slice(0, 6)}..{vault.address.slice(-6)}
          </div>
          <div>{vault.name}</div>
        </Link>
      ))}
    </InfiniteScroll>
  )
}

function VaultsSkeleton() {
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

function Vaults() {
  return (
    <div className="px-8 pt-5 pb-16 flex flex-col">
      <Suspense fallback={<VaultsSkeleton />}>
        <List />
      </Suspense>
      <BackItUp />
    </div>
  )
}

export default Vaults
