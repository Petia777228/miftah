import type { NextConfig } from "next";

/** На GitHub Pages сайт живёт в подпапке /miftah: workflow передаёт NEXT_PUBLIC_BASE_PATH. Локально — корень. */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
};

export default nextConfig;
