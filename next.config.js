/** @type {import('next').NextConfig} */
const isGithubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig = {
  output: 'export',
  basePath: isGithubPages ? '/Architektur-Cosmos' : '',
  assetPrefix: isGithubPages ? '/Architektur-Cosmos/' : '',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
};

module.exports = nextConfig;
