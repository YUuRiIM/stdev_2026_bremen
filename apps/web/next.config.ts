import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Vercel build OOM 방어. TS/ESLint 체크는 CI/로컬에서 돌리고 빌드엔 스킵.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Next 15 webpack 메모리 피크 완화 실험 기능.
  experimental: {
    webpackMemoryOptimizations: true,
  },
};

export default nextConfig;
