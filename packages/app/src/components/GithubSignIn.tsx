import { useSuspenseQuery } from '@tanstack/react-query'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { PiGithubLogoFill } from 'react-icons/pi'
import { cn } from '../../lib/cn'
import Button from './eg/elements/Button'
import Skeleton from './eg/Skeleton'

export function useGithubUser() {
  const token = sessionStorage.getItem('github_token')
  const signedIn = Boolean(token)

  const { data } = useSuspenseQuery({
    queryKey: ['githubUser', token],
    queryFn: async () => {
      if (!signedIn) return null
      const res = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) throw new Error('Failed to fetch user')
      return res.json()
    },
  })

  return { signedIn, avatar: data?.avatar_url }
}

function GithubAvatar() {
  const { avatar, signedIn } = useGithubUser()
  if (!signedIn) return <div className="w-6 h-6 rounded-full" />
  return <img src={avatar ?? ''} alt="Github avatar" className="w-6 h-6 rounded-full" />
}

export default function GithubSignIn({ className }: { className?: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { signedIn } = useGithubUser()

  const onSignInWithGithub = () => {
    if (!signedIn) {
      const auth_challenge = crypto.randomUUID()
      const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID
      if (!clientId) {
        throw new Error('Missing NEXT_PUBLIC_GITHUB_CLIENT_ID')
      }

      sessionStorage.setItem('auth_challenge', auth_challenge)
      const query = searchParams.toString()
      sessionStorage.setItem('post_auth_redirect', `${pathname}${query ? `?${query}` : ''}${window.location.hash}`)
      const params = new URLSearchParams({
        client_id: clientId,
        state: auth_challenge,
        scope: 'public_repo',
      })
      if (process.env.NEXT_PUBLIC_GITHUB_REDIRECT_URI) {
        params.set('redirect_uri', process.env.NEXT_PUBLIC_GITHUB_REDIRECT_URI)
      }
      window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`
    } else {
      sessionStorage.removeItem('github_token')
      window.location.reload()
    }
  }

  return (
    <Button
      variant={signedIn ? 'secondary' : 'primary'}
      onClick={onSignInWithGithub}
      className={cn('flex items-center gap-4', className)}
    >
      {signedIn ? (
        <Suspense fallback={<Skeleton className="w-6 h-6 rounded-full" />}>
          <GithubAvatar />
        </Suspense>
      ) : (
        <PiGithubLogoFill />
      )}
      <span>{signedIn ? 'Sign out' : 'Sign in'}</span>
    </Button>
  )
}
