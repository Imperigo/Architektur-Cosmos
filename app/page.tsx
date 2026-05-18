import { RadialAtlas } from '@/components/atlas/RadialAtlas';
import entries from '@/data/mock-entries.json';

export default function Home() {
  return <RadialAtlas entries={entries} />;
}
