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

function getNormalizedChanges(body: CreatePRRequest) {
  if (body.changes && body.changes.length > 0) {
    return body.changes
  }

  if (body.path && body.contents) {
    return [{ path: body.path, contents: body.contents }]
  }

  return []
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

export default async function (req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  try {
    const body = (await req.json()) as CreatePRRequest
    const { token, title, body: pullRequestBody } = body
    const changes = getNormalizedChanges(body)

    if (!token || changes.length === 0 || changes.some((change) => !change.path || !change.contents)) {
      return new Response(
        JSON.stringify({
          error: 'Missing required parameters: token and either changes[] or path + contents',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    const user = await fetchGitHubJson<{ login: string }>('https://api.github.com/user', token)
    const username = user.login

    const repo = await fetchGitHubJson<{ default_branch: string }>(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`,
      token,
    )
    const defaultBranch = repo.default_branch

    const refData = await fetchGitHubJson<{ object: { sha: string } }>(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/ref/heads/${defaultBranch}`,
      token,
    )
    const baseCommitSha = refData.object.sha

    const commitData = await fetchGitHubJson<{ tree: { sha: string } }>(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/commits/${baseCommitSha}`,
      token,
    )
    const baseTreeSha = commitData.tree.sha

    const branchName = `${username}-${Date.now()}`

    await fetchGitHubJson(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs`, token, {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: baseCommitSha,
      }),
    })

    const treeEntries = await Promise.all(
      changes.map(async (change) => {
        const blob = await fetchGitHubJson<{ sha: string }>(
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

    const tree = await fetchGitHubJson<{ sha: string }>(
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

    const createdCommit = await fetchGitHubJson<{ sha: string }>(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/commits`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          message: title || `Update CMS metadata (${changes.length} file${changes.length === 1 ? '' : 's'})`,
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

    const pullRequest = await fetchGitHubJson<{ html_url: string }>(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          title: title || `Update CMS metadata (${changes.length} file${changes.length === 1 ? '' : 's'})`,
          body:
            pullRequestBody ||
            `This PR updates ${changes.length} file${changes.length === 1 ? '' : 's'} in the CMS.\n\nUpdated by: ${username}`,
          head: branchName,
          base: defaultBranch,
        }),
      },
    )

    return new Response(
      JSON.stringify({
        pullRequestUrl: pullRequest.html_url,
        success: true,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('PR creation error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}
