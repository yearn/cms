import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  env: { GIT_COMMIT_SHA: process.env.GITHUB_SHA || '' },
  async rewrites() {
    return [
      {
        source: '/cdn/:path*',
        destination: '/api/cdn/:path*',
      },
    ]
  },
}

export default nextConfig
