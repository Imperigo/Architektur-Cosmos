import { RadialAtlasClient } from '@/components/atlas/RadialAtlasClient';
import entries from '@/data/mock-entries.json';
import relations from '@/data/relations.json';
import type { Entry, EntryRelation } from '@/lib/types';

export default function Home() {
  return <RadialAtlasClient entries={entries as Entry[]} relations={relations as EntryRelation[]} />;
}
