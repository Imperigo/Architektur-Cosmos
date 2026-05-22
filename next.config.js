/** @type {import('next').NextConfig} */
const isGithubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig = {
  // Static HTML Export - keeps the MVP deployable without SSR/API runtime.
  output: 'export',

  // Codex and some local browsers open the dev site via 127.0.0.1. Allow that
  // origin so the dev client can hydrate instead of leaving the atlas inert.
  allowedDevOrigins: ['127.0.0.1'],

  // Optional GitHub Pages compatibility for imperigo.github.io/Architektur-Cosmos/.
  basePath: isGithubPages ? '/Architektur-Cosmos' : '',
  assetPrefix: isGithubPages ? '/Architektur-Cosmos/' : '',

  trailingSlash: true,
  images: {
    unoptimized: true
  },

  // TypeScript and linting are run as explicit quality gates in package.json.
  // Next's bundled validation worker can stall on local macOS/Node builds after
  // the atlas compiles, so keep the static export focused on emitting assets.
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },

  // Local macOS/Node builds can stall inside the separate webpack build worker
  // while compiling the atlas bundle. Keep the production output identical but
  // run webpack in-process so `npm run build` finishes reliably.
  experimental: {
    webpackBuildWorker: false,
    disablePostcssPresetEnv: true
  }
};

module.exports = nextConfig;
