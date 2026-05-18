import type { MetadataRoute } from 'next';
import entries from '@/data/mock-entries.json';
import type { Entry } from '@/lib/types';

const siteUrl = 'https://architekturkosmos.ch';
const allEntries = entries as Entry[];

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date('2026-05-18');

  return [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1
    },
    {
      url: `${siteUrl}/atlas/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.95
    },
    ...allEntries.map((entry) => ({
      url: `${siteUrl}/atlas/${entry.slug}/`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: entry.database_profile ? 0.86 : 0.68
    }))
  ];
}
