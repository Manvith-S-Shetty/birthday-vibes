/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Supabase Storage — private media served via signed URLs
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/**',
      },
      // Supabase alternate CDN domain
      {
        protocol: 'https',
        hostname: '*.supabase.in',
        pathname: '/storage/v1/**',
      },
      // Demo seed content (SeedExperienceRepository demo photos)
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      // Demo seed content (SeedExperienceRepository demo audio thumbnails)
      {
        protocol: 'https',
        hostname: 'cdn.pixabay.com',
      },
    ],
  },
  /**
   * Expose VERCEL_ENV to client-side bundles (inlined at build time by Next.js).
   * Required so "use client" components (useBlowDetector, CakeCandlesScene) can
   * distinguish preview deployments from production without a NEXT_PUBLIC_ prefix
   * manually configured in the Vercel dashboard.
   *
   * Values set by Vercel automatically:
   *   "production"  → Vercel Production deployment  → diagnostics HIDDEN
   *   "preview"     → Vercel Preview deployment     → diagnostics SHOWN
   *   undefined     → local dev (NODE_ENV=development) → diagnostics SHOWN
   */
  env: {
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV,
  },
};

export default nextConfig;
