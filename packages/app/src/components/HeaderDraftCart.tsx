import { useMutation } from '@tanstack/react-query'
import { useMemo } from 'react'
import { PiGitPullRequest } from 'react-icons/pi'
import { applyDraftPatch, type DraftCartItem, useDraftCartStore } from '../hooks/useDraftCartStore'
import { fetchCollectionData } from '../lib/collectionData'
import Button from './eg/elements/Button'
import { HoverCard, HoverCardTrigger } from './eg/HoverCard'

const collectionLabels = {
  vaults: 'Vault',
  strategies: 'Strategy',
  tokens: 'Token',
} as const

type PullRequestChange = {
  path: string
  contents: string
}

type CollectionDataCache = Map<string, Awaited<ReturnType<typeof fetchCollectionData>>>

function buildPullRequestBody(items: DraftCartItem[]): string {
  const groupedLines = [...items]
    .sort((a, b) => a.path.localeCompare(b.path) || a.name.localeCompare(b.name))
    .map((item) => `- ${item.path}: ${collectionLabels[item.collection]} ${item.name} (${item.chainId})`)

  return ['This PR updates CMS metadata.', '', 'Changes:', ...groupedLines].join('\n')
}

async function buildCollectionDataCache(items: DraftCartItem[]): Promise<CollectionDataCache> {
  const collectionData = new Map<string, Awaited<ReturnType<typeof fetchCollectionData>>>()
  for (const item of items) {
    if (!collectionData.has(item.collection)) {
      collectionData.set(item.collection, await fetchCollectionData(item.collection))
    }
  }

  return collectionData
}

function groupItemsByPath(items: DraftCartItem[]): Map<string, DraftCartItem[]> {
  const itemsByPath = new Map<string, DraftCartItem[]>()

  for (const item of items) {
    const pathItems = itemsByPath.get(item.path) ?? []
    pathItems.push(item)
    itemsByPath.set(item.path, pathItems)
  }

  return itemsByPath
}

function buildPathChange(
  path: string,
  pathItems: DraftCartItem[],
  collectionData: CollectionDataCache,
): PullRequestChange {
  const firstItem = pathItems[0]
  if (!firstItem) {
    throw new Error(`Missing queued changes for ${path}`)
  }

  const rawJsonChainMap = collectionData.get(firstItem.collection)?.rawJsonChainMap ?? {}
  const sourceItems = rawJsonChainMap[firstItem.chainId]

  if (!sourceItems) {
    throw new Error(`Missing source data for ${path}`)
  }

  const replacements = new Map(pathItems.map((item) => [item.address.toLowerCase(), item]))
  let replacedCount = 0
  const updatedItems = sourceItems.map((sourceItem) => {
    const sourceAddress = String((sourceItem as { address: string }).address).toLowerCase()
    const replacement = replacements.get(sourceAddress)
    if (!replacement) {
      return sourceItem
    }

    if (replacement.patch === undefined) {
      throw new Error(
        `Draft for ${replacement.name} is outdated. Open it again and update the draft before submitting.`,
      )
    }

    replacedCount += 1
    return applyDraftPatch(sourceItem, replacement.patch)
  })

  if (replacedCount !== pathItems.length) {
    throw new Error(`Could not apply all queued changes for ${path}`)
  }

  return {
    path,
    contents: JSON.stringify(updatedItems, null, 2),
  }
}

async function buildPullRequestChanges(items: DraftCartItem[]): Promise<PullRequestChange[]> {
  const collectionData = await buildCollectionDataCache(items)
  const itemsByPath = groupItemsByPath(items)

  return Array.from(itemsByPath.entries()).map(([path, pathItems]) => {
    return buildPathChange(path, pathItems, collectionData)
  })
}

function getQueuedChangesLabel(count: number): string {
  if (count === 0) {
    return 'No queued changes'
  }

  return `${count} queued change${count === 1 ? '' : 's'}`
}

export default function HeaderDraftCart() {
  const itemsMap = useDraftCartStore((state) => state.items)
  const removeItem = useDraftCartStore((state) => state.removeItem)
  const clearItems = useDraftCartStore((state) => state.clearItems)

  const signedIn = Boolean(sessionStorage.getItem('github_token'))
  const items = useMemo(() => Object.values(itemsMap), [itemsMap])
  const hasItems = items.length > 0

  const createPullRequest = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/pr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: sessionStorage.getItem('github_token'),
          title: 'Update CMS metadata',
          body: buildPullRequestBody(items),
          changes: await buildPullRequestChanges(items),
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to create pull request')
      }

      return result
    },
    onSuccess: (data) => {
      const popup = window.open(data.pullRequestUrl, '_blank', 'noopener,noreferrer')
      if (popup) {
        clearItems()
        return
      }

      window.location.assign(data.pullRequestUrl)
    },
    onError: (error) => {
      console.error('PR creation failed:', error)
      alert(`Failed to create pull request: ${error.message}`)
    },
  })

  return (
    <HoverCard
      hoverCardId="header-draft-cart"
      alignRight
      trigger={
        <HoverCardTrigger className="min-w-38 justify-start">
          <PiGitPullRequest />
          <span className="flex-1">Drafts</span>
          <span className="text-sm opacity-70">{items.length}</span>
        </HoverCardTrigger>
      }
      cardClassName="p-0 w-120"
    >
      <div className="flex flex-col">
        <div className="px-6 py-4 border-b border-interactive-secondary-border text-lg">
          {getQueuedChangesLabel(items.length)}
        </div>

        {hasItems && (
          <div className="max-h-96 overflow-y-auto">
            {items.map((item) => (
              <div
                key={item.id}
                className="px-6 py-4 flex items-start gap-4 border-b border-interactive-secondary-border last:border-b-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{item.name}</div>
                  <div className="text-sm opacity-70">
                    {collectionLabels[item.collection]} · chain {item.chainId}
                  </div>
                  <div className="font-mono text-xs opacity-60 truncate">{item.address}</div>
                </div>

                {signedIn && (
                  <button
                    type="button"
                    className="text-sm opacity-70 hover:opacity-100 transition-opacity"
                    onClick={() => removeItem(item.id)}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="px-6 py-4 flex items-center gap-3 border-t border-interactive-secondary-border">
          {!signedIn && hasItems && <div className="text-sm opacity-70">Sign in to edit or submit drafts.</div>}

          {signedIn && hasItems && (
            <>
              <button
                type="button"
                className="text-sm opacity-70 hover:opacity-100 transition-opacity"
                onClick={() => clearItems()}
              >
                Clear all
              </button>

              <Button
                variant={createPullRequest.isPending ? 'busy' : 'primary'}
                className="ml-auto flex items-center gap-3"
                onClick={() => createPullRequest.mutate()}
                disabled={!hasItems}
              >
                <PiGitPullRequest />
                <span>Create pull request</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </HoverCard>
  )
}
