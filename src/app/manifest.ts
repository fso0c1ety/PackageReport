import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Smart Manage", short_name: "Smart Manage",
    description: "One flexible workspace for your entire business.",
    start_url: "/home/", display: "standalone", background_color: "#f8fafc", theme_color: "#5b4df5",
    icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" }],
  };
}
