/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: [
    "@devvmichael/paystream-client",
    "@devvmichael/paystream-core",
  ],
};

module.exports = nextConfig;
