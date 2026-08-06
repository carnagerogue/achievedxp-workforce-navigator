/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@dxp/shared'],
  // standalone produces a self-contained .next/standalone tree we can copy
  // into a slim runtime image — far smaller than shipping all node_modules.
  output: 'standalone',
  // Type errors now fail the build (tsc is clean; CI also runs tsc --noEmit).
  // ESLint stays ignored during builds because the app has no ESLint config
  // yet — `next lint` prompts to create one and can't run non-interactively.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
