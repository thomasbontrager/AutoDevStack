/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:4000',
    AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:5000',
  },
};

export default nextConfig;
