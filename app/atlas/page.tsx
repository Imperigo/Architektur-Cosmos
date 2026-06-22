import { RadialAtlasClient } from '@/components/atlas/RadialAtlasClient';
import { PublicSiteHeader } from '@/components/public/PublicSiteHeader';
import relations from '@/data/relations.json';
import { publicAtlasEntries } from '@/lib/public-kosmo';
import type { Entry, EntryRelation } from '@/lib/types';

export default function AtlasPage() {
  return (
    <main className="ak-fullscreen-with-header">
      <PublicSiteHeader active="atlas" fixed context="Interaktiver Atlas" />
      <RadialAtlasClient entries={publicAtlasEntries() as Entry[]} relations={relations as EntryRelation[]} />
    </main>
  );
}
