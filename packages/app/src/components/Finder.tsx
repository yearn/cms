import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { create } from 'zustand'
import { chains } from '../../lib/chains'
import { type SearchResult, useAssetSearchResults } from '../hooks/useAssetSearchResults'
import Card from './eg/elements/Card'
import Input from './eg/elements/Input'

type FinderProps = {
  className?: string
}

export const useFinder = create<{
  finderString: string
  setFinderString: (text: string) => void
}>((set) => ({
  finderString: '',
  setFinderString: (text: string) => set({ finderString: text }),
}))

const ASSET_DETAIL_COLLECTIONS = new Set(['vaults', 'strategies', 'tokens'])

function isAssetDetailPath(pathname: string): boolean {
  const pathParts = pathname.split('/').filter(Boolean)
  return pathParts.length === 3 && ASSET_DETAIL_COLLECTIONS.has(pathParts[0] ?? '')
}

function getChainLabel(chainId: number): string {
  return chains[chainId]?.name || `Chain ${chainId}`
}

function renderDropdownContent(
  results: SearchResult[],
  isLoading: boolean,
  isFetching: boolean,
  onSelect: (path: string) => void,
): ReactNode {
  if (isLoading || isFetching) {
    return <div className="px-4 py-3 text-sm opacity-70">Loading results...</div>
  }

  if (results.length === 0) {
    return <div className="px-4 py-3 text-sm opacity-70">No matching assets.</div>
  }

  return results.map((result) => (
    <button
      type="button"
      key={result.id}
      className="w-full px-4 py-3 flex items-start justify-between gap-4 text-left hover:bg-interactive-secondary-hover"
      onClick={() => onSelect(result.path)}
    >
      <div className="min-w-0">
        <div className="truncate">{result.name}</div>
        <div className="font-mono text-xs opacity-60 truncate">{result.address}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm">{result.typeLabel}</div>
        <div className="text-xs opacity-60">{getChainLabel(result.chainId)}</div>
      </div>
    </button>
  ))
}

export default function Finder({ className }: FinderProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { finderString, setFinderString } = useFinder()
  const hasQuery = finderString.trim().length > 0
  const isAssetDetailPage = isAssetDetailPath(location.pathname)
  const searchEnabled = isAssetDetailPage && hasQuery
  const { results, isLoading, isFetching } = useAssetSearchResults(finderString, searchEnabled)

  function handleSelect(path: string): void {
    setFinderString('')
    navigate(path)
  }

  return (
    <div className={className}>
      <Input
        type="text"
        placeholder="Search by name or address"
        value={finderString}
        onChange={(e) => setFinderString(e.target.value)}
        className="w-full h-8 py-5 grow"
      />

      {searchEnabled && (
        <Card className="mt-2 p-0 overflow-hidden absolute left-0 right-0 z-100 min-w-0">
          {renderDropdownContent(results, isLoading, isFetching, handleSelect)}
        </Card>
      )}
    </div>
  )
}
