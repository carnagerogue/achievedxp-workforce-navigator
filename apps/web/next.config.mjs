/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@dxp/shared'],
  // standalone produces a self-contained .next/standalone tree we can copy
  // into a slim runtime image — far smaller than shipping all node_modules.
  output: 'standalone',
  // Type checking + linting run locally / in CI; pnpm strict-peer mode
  // sometimes hides transitive @types in the prod image. Don't gate the
  // image build on those.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
