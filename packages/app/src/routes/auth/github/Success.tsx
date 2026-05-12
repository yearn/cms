import { useEffect, useState } from 'react'

export default function Success() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    const state = urlParams.get('state')
    const redirect = sessionStorage.getItem('post_auth_redirect') || '/'

    if (state !== sessionStorage.getItem('auth_challenge')) {
      setError('bad auth challenge')
      return
    }

    sessionStorage.setItem('github_token', token ?? '')
    sessionStorage.removeItem('auth_challenge')
    sessionStorage.removeItem('post_auth_redirect')
    window.location.href = redirect
  }, [])

  return <div>{error && <div>{error}</div>}</div>
}
