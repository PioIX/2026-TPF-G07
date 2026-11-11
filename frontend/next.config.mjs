/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
