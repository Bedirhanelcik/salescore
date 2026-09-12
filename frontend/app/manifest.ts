import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SalesCore | Sales & CRM Platform",
    short_name: "SalesCore",
    description: "Business Sales & Customer Relationship Management Platform - CRM, YBS and BI in one system.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#4338ca",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
