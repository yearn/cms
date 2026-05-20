# ycms

[![Install biome extension in your IDE for lint support](https://img.shields.io/badge/Install-Biome%20Extension-blue?style=for-the-badge&logo=visualstudiocode)](https://marketplace.visualstudio.com/items?itemname=biomejs.biome)

## docs

- [How to manage CMS metadata schemas](docs/how-to-manage-cms-metadata-schemas.md)

## lfg

```bash
cp packages/app/.env.example packages/app/.env
# configure packages/app/.env (see GitHub OAuth Setup below)

bun clean [--lockfiles]
bun install
bun dev
```

Open `http://127.0.0.1:3000` in your browser (use `127.0.0.1`, not `localhost` — required for GitHub OAuth).

To run on a custom port: `PORT=4000 bun dev`. The API server runs on PORT+1 automatically. Update `VITE_GITHUB_REDIRECT_URI` and `URL` in your `.env` to match.

## GitHub OAuth Setup

Sign-in is required to edit metadata and create PRs. To set up OAuth for local development:

**Option A: Shared dev OAuth app** — ask webops for the dev OAuth app client ID and secret.

**Option B: Create your own GitHub OAuth app:**
1. Go to GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. Set the authorization callback URL to `http://127.0.0.1/api/auth/github/callback` (no port)
3. Copy the client ID and generated secret into your `.env`

Configure `packages/app/.env`:
```
VITE_GITHUB_CLIENT_ID = <your client id>
GITHUB_CLIENT_SECRET = <your client secret>
VITE_GITHUB_REDIRECT_URI = http://127.0.0.1:3000/api/auth/github/callback
URL = http://127.0.0.1:3000
```

`VITE_GITHUB_REDIRECT_URI` tells GitHub to redirect to your local dev server port. GitHub allows any port on `127.0.0.1` as long as the registered callback URL uses the same host. Leave it unset in production.

#### Vault, strategy, and token sync

Automatic sync runs from `.github/workflows/sync.yml` every hour and on manual dispatch.

- `packages/app/scripts/sync-vaults.ts` queries Kong GraphQL at `https://kong.yearn.fi/api/gql` using `vaults(yearn: true)`.
- New vaults are detected by lowercased address and appended to `packages/cdn/vaults/<chainId>.json`.
- `packages/app/scripts/sync-strategies.ts` and `packages/app/scripts/sync-tokens.ts` do the same for strategies and tokens.
- The workflow commits and pushes only when something under `packages/cdn/` changed.

To trigger the same workflow locally with `act`:
```bash
act -j sync-vaults-and-strategies
# see https://github.com/nektos/act
```

To run the sync scripts directly:
```bash
bun packages/app/scripts/sync-vaults.ts
bun packages/app/scripts/sync-strategies.ts
bun packages/app/scripts/sync-tokens.ts
git add packages/cdn/vaults
git add packages/cdn/strategies
git add packages/cdn/tokens
git commit -m 'Sync vaults strategies and tokens'
git push
```

### cdn url

```url

https://cdn.jsdelivr.net/gh/yearn/cms@main/packages/cdn

```
