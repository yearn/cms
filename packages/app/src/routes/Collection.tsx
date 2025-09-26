import { useMutation } from '@tanstack/react-query'
import { Suspense } from 'react'
import { PiGitPullRequest } from 'react-icons/pi'
import { useParams } from 'react-router-dom'
import { chains } from '../../lib/chains'
import { type CollectionKey, getCollection, getCollectionKeys } from '../../schemas/cms'
import Button from '../components/eg/elements/Button'
import Skeleton from '../components/eg/Skeleton'
import GithubSignIn, { useGithubUser } from '../components/GithubSignIn'
import MetaData, { MetaDataProvider, useMetaData } from '../components/SchemaForm'
import { useCollectionData } from '../hooks/useCollectionData'

function PullRequestButton({ collection }: { collection: CollectionKey }) {
  const { o: item, isDirty, formState } = useMetaData()
  const { rawJsonChainMap } = useCollectionData(collection)

  const createPullRequest = useMutation({
    mutationFn: async () => {
      const original = rawJsonChainMap[item.chainId]
      const path = `packages/cdn/${collection}/${item.chainId}.json`

      // Find and replace the specific item
      const updatedArray = original.map((itemObj: any) =>
        itemObj.address.toLowerCase() === item.address.toLowerCase() ? formState : itemObj,
      )

      const response = await fetch('/api/pr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: sessionStorage.getItem('github_token'),
          path,
          contents: JSON.stringify(updatedArray, null, 2),
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to create pull request')
      }

      return result
    },
    onSuccess: (data) => {
      window.open(data.pullRequestUrl, '_blank')
    },
    onError: (error) => {
      console.error('PR creation failed:', error)
      alert(`Failed to create pull request: ${error.message}`)
    },
  })

  // Throw a promise to trigger Suspense when pending
  if (createPullRequest.isPending) {
    throw new Promise(() => {}) // This will never resolve, keeping Suspense active
  }

  return (
    <Button
      onClick={() => createPullRequest.mutate()}
      className="my-6 ml-auto flex items-center gap-4"
      disabled={!isDirty}
    >
      <PiGitPullRequest />
      <div>Create pull request</div>
    </Button>
  )
}

function CollectionDetails({ collection }: { collection: CollectionKey }) {
  const { signedIn } = useGithubUser()
  const { o: item } = useMetaData()

  return (
    <div className="flex flex-col items-start justify-start gap-4 w-200">
      {/* Standard header for all CMS types */}
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold truncate">{item.name}</h1>
        {item.chainId && (
          <div>
            chain: {chains[item.chainId]?.name} ({item.chainId})
          </div>
        )}
        {item.address && <div>address: {item.address}</div>}
        {item.registry && <div>registry: {item.registry}</div>}
      </div>

      <MetaData className="w-200" />
      <Suspense fallback={<Skeleton className="h-12 w-96 my-6 ml-auto" />}>
        {signedIn && <PullRequestButton collection={collection} />}
        {!signedIn && <GithubSignIn className="my-6 ml-auto" />}
      </Suspense>
    </div>
  )
}

function Provider({ children, collection }: { children: React.ReactNode; collection: CollectionKey }) {
  const { chainId, address } = useParams()
  const collectionConfig = getCollection(collection)
  const { data } = useCollectionData(collection)

  const item = data.find(
    (d: any) => d.chainId.toString() === chainId && d.address.toLowerCase() === address?.toLowerCase(),
  )

  if (!item) {
    throw new Error(`${collectionConfig.displayName.slice(0, -1)} not found`)
  }

  return (
    <MetaDataProvider schema={collectionConfig.schema} o={item}>
      {children}
    </MetaDataProvider>
  )
}

function CollectionSkeleton() {
  return (
    <div className="w-200 flex flex-col items-start justify-start gap-6">
      <Skeleton className="w-full h-42" />
      <Skeleton className="w-full h-16" />
      <Skeleton className="w-full h-10" />
      <Skeleton className="w-full h-16" />
      <Skeleton className="w-full h-16" />
    </div>
  )
}

function Collection() {
  const { collection } = useParams()

  if (!collection || !getCollectionKeys().includes(collection as any)) {
    throw new Error(`Collection ${collection} not found`)
  }

  const collectionKey = collection as CollectionKey

  return (
    <div className="px-8 pt-5 pb-16">
      <Suspense fallback={<CollectionSkeleton />}>
        <Provider collection={collectionKey}>
          <CollectionDetails collection={collectionKey} />
        </Provider>
      </Suspense>
    </div>
  )
}

export default Collection
