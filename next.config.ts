import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 本番Dockerイメージを軽量にするためstandalone出力を使う。
  output: "standalone",
};

export default nextConfig;
