export const config = { runtime: 'edge' }

const REPO_OWNER = process.env.REPO_OWNER || 'yearn'
const REPO_NAME = process.env.REPO_NAME || 'cms'

type FileChange = {
  path: string
  contents: string
}

type CreatePRRequest = {
  token: string
  path?: string
  contents?: string
  changes?: FileChange[]
  title?: string
  body?: string
}

type GitHubRef = {
  object: {
    sha: string
  }
}

type GitHubCommit = {
  tree: {
    sha: string
  }
}

type GitHubBlob = {
  sha: string
}

type GitHubSha = {
  sha: string
}

type GitHubTree = {
  sha: string
}

type GitHubPullRequest = {
  html_url: string
}

type GitHubRepo = {
  default_branch: string
}

type GitHubUser = {
  login: string
}

type TreeEntry = {
  path: string
  mode: '100644'
  type: 'blob'
  sha: string
}

function getNormalizedChanges(body: CreatePRRequest): FileChange[] {
  if (body.changes && body.changes.length > 0) {
    return body.changes
  }

  if (body.path && body.contents) {
    return [{ path: body.path, contents: body.contents }]
  }

  return []
}

function getDefaultTitle(changes: FileChange[]): string {
  return `Update CMS metadata (${changes.length} file${changes.length === 1 ? '' : 's'})`
}

function getDefaultBody(changes: FileChange[], username: string): string {
  return `This PR updates ${changes.length} file${changes.length === 1 ? '' : 's'} in the CMS.\n\nUpdated by: ${username}`
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function fetchGitHubJson<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`GitHub request failed (${response.status}) for ${url}: ${details}`)
  }

  return (await response.json()) as T
}

async function createTreeEntries(token: string, changes: FileChange[]): Promise<TreeEntry[]> {
  return Promise.all(
    changes.map(async (change) => {
      const blob = await fetchGitHubJson<GitHubBlob>(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/blobs`,
        token,
        {
          method: 'POST',
          body: JSON.stringify({
            content: change.contents,
            encoding: 'utf-8',
          }),
        },
      )

      return {
        path: change.path,
        mode: '100644',
        type: 'blob',
        sha: blob.sha,
      }
    }),
  )
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  try {
    const body = (await req.json()) as CreatePRRequest
    const { token, title, body: pullRequestBody } = body
    const changes = getNormalizedChanges(body)

    if (!token || changes.length === 0 || changes.some((change) => !change.path || !change.contents)) {
      return jsonResponse(
        {
          error: 'Missing required parameters: token and either changes[] or path + contents',
        },
        400,
      )
    }

    const user = await fetchGitHubJson<GitHubUser>('https://api.github.com/user', token)
    const username = user.login

    const repo = await fetchGitHubJson<GitHubRepo>(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`, token)
    const defaultBranch = repo.default_branch

    const refData = await fetchGitHubJson<GitHubRef>(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/ref/heads/${defaultBranch}`,
      token,
    )
    const baseCommitSha = refData.object.sha

    const commitData = await fetchGitHubJson<GitHubCommit>(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/commits/${baseCommitSha}`,
      token,
    )
    const baseTreeSha = commitData.tree.sha

    const branchName = `${username}-${Date.now()}`
    const defaultTitle = title || getDefaultTitle(changes)

    await fetchGitHubJson(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs`, token, {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: baseCommitSha,
      }),
    })

    const treeEntries = await createTreeEntries(token, changes)

    const tree = await fetchGitHubJson<GitHubTree>(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/trees`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: treeEntries,
        }),
      },
    )

    const createdCommit = await fetchGitHubJson<GitHubSha>(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/commits`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          message: defaultTitle,
          tree: tree.sha,
          parents: [baseCommitSha],
        }),
      },
    )

    await fetchGitHubJson(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/${branchName}`,
      token,
      {
        method: 'PATCH',
        body: JSON.stringify({
          sha: createdCommit.sha,
        }),
      },
    )

    const pullRequest = await fetchGitHubJson<GitHubPullRequest>(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          title: defaultTitle,
          body: pullRequestBody || getDefaultBody(changes, username),
          head: branchName,
          base: defaultBranch,
        }),
      },
    )

    return jsonResponse(
      {
        pullRequestUrl: pullRequest.html_url,
        success: true,
      },
      200,
    )
  } catch (error) {
    console.error('PR creation error:', error)
    return jsonResponse(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    )
  }
}
