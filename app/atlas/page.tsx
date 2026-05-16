import { RadialAtlas } from '@/components/atlas/RadialAtlas';
import entries from '@/data/mock-entries.json';
import type { Entry } from '@/lib/types';

export default function AtlasPage() {
  return <RadialAtlas entries={entries as Entry[]} />;
}
