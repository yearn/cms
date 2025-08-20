import { useMutation } from '@tanstack/react-query'
import { Suspense } from 'react'
import { PiGitPullRequest } from 'react-icons/pi'
import { useParams } from 'react-router-dom'
import { type GlobalKey, getGlobal, getGlobalKeys } from '../../schemas/cms'
import { useGlobalData } from '../hooks/useGlobalData'
import Button from './elements/Button'
import GithubSignIn, { useGithubUser } from './GithubSignIn'
import MetaData, { MetaDataProvider, useMetaData } from './SchemaForm'
import Skeleton from './Skeleton'

function PullRequestButton({ globalKey }: { globalKey: GlobalKey }) {
  const { isDirty, formState } = useMetaData()

  const createPullRequest = useMutation({
    mutationFn: async () => {
      const path = `packages/cdn/globals/${globalKey}.json`

      const response = await fetch('/api/pr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: sessionStorage.getItem('github_token'),
          path,
          contents: JSON.stringify(formState, null, 2),
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

function GlobalDetails({ globalKey }: { globalKey: GlobalKey }) {
  const { signedIn } = useGithubUser()
  const globalConfig = getGlobal(globalKey)

  return (
    <div className="flex flex-col items-start justify-start gap-4 w-200">
      {/* Standard header */}
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold truncate">{globalConfig.displayName}</h1>
        {globalConfig.description && <div className="text-primary-400">{globalConfig.description}</div>}
      </div>

      <MetaData className="w-200" />
      <Suspense fallback={<Skeleton className="h-12 w-96 my-6 ml-auto" />}>
        {signedIn && <PullRequestButton globalKey={globalKey} />}
        {!signedIn && <GithubSignIn className="my-6 ml-auto" />}
      </Suspense>
    </div>
  )
}

function Provider({ children, globalKey }: { children: React.ReactNode; globalKey: GlobalKey }) {
  const globalConfig = getGlobal(globalKey)
  const { data } = useGlobalData(globalKey)

  return (
    <MetaDataProvider schema={globalConfig.schema} o={data}>
      {children}
    </MetaDataProvider>
  )
}

function GlobalSkeleton() {
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

function Global() {
  const { globalKey } = useParams()

  if (!globalKey || !getGlobalKeys().includes(globalKey as any)) {
    throw new Error(`Global ${globalKey} not found`)
  }

  const globalKeyTyped = globalKey as GlobalKey

  return (
    <div className="px-8 pt-5 pb-16">
      <Suspense key={globalKeyTyped} fallback={<GlobalSkeleton />}>
        <Provider globalKey={globalKeyTyped}>
          <GlobalDetails globalKey={globalKeyTyped} />
        </Provider>
      </Suspense>
    </div>
  )
}

export default Global
