import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactStrictMode: false,
    output: "standalone",
    allowedDevOrigins: ["192.168.169.22"] // only for testing 
};

export default nextConfig;
