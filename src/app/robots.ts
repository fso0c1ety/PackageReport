import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://package-report.vercel.app";
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/settings/", "/workspace/", "/driver-trips/"] }], sitemap: `${base}/sitemap.xml` };
}
