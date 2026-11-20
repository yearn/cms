import { useEffect } from 'react'

export default function Success() {
  useEffect(() => {
    const redirect = sessionStorage.getItem('post_auth_redirect') || '/'
    sessionStorage.removeItem('post_auth_redirect')
    window.location.href = redirect
  }, [])

  return <div />
}
