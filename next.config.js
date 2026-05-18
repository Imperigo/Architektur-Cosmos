/** @type {import('next').NextConfig} */
const isGithubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig = {
  // Static HTML Export - keeps the MVP deployable without SSR/API runtime.
  output: 'export',

  // Optional GitHub Pages compatibility for imperigo.github.io/Architektur-Cosmos/.
  basePath: isGithubPages ? '/Architektur-Cosmos' : '',
  assetPrefix: isGithubPages ? '/Architektur-Cosmos/' : '',

  trailingSlash: true,
  images: {
    unoptimized: true
  }
};

module.exports = nextConfig;
