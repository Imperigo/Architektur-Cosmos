import entries from '@/data/mock-entries.json';
import publicModelPreviews from '@/data/public-model-previews.json';
import kosmoDrawDigitalizationAnalysis from '@/examples/kosmo-references/kosmodraw-digitalization-analysis.review-only.fixture.json';
import kosmoDrawBundleIntakeReview from '@/examples/kosmo-references/review/kosmodraw-bundle-intake-review.generated.json';
import { primaryPublicMediaUrl, publicDisplayMediaUrl } from '@/lib/media';
import type { AssetCandidate, Entry, EntryMedia } from '@/lib/types';
import type { PublicAsset } from '@/components/public/PublicAssetExplorer';
import type { PublicReference } from '@/components/public/PublicReferenceExplorer';

const allEntries = entries as Entry[];
const publicModels = publicModelPreviews.models as Array<{ slug: string; title: string; url: string; status: string; license: string; public_display_status: string; caveat: string }>;
const bundleIntakeReview = kosmoDrawBundleIntakeReview as {
  status: string;
  summary: {
    bundle_count: number;
    project_count: number;
    room_count: number;
    wall_count: number;
    opening_count: number;
    story_count: number;
    asset_candidate_count: number;
    unsafe_public_flag_count: number;
    private_leak_count: number;
    failure_count: number;
    public_ready_after_intake: number;
    recommended_next_step: string;
  };
  bundles: Array<{
    project_slug: string;
    source_kind: string;
    gates: {
      intake_allowed: boolean;
      public_ready_after_intake: number;
      unsafe_public_flag_count: number;
      private_leak_count: number;
      ifc_path_present: boolean;
      ifc_path_copied_to_report: boolean;
    };
    geometry: {
      rooms: number;
      walls: number;
      stories: number;
      openings: {
        total: number;
        by_kind: Record<string, number>;
        at_xy_count: number;
        host_wall_position_count: number;
        windows_with_sill_count: number;
      };
    };
    assets: {
      total: number;
      by_kind: Record<string, number>;
      public_display_allowed_count: number;
    };
  }>;
  next_actions: string[];
};
const digitalizationAnalysis = kosmoDrawDigitalizationAnalysis as {
  source: string;
  totals: {
    n_rooms: number;
    n_floors: number;
    NGF_m2: number;
    GF_m2: number;
  };
  structure: {
    n_walls: number;
    n_external: number;
    n_internal: number;
  };
  quantities: {
    volumes_m3: {
      total: number;
    };
  };
};
const publicModelBySlug = new Map(publicModels.map((model) => [model.slug, model]));
const publicAssetRights = new Set(['public_domain', 'licensed', 'own_work']);

export function publicReferenceEntries() {
  return allEntries
    .filter((entry) => {
      const hasPublicMedia = entry.media.some((media) => publicProjectMediaUrl(entry, media));
      const hasPublicSurface = hasPublicMedia || publicModelBySlug.has(entry.slug);
      const status = entry.database_profile?.status;
      return hasPublicSurface && (status === 'reviewed' || status === 'published' || publicModelBySlug.has(entry.slug));
    })
    .sort((left, right) => publicReferenceWeight(right) - publicReferenceWeight(left));
}

export function publicReferences(): PublicReference[] {
  return publicReferenceEntries().map((entry) => ({
    slug: entry.slug,
    title: entry.title,
    year: entry.year_start,
    authors: entry.authors,
    location: [entry.city, entry.country].filter(Boolean).join(', '),
    style: entry.style_sector,
    type: entry.entry_type,
    summary: entry.one_sentence || entry.short_description,
    imageUrl: primaryPublicProjectMediaUrl(entry),
    imageCredit: entry.media.find((media) => publicProjectMediaUrl(entry, media))?.credit ?? null,
    tags: entry.database_tags ?? entry.themes,
    materials: materialTags(entry),
    hasModel: publicModelBySlug.has(entry.slug),
    mediaCount: entry.media.filter((media) => publicProjectMediaUrl(entry, media)).length,
    analysisCount: entry.analysis_layers?.length ?? 0,
    gateStatus: publicGateStatus(entry),
    readinessScore: publicReadinessScore(entry)
  }));
}

export function villaSavoyeEntry() {
  return publicEntryBySlug('villa-savoye') as Entry;
}

export function ingenbohlEntry() {
  return publicEntryBySlug('alterszentrum-kloster-ingenbohl') as Entry;
}

export function publicEntryBySlug(slug: string) {
  return allEntries.find((entry) => entry.slug === slug);
}

