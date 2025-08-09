import { chains } from '@webops/core'
import { cn } from '../../lib/cn'
import ChainIcon from '../ChainIcon'
import Button from '../elements/Button'
import { useToggleStore } from './useToggleStore'

function Toggle({ chainId }: { chainId: number }) {
  const { toggledChains, toggleChain } = useToggleStore()
  const isToggled = toggledChains.has(chainId)

  return (
    <Button 
      data-toggled={isToggled}
      className={cn(`
        group relative w-[48px] h-[24px] p-0 overflow-hidden rounded-xl outline-3 outline-offset-3
        data-[toggled=true]:outline-primary-400 data-[toggled=false]:outline-transparent
      `)}
      onClick={() => toggleChain(chainId)}
    >
      <ChainIcon 
        chainId={chainId} 
        size={64} 
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          'group-hover:scale-200 transition-transform',
          isToggled ? "opacity-100" : "grayscale opacity-50"
        )} 
      />
    </Button>
  )
}

function ToggleAll() {
  const { toggledChains, toggleChain } = useToggleStore()
  const anyToggled = Array.from(toggledChains).length > 0
  const toggleAll = () => {
    if (anyToggled) {
      Object.values(chains).map(chain => chain.id).forEach(chainId => toggleChain(chainId, false))      
    } else {
      Object.values(chains).map(chain => chain.id).forEach(chainId => toggleChain(chainId, true))
    }
  }
  return <div className="w-[48px] flex items-center justify-center">
    <Button className="w-[24px] h-[24px] p-0" onClick={toggleAll}></Button>
  </div>
}

export default function ToggleChains({ className }: { className?: string }) {
  return <div className={cn('px-2 flex items-center gap-8', className)}>
    {Object.values(chains).map(chain => (
      <Toggle key={chain.id} chainId={chain.id} />
    ))}
    <ToggleAll />
  </div>
}
