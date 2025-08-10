import { useMutation } from '@tanstack/react-query'
import { useVaultsMeta } from '@webops/cms/react'
import { chains } from '@webops/core'
import { Suspense } from 'react'
import { PiGitPullRequest } from 'react-icons/pi'
import { useParams } from 'react-router-dom'
import { type VaultMetadata, VaultMetadataSchema } from '../../../core/types/VaultMetadata'
import Button from '../components/elements/Button'
import GithubSignIn, { useGithubUser } from '../components/GithubSignIn'
import MetaData, { MetaDataProvider, useMetaData } from '../components/SchemaForm'
import Skeleton from '../components/Skeleton'

function PullRequestButton() {
  const { o: vault, isDirty, formState } = useMetaData()
  const { rawJsonChainMap } = useVaultsMeta()

  const createPullRequest = useMutation({
    mutationFn: async () => {
      const original = rawJsonChainMap[vault.chainId]
      const path = `packages/cms/cdn/content/vaults/${vault.chainId}.json`
      
      // Find and replace the specific vault
      const updatedArray = original.map((vaultObj: VaultMetadata) => 
        vaultObj.address.toLowerCase() === vault.address.toLowerCase() 
          ? formState 
          : vaultObj
      )
      
      const response = await fetch('/api/pr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: sessionStorage.getItem('github_token'),
          path,
          contents: JSON.stringify(updatedArray, null, 2)
        })
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
    }
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

function VaultDetails() {
  const { signedIn } = useGithubUser()
  const { o: vault } = useMetaData()
  return (
    <div className="flex flex-col items-start justify-start gap-4 w-200">
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold truncate">{vault.name}</h1>
        <div>chain: {chains[vault.chainId]?.name} ({vault.chainId})</div>
        <div>address: {vault.address}</div>
        <div>registry: {vault.registry}</div>
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
  const { vaults } = useVaultsMeta()

  const vault = vaults.find(v => 
    v.chainId.toString() === chainId && 
    v.address.toLowerCase() === address?.toLowerCase()
  )

  if (!vault) { throw new Error('Vault not found') }

  return <MetaDataProvider schema={VaultMetadataSchema} o={vault}>
    {children}
  </MetaDataProvider>
}

function VaultSkeleton() {
  return <div className="w-200 flex flex-col items-start justify-start gap-6">
    <Skeleton className="w-full h-42" />
    <Skeleton className="w-full h-16" />
    <Skeleton className="w-full h-10" />
    <Skeleton className="w-full h-16" />
    <Skeleton className="w-full h-16" />
  </div>
}

function Vault() {
  return (
    <div className="px-8 pt-5 pb-16">
      <Suspense fallback={<VaultSkeleton />}>
        <Provider>
          <VaultDetails />
        </Provider>
      </Suspense>
    </div>
  )
}

export default Vault 