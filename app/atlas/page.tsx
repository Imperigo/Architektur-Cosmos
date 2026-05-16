import { RadialAtlas } from '@/components/atlas/RadialAtlas';
import entries from '@/data/mock-entries.json';

export default function AtlasPage() {
  return <RadialAtlas entries={entries} />;
}