export function villaSavoyeModelUrl() {
  return publicModelUrl(villaSavoyeEntry()) ?? '/archive-models/villa-savoye/low.glb';
}

export function publicModelUrl(entryOrSlug: Entry | string | undefined) {
  const slug = typeof entryOrSlug === 'string' ? entryOrSlug : entryOrSlug?.slug;
  return slug ? publicModelBySlug.get(slug)?.url ?? null : null;
}

export function publicAssets(): PublicAsset[] {
  const assets: PublicAsset[] = [];

  for (const entry of publicReferenceEntries()) {
    for (const media of entry.media) {
      const url = publicProjectMediaUrl(entry, media);
      if (!url) continue;
      const candidate = publicAssetCandidateForMedia(entry, media);
      assets.push({
        id: `${entry.slug}-${media.type}`,
        project: entry.title,
        kind: media.type === 'plan' ? 'plan' : media.type === 'section' ? 'section' : 'image',
        label: media.label,
        url,
        previewUrl: media.type === 'plan' || media.type === 'section' ? url : url,
        rights: candidate?.rights_status ?? media.license ?? 'reviewed',
        layer: media.type,
        status: candidate ? 'public_display_allowed' : 'public_display',
        provenance: media.credit ?? candidate?.planned_r2_key ?? 'public gate'
      });
    }

    for (const layer of entry.analysis_layers ?? []) {
      assets.push({
        id: `${entry.slug}-analysis-${layer.analysis_type}`,
        project: entry.title,
        kind: 'analysis',
        label: `${entry.title}: ${layer.analysis_type.replace(/_/g, ' ')}`,
        url: `/atlas/${entry.slug}/#model-viewer`,
        rights: 'metadata_only',
        layer: layer.analysis_type,
        status: layer.review_status,
        provenance: layer.r2_key ?? 'analysis metadata'
      });
    }
  }

  for (const model of publicModels) {
    assets.push({
      id: `${model.slug}-model`,
      project: model.title,
      kind: 'model',
      label: `${model.title}: öffentliches GLB-Preview`,
      url: model.url,
      rights: model.license,
      layer: '3d_preview',
      status: model.public_display_status,
      provenance: model.caveat
    });
  }

  return assets.sort((left, right) => `${left.project}-${left.kind}`.localeCompare(`${right.project}-${right.kind}`));
}

export function publicKosmoDrawBundleIntakeStatus() {
  return {
    status: bundleIntakeReview.status,
    summary: bundleIntakeReview.summary,
    bundles: bundleIntakeReview.bundles.map((bundle) => ({
      projectSlug: bundle.project_slug,
      title: publicEntryBySlug(bundle.project_slug)?.title ?? bundle.project_slug,
      sourceKind: bundle.source_kind,
      intakeAllowed: bundle.gates.intake_allowed,
      publicReadyAfterIntake: bundle.gates.public_ready_after_intake,
      privateLeakCount: bundle.gates.private_leak_count,
      unsafePublicFlagCount: bundle.gates.unsafe_public_flag_count,
      ifcPathPresent: bundle.gates.ifc_path_present,
      ifcPathCopiedToReport: bundle.gates.ifc_path_copied_to_report,
      rooms: bundle.geometry.rooms,
      walls: bundle.geometry.walls,
      stories: bundle.geometry.stories,
      openings: bundle.geometry.openings,
      assets: bundle.assets
    })),
    nextActions: bundleIntakeReview.next_actions
  };
}

export function publicKosmoDrawDigitalizationStatus() {
  return {
    status: 'review_only_analysis_candidate',
    sourceLabel: digitalizationAnalysis.source,
    publicReadyAfterIntake: 0,
    fullBundleReady: false,
    missingBundleFields: [
      'project_slug',
      'status',
      'source_kind',
      'rooms',
      'walls',
      'openings',
      'stories',
      'analysis_layers',
      'asset_candidates'
    ],
    aggregateCounts: {
      rooms: digitalizationAnalysis.totals.n_rooms,
      floors: digitalizationAnalysis.totals.n_floors,
      walls: digitalizationAnalysis.structure.n_walls,
      externalWalls: digitalizationAnalysis.structure.n_external,
      internalWalls: digitalizationAnalysis.structure.n_internal,
      grossFloorAreaM2: digitalizationAnalysis.totals.GF_m2,
      netFloorAreaM2: digitalizationAnalysis.totals.NGF_m2,
      volumeTotalM3: digitalizationAnalysis.quantities.volumes_m3.total
    },
    nextStep: 'KosmoDraw muss elementweise rooms, walls, openings und stories liefern, bevor ArchitectureCosmos daraus ein kosmo_reference_bundle macht.'
  };
}

