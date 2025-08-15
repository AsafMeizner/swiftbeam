/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for static export
    output: "export",

  // Make asset URLs relative so they work under capacitor://
    assetPrefix: "./",

  // If you use next/image, disable optimization for static export
    images: { unoptimized: true },
};
module.exports = nextConfig;
