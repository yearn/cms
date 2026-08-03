# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is ycms (Yearn CMS), a content management system built as a monorepo with two main packages:
- `packages/app` - Next.js application with App Router pages and API route handlers
- `packages/cdn` - Static JSON data files for vaults and strategies across multiple blockchain networks

## Development Commands

### Root Level
- `bun dev` - Start the main development server (runs app package)
- `bun clean` - Clean build artifacts and node_modules
- `bun clean --lockfiles` - Also remove bun.lock files

### App Package (`packages/app`)
- `bun dev` - Start the Next.js development server on port 3000
- `bun dev:client` - Alias for the Next.js development server
- `bun build` - Create a production Next.js build
- `bun lint` - Run Biome linter
- `bun lint:fix` - Run Biome linter with auto-fix
- `bun tslint` - Run TypeScript without emitting files
- `bun preview` - Start the production build with `next start`

## Architecture

### Frontend (Next.js App Router)
- React 19 with TypeScript
- Native App Router pages under `packages/app/app`
- State: Zustand for client state, TanStack Query for server state
- Styling: Tailwind CSS v4
- UI Components: Custom components with Radix UI primitives
- Build: Next.js with the Tailwind PostCSS adapter

### Backend (Next.js Route Handlers)
- API handlers run on the same port as the frontend under `packages/app/app/api`
- Routes: `/api/ping`, `/api/auth/github/callback`, `/api/pr`, `/api/cdn/*`
- GitHub OAuth integration for authentication
- Local development reads metadata from `packages/cdn`; production proxies commit-pinned files through jsDelivr

### Data Management
- **Schemas**: Zod schemas for VaultMetadata and StrategyMetadata validation
- **CDN Structure**: JSON files organized by chain ID (1, 10, 100, 137, 146, 250, 42161, 747474, 8453)
- **Data Sources**: ETL scripts fetch metadata from ydaemon API

### Key Components
- **Vault/Strategy Management**: CRUD operations with GitHub integration for PRs
- **Chain Support**: Multi-chain vault and strategy data across 9 networks
- **Authentication**: GitHub OAuth for write operations
- **Form Handling**: SchemaForm component with Zod validation
- **Search/Filter**: Finder component with infinite scroll

## Code Standards

### Linting and Formatting
- **Biome** is used for linting and formatting (not ESLint/Prettier)
- Single quotes, semicolons as needed, 2-space indentation, 120 char line width
- Install Biome extension in your IDE for best experience

### Development Setup
1. Copy `packages/app/.env.example` to `packages/app/.env` and configure
2. Run `bun clean`, `bun install`, `bun dev`
3. Open `http://127.0.0.1:3000` in your browser (use `127.0.0.1`, not `localhost`)

### GitHub OAuth for Local Development
GitHub OAuth is required for write operations (creating PRs, editing metadata). To set it up locally:

**Option A: Shared dev OAuth app** — ask webops for the dev OAuth app client ID and secret.

**Option B: Create your own GitHub OAuth app:**
1. Go to GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. Set the callback URL to `http://127.0.0.1/api/auth/github/callback` (no port)
3. Copy the client ID and secret into your `.env`

Then configure your `.env`:
- `NEXT_PUBLIC_CDN_URL` — optional public CMS data URL; leave empty to use the same-origin `/cdn` route
- `NEXT_PUBLIC_ASSETS_CDN_URL` — public token and chain asset CDN URL
- `NEXT_PUBLIC_GITHUB_CLIENT_ID` — your OAuth app's client ID
- `GITHUB_CLIENT_SECRET` — your OAuth app's client secret
- `NEXT_PUBLIC_GITHUB_REDIRECT_URI` — set to `http://127.0.0.1:3000/api/auth/github/callback` for local dev
- `URL` — set to `http://127.0.0.1:3000` for local dev

The public GitHub redirect setting tells GitHub to return to the callback route on the same Next.js server. GitHub
allows any port on loopback addresses (`127.0.0.1`) as long as the registered callback URL uses the same host.
Leave it unset in production to use the OAuth application's registered callback URL directly.

### CDN Access
- Public CDN: `https://cdn.jsdelivr.net/gh/yearn/cms@main/packages/cdn`
- Local development serves `packages/cdn` through `/api/cdn/*`
- Production proxies `/cdn/*` through the Node.js route handler to a commit-pinned jsDelivr URL

## Key Files
- `packages/app/app/layout.tsx` - Root layout and application providers
- `packages/app/app/[collection]/page.tsx` - Collection route entry point
- `packages/app/app/api/pr/route.ts` - Pull request API route
- `packages/app/app/api/cdn/[...path]/route.ts` - CDN proxy API route
- `packages/app/schemas/*` - Zod validation schemas
- `packages/cdn/{vaults,strategies}/*.json` - Blockchain metadata by chain ID
