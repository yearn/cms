import { useEffect, useState } from 'react'

export default function Success() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    const state = urlParams.get('state')

    if (state !== sessionStorage.getItem('auth_challenge')) {
      setError('bad auth challenge')
      return
    }

    sessionStorage.setItem('github_token', token ?? '')
    window.location.href = '/'
  }, [])

  return <div>
    {error && <div>{error}</div>}
  </div>
}