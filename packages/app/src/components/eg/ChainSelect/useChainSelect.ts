import { chains } from '../../../../lib/chains'
import { useToggleChainStore } from '../../../hooks/useToggleChainStore'

export function useChainSelect() {
  const { toggledChains, toggleChain } = useToggleChainStore()

  const chainIds = Object.keys(chains).map(Number)

  const clearAll = () => {
    chainIds.forEach((chainId) => toggleChain(chainId, false))
  }

  const selectAll = (chainIds: number[]) => {
    // First clear all
    Object.keys(chains)
      .map(Number)
      .forEach((chainId) => toggleChain(chainId, false))
    // Then select the provided ones
    chainIds.forEach((chainId) => toggleChain(chainId, true))
  }

  return {
    selectedChains: toggledChains,
    toggleChain,
    clearAll,
    selectAll,
    isSelected: (chainId: number) => toggledChains.has(chainId),
  }
}
