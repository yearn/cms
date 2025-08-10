export const config = {
  runtime: 'edge'
}

const REPO_OWNER = 'yearn'
const REPO_NAME = 'webops-sdk'

interface CreatePRRequest {
  token: string
  path: string
  contents: string
}

export default async function (req: Request): Promise<Response> {
  if (req.method !== 'POST')
    return new Response('Method Not Allowed', { status: 405 })

  try {
    const body: CreatePRRequest = await req.json() as CreatePRRequest
    const { token, path, contents } = body

    if (!token || !path || !contents) {
      return new Response(JSON.stringify({ 
        error: 'Missing required parameters: token, path, contents' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get current user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })

    if (!userResponse.ok) {
      return new Response(JSON.stringify({ error: 'Invalid GitHub token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const user = await userResponse.json() as { login: string }
    const username = user.login

    // Get repository info (assuming this is the current repo)
    const repoResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })

    if (!repoResponse.ok) {
      return new Response(JSON.stringify({ error: 'Failed to access repository' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const repo = await repoResponse.json() as { default_branch: string }
    const defaultBranch = repo.default_branch

    // Get the latest commit SHA from default branch
    const refResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/ref/heads/${defaultBranch}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })

    if (!refResponse.ok) {
      return new Response(JSON.stringify({ error: 'Failed to get default branch' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const refData = await refResponse.json() as { object: { sha: string } }
    const baseSha = refData.object.sha

    const branchName = `${username}-${Date.now()}`
    console.log('branchName', branchName)

    // Create new branch
    const createBranchResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: baseSha
      })
    })

    if (!createBranchResponse.ok) {
      const errorText = await createBranchResponse.text()
      console.error('Failed to create branch', createBranchResponse.status, createBranchResponse.statusText, errorText)
      return new Response(JSON.stringify({ 
        error: 'Failed to create branch',
        status: createBranchResponse.status,
        details: errorText
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Create blob with new content
    const blobResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/blobs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: contents,
        encoding: 'utf-8'
      })
    })

    if (!blobResponse.ok) {
      return new Response(JSON.stringify({ error: 'Failed to create blob' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const blobData = await blobResponse.json() as { sha: string }

    // Create tree with the new file
    const treeResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/trees`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        base_tree: baseSha,
        tree: [{
          path: path,
          mode: '100644',
          type: 'blob',
          sha: blobData.sha
        }]
      })
    })

    if (!treeResponse.ok) {
      return new Response(JSON.stringify({ error: 'Failed to create tree' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const treeData = await treeResponse.json() as { sha: string }

    // Create commit
    const commitResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/commits`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Update vault data in ${path}`,
        tree: treeData.sha,
        parents: [baseSha]
      })
    })

    if (!commitResponse.ok) {
      return new Response(JSON.stringify({ error: 'Failed to create commit' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const commitData = await commitResponse.json() as { sha: string }

    // Update branch to point to new commit
    const updateBranchResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/${branchName}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sha: commitData.sha
      })
    })

    if (!updateBranchResponse.ok) {
      return new Response(JSON.stringify({ error: 'Failed to update branch' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Create pull request
    const prResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: `Update vault data in ${path}`,
        body: `This PR updates vault data in ${path}.\n\nUpdated by: ${username}`,
        head: branchName,
        base: defaultBranch
      })
    })

    if (!prResponse.ok) {
      return new Response(JSON.stringify({ error: 'Failed to create pull request' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const prData = await prResponse.json() as { html_url: string }

    return new Response(JSON.stringify({ 
      pullRequestUrl: prData.html_url,
      success: true
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('PR creation error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
