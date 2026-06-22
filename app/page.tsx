import { HomeCosmos } from '@/components/entry/HomeCosmos';
import relations from '@/data/relations.json';
import {
  ingenbohlEntry,
  publicAssets,
  publicAtlasEntries,
  publicReferences,
  villaSavoyeEntry
} from '@/lib/public-kosmo';
import type { EntryRelation } from '@/lib/types';

export default function Home() {
  const references = publicReferences();
  const assets = publicAssets();
  const villaSavoye = villaSavoyeEntry();
  const ingenbohl = ingenbohlEntry();

  return (
    <HomeCosmos
      entries={publicAtlasEntries()}
      relations={relations as EntryRelation[]}
      referenceCount={references.length}
      assetCount={assets.length}
      pilots={[
        {
          title: villaSavoye.title,
          href: `/atlas/${villaSavoye.slug}/`,
          detail: `${villaSavoye.year_start} / ${villaSavoye.city ?? 'Poissy'}`
        },
        {
          title: ingenbohl.title,
          href: `/atlas/${ingenbohl.slug}/`,
          detail: `${ingenbohl.year_start} / ${ingenbohl.city ?? 'Ingenbohl'}`
        }
      ]}
    />
  );
}
