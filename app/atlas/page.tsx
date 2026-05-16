import { RadialAtlas } from '@/components/atlas/RadialAtlas';
import entries from '@/data/mock-entries.json';
import relations from '@/data/relations.json';
import type { Entry, EntryRelation } from '@/lib/types';

export default function AtlasPage() {
  return <RadialAtlas entries={entries as Entry[]} relations={relations as EntryRelation[]} />;
}