export function materialTags(entry: Entry) {
  const materialSet = new Set<string>();
  entry.materials?.primary?.forEach((item) => materialSet.add(item));
  entry.materials?.secondary?.forEach((item) => materialSet.add(item));
  entry.database_tags?.forEach((tag) => {
    if (tag.startsWith('material:')) materialSet.add(tag.replace('material:', ''));
    if (tag.startsWith('structure:')) materialSet.add(tag.replace('structure:', ''));
  });
  return [...materialSet].slice(0, 8);
}

function publicReferenceWeight(entry: Entry) {
  return (entry.slug === 'villa-savoye' ? 1000 : 0)
    + (entry.slug === 'alterszentrum-kloster-ingenbohl' ? 950 : 0)
    + (publicModelBySlug.has(entry.slug) ? 180 : 0)
    + (entry.database_profile?.status === 'reviewed' ? 100 : 0)
    + (entry.analysis_layers?.length ?? 0) * 8
    + entry.media.filter((media) => publicProjectMediaUrl(entry, media)).length * 12
    + (entry.database_tags?.length ?? 0);
}

export function publicProjectMediaUrl(entry: Entry, media: EntryMedia | undefined) {
  if (!media) return null;
  return publicDisplayMediaUrl(media) ?? (publicAssetCandidateForMedia(entry, media) ? media.url ?? null : null);
}

export function primaryPublicProjectMediaUrl(entry: Entry) {
  return entry.media.find((media) => media.type === 'exterior' && publicProjectMediaUrl(entry, media))?.url
    ?? entry.media.find((media) => publicProjectMediaUrl(entry, media))?.url
    ?? primaryPublicMediaUrl(entry);
}

export function publicAssetCandidateForMedia(entry: Entry, media: EntryMedia | undefined): AssetCandidate | undefined {
  if (!media?.url) return undefined;
  return entry.asset_candidates?.find((candidate) => {
    const matchesSlot = !candidate.media_slot || candidate.media_slot === media.type;
    const matchesPath = candidate.local_path === media.url;
    return matchesSlot
      && matchesPath
      && candidate.public_display_allowed
      && publicAssetRights.has(candidate.rights_status);
  });
}

export function publicGateStatus(entry: Entry) {
  const mediaReady = entry.media.filter((media) => publicProjectMediaUrl(entry, media)).length;
  const analysisReady = (entry.analysis_layers ?? []).filter((layer) => layer.review_status === 'reviewed' || layer.review_status === 'verified').length;
  const hasModel = publicModelBySlug.has(entry.slug);
  if (mediaReady >= 3 && analysisReady >= 3 && hasModel) return 'public pilot ready';
  if (mediaReady > 0 && (analysisReady > 0 || hasModel)) return 'public review demo';
  return 'source review only';
}

export function publicReadinessScore(entry: Entry) {
  const mediaReady = Math.min(4, entry.media.filter((media) => publicProjectMediaUrl(entry, media)).length) * 15;
  const analysisReady = Math.min(6, (entry.analysis_layers ?? []).filter((layer) => layer.review_status === 'reviewed' || layer.review_status === 'verified').length) * 5;
  const modelReady = publicModelBySlug.has(entry.slug) ? 18 : 0;
  return Math.min(100, mediaReady + analysisReady + modelReady);
}

export function villaSavoyeReadiness() {
  return publicEntryReadiness(villaSavoyeEntry());
}

export function villaSavoyeAssetTaxonomy() {
  return publicEntryAssetTaxonomy(villaSavoyeEntry());
}

