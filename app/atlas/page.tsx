import { RadialAtlasClient } from '@/components/atlas/RadialAtlasClient';
import relations from '@/data/relations.json';
import { publicAtlasEntries } from '@/lib/public-kosmo';
import type { Entry, EntryRelation } from '@/lib/types';

export default function AtlasPage() {
  return <RadialAtlasClient entries={publicAtlasEntries() as Entry[]} relations={relations as EntryRelation[]} />;
}
