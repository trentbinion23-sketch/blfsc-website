import type { MetadataRoute } from "next";
import { siteAssets } from "@/lib/site-config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BLFSC",
    short_name: "BLFSC",
    description: "B.L.F. Social Club motorcycle social club site.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#040914",
    theme_color: "#040914",
    icons: [
      {
        src: siteAssets.icon192,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: siteAssets.icon512,
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: siteAssets.icon512,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
