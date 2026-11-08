/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  allowedDevOrigins: [" 192.168.0.151"], // poné TU IP
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactCompiler: true,
};

export default nextConfig;
