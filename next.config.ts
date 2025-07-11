import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // 解决 elkjs 的 web-worker 依赖问题
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'web-worker': false,
      };
    }
    
    // 忽略 elkjs 中的 web-worker 模块
    config.externals = config.externals || [];
    config.externals.push({
      'web-worker': 'Worker'
    });
    
    return config;
  },
};

export default nextConfig;
