import entries from '@/data/mock-entries.json';
import publicModelPreviews from '@/data/public-model-previews.json';
import kosmoDrawDigitalizationAnalysis from '@/examples/kosmo-references/kosmodraw-digitalization-analysis.review-only.fixture.json';
import kosmoDrawBundleIntakeReview from '@/examples/kosmo-references/review/kosmodraw-bundle-intake-review.generated.json';
import kosmoPublishPlanCatalogStatus from '@/examples/kosmo-references/kosmopublish-plan-catalog-status.review-only.fixture.json';
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
const planCatalogStatus = kosmoPublishPlanCatalogStatus as {
  status: string;
  tool: {
    name: string;
    mode: string;
    registration_status: string;
    server_tool_count: number;
  };
  catalog: {
    phase_count: number;
    phase_codes: string[];
    plan_number_pattern: string;
    example_plan_numbers: string[];
    outputs: string[];
  };
  quality: {
    suite_status: string;
    reported_test_count: number;
    start_smoke_present: boolean;
    stderr_start_banner_present: boolean;
  };
  public_gate: {
    copies_private_paths: boolean;
    publishes_plan_assets_now: boolean;
    next_public_step: string;
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

export function publicAtlasEntries(): Entry[] {
  return allEntries.map((entry) => {
    const safeMedia = entry.media.map((media) => {
      const url = publicProjectMediaUrl(entry, media);
      return {
        type: media.type,
        label: media.label,
        placeholder: publicSafeText(media.placeholder),
        url: url ?? undefined,
        credit: url ? publicSafeText(media.credit) : undefined,
        license: media.license
      };
    });

    return {
      ...entry,
      full_description: publicSafeText(entry.full_description),
      short_description: publicSafeText(entry.short_description),
      one_sentence: publicSafeText(entry.one_sentence),
      media: safeMedia,
      source_quality: publicSafeText(entry.source_quality),
      source_documents: [],
      source_url: undefined,
      source_assets: undefined,
      source_candidates: entry.source_candidates?.map((candidate) => {
        const { url: _url, local_path: _localPath, ...safeCandidate } = candidate;
        return {
          ...safeCandidate,
          title: publicSafeText(safeCandidate.title),
          notes: publicSafeText(safeCandidate.notes)
        };
      }),
      asset_candidates: entry.asset_candidates?.map((candidate) => {
        const { local_path: _localPath, ...safeCandidate } = candidate;
        return {
          ...safeCandidate,
          title: publicSafeText(safeCandidate.title),
          planned_r2_key: candidate.public_display_allowed ? candidate.planned_r2_key : undefined
        };
      }),
      model_assets: entry.model_assets?.map((model) => ({
        ...model,
        source_basis: publicSafeText(model.source_basis)
      })),
      model_packages: entry.model_packages?.map((modelPackage) => ({
        ...modelPackage,
        planned_paths: [],
        notes: publicSafeText(modelPackage.notes)
      })),
      splat_assets: entry.splat_assets?.map((asset) => ({
        ...asset,
        source_basis: publicSafeText(asset.source_basis)
      })),
      analysis_layers: entry.analysis_layers?.map((layer) => ({
        analysis_type: layer.analysis_type,
        summary: publicSafeText(layer.summary),
        review_status: layer.review_status
      })),
      architecture_text: entry.architecture_text ? {
        ...entry.architecture_text,
        source_basis: undefined,
        overview: publicSafeText(entry.architecture_text.overview),
        chapters: entry.architecture_text.chapters.map((chapter) => ({
          ...chapter,
          text: publicSafeText(chapter.text),
          source_basis: undefined
        }))
      } : undefined,
      model_3d: entry.model_3d ? {
        ...entry.model_3d,
        source_basis: undefined
      } : undefined,
      ingestion_status: entry.ingestion_status ? {
        stage: entry.ingestion_status.stage,
        source_status: entry.ingestion_status.source_status,
        asset_status: entry.ingestion_status.asset_status,
        model_status: entry.ingestion_status.model_status,
        updated_at: entry.ingestion_status.updated_at
      } : undefined
    };
  });
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
      label: `${model.title}: öffentliche 3D-Vorschau`,
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

export function publicGateStatusSummary() {
  const references = publicReferences();
  const assets = publicAssets();
  const unsafeSignals = bundleIntakeReview.summary.unsafe_public_flag_count
    + bundleIntakeReview.summary.private_leak_count
    + (planCatalogStatus.public_gate.copies_private_paths ? 1 : 0);

  return [
    {
      label: 'Öffentliche Referenzen',
      value: references.length,
      detail: 'Geprüfte Referenzpakete mit geklärten Medienrechten, Analysen und Modellstatus.'
    },
    {
      label: 'Öffentliche Assets',
      value: assets.length,
      detail: 'Bilder, Diagramme, Analyseebenen und 3D-Vorschauen aus freigegebenen Quellen.'
    },
    {
      label: '3D-Vorschauen',
      value: publicModels.length,
      detail: 'Reduzierte Studienmodelle für ein skizzenhaftes BIM-Verständnis.'
    },
    {
      label: 'Unsichere Freigaben',
      value: unsafeSignals,
      detail: 'KosmoDraw und KosmoPublish liefern keine ungeprüften Freigaben an die Website.'
    }
  ];
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

export function publicKosmoPublishPlanCatalogStatus() {
  return {
    status: planCatalogStatus.status,
    toolName: planCatalogStatus.tool.name,
    mode: planCatalogStatus.tool.mode,
    registrationStatus: planCatalogStatus.tool.registration_status,
    serverToolCount: planCatalogStatus.tool.server_tool_count,
    phaseCount: planCatalogStatus.catalog.phase_count,
    phaseCodes: planCatalogStatus.catalog.phase_codes,
    planNumberPattern: planCatalogStatus.catalog.plan_number_pattern,
    examplePlanNumbers: planCatalogStatus.catalog.example_plan_numbers,
    outputFields: planCatalogStatus.catalog.outputs,
    suiteStatus: planCatalogStatus.quality.suite_status,
    reportedTestCount: planCatalogStatus.quality.reported_test_count,
    startSmokePresent: planCatalogStatus.quality.start_smoke_present,
    stderrStartBannerPresent: planCatalogStatus.quality.stderr_start_banner_present,
    copiesPrivatePaths: planCatalogStatus.public_gate.copies_private_paths,
    publishesPlanAssetsNow: planCatalogStatus.public_gate.publishes_plan_assets_now,
    nextPublicStep: planCatalogStatus.public_gate.next_public_step
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

function publicSafeText(value: string | undefined) {
  if (!value) return value;
  return value
    .replace(/archive-intake\/[^\s,;)]*/gi, 'interner Prüfpfad')
    .replace(/\/mnt\/[^\s,;)]*/gi, 'private storage path')
    .replace(/\/home\/[^\s,;)]*/gi, 'private home path')
    .replace(/source-root/gi, 'private source gate')
    .replace(/source root/gi, 'private source gate')
    .replace(/onedrive/gi, 'cloud sync')
    .replace(/private-library/gi, 'private library');
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
      label: 'Medienfreigabe',
      status: mediaReady > 0 ? 'freigegeben' : 'gesperrt',
      detail: mediaReady > 0
        ? `${mediaReady} geprüfte Medien sind sichtbar; private Plätze bleiben gesperrt.`
        : `0 freigegebene Medien. ${hasReviewOnlyMedia ? 'Private Medien und Prüfstände bleiben korrekt unsichtbar.' : 'Noch keine Medienplätze.'}`
    },
    {
      label: 'Analyseebenen',
      status: reviewedLayers > 0 ? 'geprüft' : 'ausstehend',
      detail: `${reviewedLayers}/${entry.analysis_layers?.length ?? 0} Analyseebenen sind geprüft.`
    },
    {
      label: '3D-Vorschau',
      status: model ? 'öffentlich' : 'fehlt',
      detail: model?.caveat ?? 'Noch kein öffentliches Vorschaumodell.'
    },
    {
      label: 'KosmoDraw-Übernahme',
      status: 'Prüfung erforderlich',
      detail: '2D-/Bild-zu-3D-Projektpakete bleiben intern, bis Inhalt, Rechte und öffentliche Darstellung freigegeben sind.'
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
        detail: 'Stahlbeton-Skelett, aussteifender Kern und Pflegegeschosse als Strukturprinzipien in Prüfung.'
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
      detail: materials.length ? materials.join(', ') : 'Noch kein öffentlich freigegebenes Materialprofil.'
    },
    {
      title: 'Analyseebenen',
      kind: 'analysis',
      detail: layerKinds.length ? layerKinds.join(', ') : 'Noch keine geprüften Analyseebenen.'
    },
    {
      title: 'Modell-/Zeichnungsstatus',
      kind: 'review',
      detail: publicModelBySlug.has(entry.slug) ? 'Öffentliche 3D-Vorschau vorhanden; Zeichnungen bleiben geprüft.' : 'Noch keine öffentliche 3D-Vorschau.'
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
