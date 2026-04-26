import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactStrictMode: false,
    output: "standalone",
    allowedDevOrigins: [] // add local ip when testing outside localhost 
};

export default nextConfig;
