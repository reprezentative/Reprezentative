/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure the /store route's HTML template is bundled into the serverless
  // function on Vercel (it's read at runtime via fs and isn't auto-traced).
  experimental: {
    outputFileTracingIncludes: {
      "/store": ["./lib/store-template.html"],
    },
  },
};

export default nextConfig;
