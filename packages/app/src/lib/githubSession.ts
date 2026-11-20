export function getGithubLogin(): string {
  const match = document.cookie.match(/(?:^|;\s*)github_user=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : ''
}
