/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  allowedDevOrigins: [""], // poné TU IP
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactCompiler: true,
};

export default nextConfig;
