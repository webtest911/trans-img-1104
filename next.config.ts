import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16에서는 Turbopack이 기본이므로 webpack을 명시적으로 사용
  // 또는 Turbopack 설정을 추가
  turbopack: {
    // Turbopack 설정이 비어있으면 webpack 사용 허용
  },
  
  // jsPDF는 브라우저 전용 라이브러리이므로 서버 사이드 번들에서 제외
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // 클라이언트 사이드에서만 jsPDF를 처리
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};

export default nextConfig;