export function publicEntryReadiness(entryOrSlug: Entry | string | undefined) {
  const entry = resolveEntry(entryOrSlug);
  if (!entry) return [];

  const reviewedLayers = (entry.analysis_layers ?? []).filter((layer) => layer.review_status === 'reviewed' || layer.review_status === 'verified').length;
  const mediaReady = entry.media.filter((media) => publicProjectMediaUrl(entry, media)).length;
  const model = publicModelBySlug.get(entry.slug);
  const hasReviewOnlyMedia = entry.media.some((media) => !publicProjectMediaUrl(entry, media));

  return [
    {
      label: 'Public media gate',
      status: mediaReady > 0 ? 'ready' : 'private blocked',
      detail: mediaReady > 0
        ? `${mediaReady} display-safe Medien sind sichtbar; private Slots bleiben blockiert.`
        : `0 display-safe Medien. ${hasReviewOnlyMedia ? 'Private/review-only Medien bleiben korrekt unsichtbar.' : 'Noch keine Medien-Slots.'}`
    },
    {
      label: 'Analyse-Layer',
      status: reviewedLayers > 0 ? 'reviewed' : 'pending',
      detail: `${reviewedLayers}/${entry.analysis_layers?.length ?? 0} Layer sind reviewed oder verified.`
    },
    {
      label: '3D Preview',
      status: model ? 'public preview' : 'missing',
      detail: model?.caveat ?? 'Noch kein oeffentliches Preview-Modell.'
    },
    {
      label: 'KosmoDraw Bundle',
      status: 'review gate',
      detail: '2D/Bild-zu-3D-Bundles werden nur als review_only aufgenommen; public_display_allowed bleibt false bis zur Freigabe.'
    }
  ];
}

export function publicEntryAssetTaxonomy(entryOrSlug: Entry | string | undefined) {
  const entry = resolveEntry(entryOrSlug);
  if (!entry) return [];

  if (entry.slug === 'villa-savoye') {
    return [
    {
      title: 'Pilotis / Tragstruktur',
      kind: 'structure',
      detail: 'Stuetzenraster, Stahlbeton-Skelett, freie Fassade und freier Grundriss als wiederverwendbare Strukturprinzipien.'
    },
    {
      title: 'Promenade / Rampe',
      kind: 'circulation',
      detail: 'Ankommen unter dem Volumen, Rampe, Wohnebene und Dachgarten als Bewegungssequenz.'
    },
    {
      title: 'Materialsystem',
      kind: 'material',
      detail: 'Reinforced concrete, weisser Putz, Glasbaender, Stahl und Dachgarten als Materialfilter.'
    },
    {
      title: 'Plan-/Schnittdiagramme',
      kind: 'drawing',
      detail: 'Eigene diagrammatische SVG-Rekonstruktionen, nicht vermessene Bauplaene.'
    }
  ];
  }

  if (entry.slug === 'alterszentrum-kloster-ingenbohl') {
    return [
      {
        title: 'Tragstruktur / Pflegecluster',
        kind: 'structure',
        detail: 'Stahlbeton-Skelett, aussteifender Kern und Pflegegeschosse als review-only Strukturprinzipien.'
      },
      {
        title: 'Materialsystem / Trasskalk',
        kind: 'material',
        detail: 'Beton, Weisstanne, Kalk-/Lehmputz, bestehendes Mauerwerk und mineralischer Putz als Materialliste.'
      },
      {
        title: 'Klosterplateau / Hangkante',
        kind: 'site',
        detail: 'Anbindung an Kloster, Terrainkante und Besucherebene als raeumliche Referenzlogik.'
      },
      {
        title: 'Kapelle / Pflegeprogramm',
        kind: 'program',
        detail: 'Pflegezimmer, Kapelle, Cafe und Rueckzugsraeume als programmatische Asset-Kandidaten.'
      }
    ];
  }

  const materials = materialTags(entry);
  const layerKinds = [...new Set((entry.analysis_layers ?? []).map((layer) => layer.analysis_type.replace(/_/g, ' ')))].slice(0, 4);

  return [
    {
      title: 'Materialprofil',
      kind: 'material',
      detail: materials.length ? materials.join(', ') : 'Noch kein public-ready Materialprofil.'
    },
    {
      title: 'Analyse-Layer',
      kind: 'analysis',
      detail: layerKinds.length ? layerKinds.join(', ') : 'Noch keine reviewed Analyse-Layer.'
    },
    {
      title: 'Modell-/Zeichnungsstatus',
      kind: 'review',
      detail: publicModelBySlug.has(entry.slug) ? 'Oeffentliches Preview-Modell vorhanden; Zeichnungen bleiben gate-geprueft.' : 'Noch kein oeffentliches Preview-Modell.'
    },
    {
      title: 'Public-Gate',
      kind: 'governance',
      detail: `${publicGateStatus(entry)} / Readiness ${publicReadinessScore(entry)}%.`
    }
  ];
}

export function isPublicPilotSlug(slug: string) {
  return slug === 'villa-savoye' || slug === 'alterszentrum-kloster-ingenbohl';
}

function resolveEntry(entryOrSlug: Entry | string | undefined) {
  return typeof entryOrSlug === 'string' ? publicEntryBySlug(entryOrSlug) : entryOrSlug;
}
