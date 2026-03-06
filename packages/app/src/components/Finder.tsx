import { useLocation, useNavigate } from 'react-router-dom'
import { create } from 'zustand'
import { chains } from '../../lib/chains'
import { useAssetSearchResults } from '../hooks/useAssetSearchResults'
import Card from './eg/elements/Card'
import Input from './eg/elements/Input'

export const useFinder = create<{
  finderString: string
  setFinderString: (text: string) => void
}>((set) => ({
  finderString: '',
  setFinderString: (text: string) => set({ finderString: text }),
}))

export default function Finder({ className }: { className?: string }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { finderString, setFinderString } = useFinder()
  const pathParts = location.pathname.split('/').filter(Boolean)
  const isAssetDetailPage = pathParts.length === 3 && ['vaults', 'strategies', 'tokens'].includes(pathParts[0] ?? '')
  const { results, isLoading, isFetching } = useAssetSearchResults(finderString, isAssetDetailPage)
  const shouldShowDropdown = isAssetDetailPage && finderString.trim().length > 0

  const handleSelect = (path: string) => {
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

      {shouldShowDropdown && (
        <Card className="mt-2 p-0 overflow-hidden absolute left-0 right-0 z-100 min-w-0">
          {isLoading || isFetching ? (
            <div className="px-4 py-3 text-sm opacity-70">Loading results...</div>
          ) : results.length > 0 ? (
            results.map((result) => (
              <button
                type="button"
                key={result.id}
                className="w-full px-4 py-3 flex items-start justify-between gap-4 text-left hover:bg-interactive-secondary-hover"
                onClick={() => handleSelect(result.path)}
              >
                <div className="min-w-0">
                  <div className="truncate">{result.name}</div>
                  <div className="font-mono text-xs opacity-60 truncate">{result.address}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm">{result.typeLabel}</div>
                  <div className="text-xs opacity-60">{chains[result.chainId]?.name || `Chain ${result.chainId}`}</div>
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm opacity-70">No matching assets.</div>
          )}
        </Card>
      )}
    </div>
  )
}
