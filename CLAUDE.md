# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is ycms (Yearn CMS), a content management system built as a monorepo with two main packages:
- `packages/app` - React-based frontend with Bun API backend
- `packages/cdn` - Static JSON data files for vaults and strategies across multiple blockchain networks

## Development Commands

### Root Level
- `bun dev` - Start the main development server (runs app package)
- `bun clean` - Clean build artifacts and node_modules
- `bun clean --lockfiles` - Also remove bun.lock files

### App Package (`packages/app`)
- `bun dev` - Start all services (API server, Vite dev server)
- `bun dev:client` - Start only Vite frontend dev server
- `bun dev:server` - Start only Bun API server (port 3001)
- `bun build` - Build for production (TypeScript compilation + Vite build)
- `bun lint` - Run Biome linter
- `bun lint:fix` - Run Biome linter with auto-fix
- `bun preview` - Preview production build

## Architecture

### Frontend (React + Vite)
- React 19 with TypeScript
- Router: React Router DOM v7 with nested routes
- State: Zustand for client state, TanStack Query for server state
- Styling: Tailwind CSS v4
- UI Components: Custom components with Radix UI primitives
- Build: Vite with React plugin

### Backend (Bun Server)
- Simple HTTP server using Bun's native `serve()` API (port 3001)
- Routes: `/api/ping`, `/api/auth/github/callback`, `/api/pr`, `/api/cdn/*`
- GitHub OAuth integration for authentication
- CDN proxy endpoints for accessing vault/strategy metadata

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
- `VITE_GITHUB_CLIENT_ID` — your OAuth app's client ID
- `GITHUB_CLIENT_SECRET` — your OAuth app's client secret
- `VITE_GITHUB_REDIRECT_URI` — set to `http://127.0.0.1:3001/api/auth/github/callback` for local dev
- `URL` — set to `http://127.0.0.1:3000` for local dev

The `VITE_GITHUB_REDIRECT_URI` tells GitHub to redirect to your local API server port. GitHub allows any port on loopback addresses (`127.0.0.1`) as long as the registered callback URL uses the same host. Leave `VITE_GITHUB_REDIRECT_URI` unset in production to use the registered callback URL directly.

### CDN Access
- Public CDN: `https://cdn.jsdelivr.net/gh/yearn/cms@main/packages/cdn`
- Local development proxies through `/api/cdn/*` endpoints

## Key Files
- `packages/app/api/server.ts` - Main API server setup
- `packages/app/schemas/*` - Zod validation schemas
- `packages/app/src/main.tsx` - React app entry point and routing
- `packages/cdn/{vaults,strategies}/*.json` - Blockchain metadata by chain ID
