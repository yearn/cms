type RepoInfo = {
  default_branch: string
}

type Commit = {
  sha: string
  tree: { sha: string }
}

type FileChange = {
  path: string
  contentBase64: string
}

async function githubRequest<T>(token: string, method: string, url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    throw new Error(`${method} ${url} -> ${response.status}: ${await response.text()}`)
  }

  return (await response.json()) as T
}

export async function getUserLogin(token: string): Promise<string> {
  const user = await githubRequest<{ login: string }>(token, 'GET', 'https://api.github.com/user')
  return user.login
}

async function getRepoInfo(token: string, owner: string, repo: string): Promise<RepoInfo> {
  return githubRequest(token, 'GET', `https://api.github.com/repos/${owner}/${repo}`)
}

async function getHeadRef(token: string, owner: string, repo: string, branch: string) {
  return githubRequest<{ object: { sha: string } }>(
    token,
    'GET',
    `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`,
  )
}

async function getCommit(token: string, owner: string, repo: string, sha: string): Promise<Commit> {
  return githubRequest(token, 'GET', `https://api.github.com/repos/${owner}/${repo}/git/commits/${sha}`)
}

async function createBlob(token: string, owner: string, repo: string, contentBase64: string) {
  return githubRequest<{ sha: string }>(token, 'POST', `https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
    content: contentBase64,
    encoding: 'base64',
  })
}

async function createTree(
  token: string,
  owner: string,
  repo: string,
  baseTree: string,
  entries: Array<{ path: string; sha: string }>,
) {
  return githubRequest<{ sha: string }>(token, 'POST', `https://api.github.com/repos/${owner}/${repo}/git/trees`, {
    base_tree: baseTree,
    tree: entries.map((entry) => ({ ...entry, mode: '100644', type: 'blob' })),
  })
}

async function createCommit(token: string, owner: string, repo: string, message: string, tree: string, parent: string) {
  return githubRequest<{ sha: string }>(token, 'POST', `https://api.github.com/repos/${owner}/${repo}/git/commits`, {
    message,
    tree,
    parents: [parent],
  })
}

async function createRef(token: string, owner: string, repo: string, branch: string, sha: string) {
  return githubRequest(token, 'POST', `https://api.github.com/repos/${owner}/${repo}/git/refs`, {
    ref: `refs/heads/${branch}`,
    sha,
  })
}

async function createPullRequest(
  token: string,
  owner: string,
  repo: string,
  title: string,
  head: string,
  base: string,
  body: string,
) {
  return githubRequest<{ html_url: string }>(token, 'POST', `https://api.github.com/repos/${owner}/${repo}/pulls`, {
    title,
    head,
    base,
    body,
  })
}

async function commitFiles(params: {
  token: string
  owner: string
  repo: string
  branch: string
  message: string
  parent: Commit
  files: FileChange[]
}) {
  const blobs = await Promise.all(
    params.files.map(async (file) => ({
      path: file.path,
      sha: (await createBlob(params.token, params.owner, params.repo, file.contentBase64)).sha,
    })),
  )
  const tree = await createTree(params.token, params.owner, params.repo, params.parent.tree.sha, blobs)
  const commit = await createCommit(
    params.token,
    params.owner,
    params.repo,
    params.message,
    tree.sha,
    params.parent.sha,
  )
  await createRef(params.token, params.owner, params.repo, params.branch, commit.sha)
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function ensureFork(token: string, owner: string, repo: string, login: string) {
  try {
    await githubRequest(token, 'POST', `https://api.github.com/repos/${owner}/${repo}/forks`)
  } catch (error) {
    if (!String(error).includes('422')) throw error
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      await getRepoInfo(token, login, repo)
      return
    } catch {
      await sleep(800)
    }
  }

  await getRepoInfo(token, login, repo)
}

async function ensureForkContainsCommit(
  token: string,
  login: string,
  repo: string,
  defaultBranch: string,
  commitSha: string,
) {
  try {
    await getCommit(token, login, repo, commitSha)
    return
  } catch {
    await githubRequest(token, 'POST', `https://api.github.com/repos/${login}/${repo}/merge-upstream`, {
      branch: defaultBranch,
    })
  }

  await getCommit(token, login, repo, commitSha)
}

export async function openTokenAssetsPullRequest(params: {
  token: string
  owner: string
  repo: string
  branch: string
  title: string
  body: string
  files: FileChange[]
}) {
  const repoInfo = await getRepoInfo(params.token, params.owner, params.repo)
  const baseRef = await getHeadRef(params.token, params.owner, params.repo, repoInfo.default_branch)
  const baseCommit = await getCommit(params.token, params.owner, params.repo, baseRef.object.sha)

  try {
    await commitFiles({
      token: params.token,
      owner: params.owner,
      repo: params.repo,
      branch: params.branch,
      message: params.title,
      parent: baseCommit,
      files: params.files,
    })
    const pullRequest = await createPullRequest(
      params.token,
      params.owner,
      params.repo,
      params.title,
      params.branch,
      repoInfo.default_branch,
      params.body,
    )
    return pullRequest.html_url
  } catch (error) {
    if (!String(error).includes('403')) throw error
  }

  const login = await getUserLogin(params.token)
  await ensureFork(params.token, params.owner, params.repo, login)
  const forkInfo = await getRepoInfo(params.token, login, params.repo)
  await ensureForkContainsCommit(params.token, login, params.repo, forkInfo.default_branch, baseCommit.sha)
  await commitFiles({
    token: params.token,
    owner: login,
    repo: params.repo,
    branch: params.branch,
    message: params.title,
    parent: baseCommit,
    files: params.files,
  })
  const pullRequest = await createPullRequest(
    params.token,
    params.owner,
    params.repo,
    params.title,
    `${login}:${params.branch}`,
    repoInfo.default_branch,
    params.body,
  )
  return pullRequest.html_url
}
