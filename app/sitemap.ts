import type { MetadataRoute } from "next";

const siteUrl = "https://scaffold.aviralagarwal.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${siteUrl}/about`,
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/support`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];
}
