import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: '/',
        destination: '/vaults',
        permanent: false,
      },
    ]
  },
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
