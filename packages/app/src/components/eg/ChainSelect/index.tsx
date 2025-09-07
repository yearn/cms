import { memo, useMemo } from 'react'
import { PiCaretDownBold, PiFireSimpleFill } from 'react-icons/pi'
import { chains } from '../../../../lib/chains'
import ChainIcon from '../ChainIcon'
import { cn } from '../cn'
import { useMounted } from '../hooks/useMounted'
import { HoverCard, HoverCardTrigger } from '../HoverCard'
import FlyInFromBottom from '../motion/FlyInFromBottom'
import { useChainSelect } from './useChainSelect'

const ChainItem = memo(({ chainId }: { chainId: number }) => {
  const { toggleChain, isSelected } = useChainSelect()
  const chain = chains[chainId]
  const selected = isSelected(chainId)

  return (
    <button
      type="button"
      onClick={() => toggleChain(chainId)}
      className={cn(
        'group/icon w-full pl-6 pr-8 py-3 flex items-center',
        'hover:bg-interactive-secondary-hover transition-colors',
        'active:bg-interactive-secondary-active',
        'text-left text-xl cursor-pointer',
      )}
    >
      <div className="relative w-8 h-8 overflow-hidden rounded-lg">
        <ChainIcon
          chainId={chainId}
          size={32}
          className="group-hover/icon:scale-200 group-hover/icon:rotate-12 transition-all duration-200"
        />
      </div>
      <span className="flex-1 ml-4">{chain?.name || `Chain ${chainId}`}</span>
      {selected && <div className="w-3 h-3 rounded-full bg-interactive-secondary-active" />}
    </button>
  )
})

interface ChainSelectProps {
  showAllChainsIndicator?: boolean
}

export function ChainSelect({ showAllChainsIndicator = false }: ChainSelectProps = {}) {
  const { selectedChains, clearAll, selectAll } = useChainSelect()
  const mounted = useMounted()

  const chainIds = useMemo(() => Object.keys(chains).map(Number), [])
  const selectedArray = useMemo(() => chainIds.filter((id) => selectedChains.has(id)), [selectedChains, chainIds])
  const allSelected = useMemo(() => selectedArray.length === chainIds.length, [selectedArray.length, chainIds.length])

  const handleToggleAll = () => {
    if (selectedArray.length === chainIds.length) {
      clearAll()
    } else {
      selectAll(chainIds)
    }
  }

  return (
    <div className="flex relative select-none">
      {showAllChainsIndicator && allSelected && (
        <FlyInFromBottom _key="all-chains-indicator" className="absolute -top-6 left-0 ml-2">
          <div className="flex items-center gap-1 text-sm italic">
            <PiFireSimpleFill />
            All chains
          </div>
        </FlyInFromBottom>
      )}
      <HoverCard
        hoverCardId="chain-selector"
        trigger={
          <HoverCardTrigger className="w-86 justify-start" onClick={handleToggleAll}>
            <span
              data-length={selectedArray.length}
              className="flex-1 flex items-center w-full data-[length=0]:opacity-60"
            >
              {selectedArray.length === 0 && 'Select chains..'}
              {selectedArray.length === 1 && (
                <>
                  <FlyInFromBottom _key={`chain-${selectedArray[0]}`} parentMounted={mounted}>
                    <ChainIcon chainId={selectedArray[0]} size={40} className="drop-shadow-2" />
                  </FlyInFromBottom>
                  <span className="ml-4">{chains[selectedArray[0]]?.name || 'Unknown'}</span>
                </>
              )}
              {selectedArray.length > 1 && (
                <div className="flex items-center">
                  {selectedArray.map((chainId, index) => (
                    <div key={chainId} className="relative" style={{ marginLeft: index === 0 ? 0 : -16 }}>
                      <FlyInFromBottom _key={`chain-${chainId}`} parentMounted={mounted}>
                        <ChainIcon chainId={chainId} size={40} className="drop-shadow-2" />
                      </FlyInFromBottom>
                    </div>
                  ))}
                </div>
              )}
            </span>
            <PiCaretDownBold className="ml-2 opacity-40" size={16} />
          </HoverCardTrigger>
        }
        cardClassName="p-0 w-86 max-h-96 overflow-y-auto"
      >
        <div>
          <button
            type="button"
            onClick={handleToggleAll}
            className={cn(
              'w-full pl-6 pr-8 py-3 flex items-center',
              'hover:bg-interactive-secondary-hover transition-colors',
              'active:bg-interactive-secondary-active',
              'text-left text-xl cursor-pointer',
              'border-b border-interactive-secondary-border',
            )}
          >
            <span className="flex-1">{allSelected ? 'Clear all' : 'Select all'}</span>
            {allSelected && <div className="w-3 h-3 rounded-full bg-interactive-secondary-active" />}
          </button>

          {chainIds.map((chainId) => (
            <ChainItem key={chainId} chainId={chainId} />
          ))}
        </div>
      </HoverCard>
    </div>
  )
}