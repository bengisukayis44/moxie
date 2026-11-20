import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MOXIE",
    short_name: "MOXIE",
    description: "Got your MOXIE? Real people. Real sizes. Real fits.",
    start_url: "/",
    display: "standalone",
    background_color: "#4A1622",
    theme_color: "#F9F4F2",
    lang: "tr",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
