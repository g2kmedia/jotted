import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
    reactStrictMode: false,
    // eslint: { ignoreDuringBuilds: true } // just for testing, delete later
};

export default withSerwist(nextConfig);
