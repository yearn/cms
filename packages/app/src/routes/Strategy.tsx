import { useMutation } from '@tanstack/react-query'
import { Suspense } from 'react'
import { PiGitPullRequest } from 'react-icons/pi'
import { useParams } from 'react-router-dom'
import { chains } from '../../lib/chains'
import { StrategyMetadataSchema } from '../../schemas/StrategyMetadata'
import type { VaultMetadata } from '../../schemas/VaultMetadata'
import Button from '../components/eg/elements/Button'
import GithubSignIn, { useGithubUser } from '../components/GithubSignIn'
import MetaData, { MetaDataProvider, useMetaData } from '../components/SchemaForm'
import Skeleton from '../components/eg/Skeleton'
import { useStrategyMeta } from '../hooks/useStrategyMeta'

function PullRequestButton() {
  const { o: vault, isDirty, formState } = useMetaData()
  const { rawJsonChainMap } = useStrategyMeta()

  const createPullRequest = useMutation({
    mutationFn: async () => {
      const original = rawJsonChainMap[vault.chainId]
      const path = `packages/cdn/strategies/${vault.chainId}.json`

      // Find and replace the specific vault
      const updatedArray = original.map((vaultObj: VaultMetadata) =>
        vaultObj.address.toLowerCase() === vault.address.toLowerCase() ? formState : vaultObj,
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

function StrategyDetails() {
  const { signedIn } = useGithubUser()
  const { o: strategy } = useMetaData()
  return (
    <div className="flex flex-col items-start justify-start gap-4 w-200">
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold truncate">{strategy.name || 'No name onchain'}</h1>
        <div>
          chain: {chains[strategy.chainId]?.name} ({strategy.chainId})
        </div>
        <div>address: {strategy.address}</div>
      </div>
      <MetaData className="w-200" />
      <Suspense fallback={<Skeleton className="h-12 w-96 my-6 ml-auto" />}>
        {signedIn && <PullRequestButton />}
        {!signedIn && <GithubSignIn className="my-6 ml-auto" />}
      </Suspense>
    </div>
  )
}

function Provider({ children }: { children: React.ReactNode }) {
  const { chainId, address } = useParams()
  const { strategies } = useStrategyMeta()

  const strategy = strategies.find(
    (v) => v.chainId.toString() === chainId && v.address.toLowerCase() === address?.toLowerCase(),
  )

  if (!strategy) {
    throw new Error('Stratgy not found')
  }

  return (
    <MetaDataProvider schema={StrategyMetadataSchema} o={strategy}>
      {children}
    </MetaDataProvider>
  )
}

function StrategySkeleton() {
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

function Strategy() {
  return (
    <div className="px-8 pt-5 pb-16">
      <Suspense fallback={<StrategySkeleton />}>
        <Provider>
          <StrategyDetails />
        </Provider>
      </Suspense>
    </div>
  )
}

export default Strategy
