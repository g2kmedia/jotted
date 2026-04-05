// @ts-check
import { spawnSync } from "node:child_process";
import { serwist } from "@serwist/next/config";

export default serwist.withNextConfig((nextConfig) => ({
    swSrc: "app/sw.ts",
    swDest: "public/sw.js",
}));