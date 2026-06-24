export const publicAssetKindLabels = {
  image: 'Bild',
  plan: 'Plan',
  section: 'Schnitt',
  model: '3D-Vorschau',
  analysis: 'Analyseprofil'
} as const;

export function publicAssetKindLabel(value: string) {
  return publicAssetKindLabels[value as keyof typeof publicAssetKindLabels] ?? publicTechnicalLabel(value);
}

export function publicAssetLayerLabel(value: string) {
  const labels: Record<string, string> = {
    '3d_preview': '3D-Vorschau',
    analysis: 'Analyse',
    circulation: 'Erschliessung',
    envelope: 'Fassade',
    image: 'Bild',
    material_system: 'Materialsystem',
    model: 'Modellgruppe',
    plan: 'Grundriss',
    section: 'Schnitt',
    source_reconstruction: 'Quellenrekonstruktion',
    spatial_order: 'Raumordnung',
    structure: 'Tragwerk',
    tectonics: 'Tektonik',
    typology: 'Typologie'
  };
  return labels[value] ?? readablePublicMetadataValue(value);
}

export function publicAssetRightsLabel(value: string) {
  const labels: Record<string, string> = {
    generated_diagrammatic_model: 'Eigenes Studienmodell',
    metadata_only: 'Metadaten ohne Rohdatei',
    reviewed: 'Rechte geprüft',
    verified: 'Verifiziert'
  };
  return labels[value] ?? readablePublicMetadataValue(value);
}

export function publicAssetStatusLabel(value: string) {
  const labels: Record<string, string> = {
    owner_approved_public_preview: 'Öffentlich freigegeben',
    public_display: 'Öffentlich sichtbar',
    public_display_allowed: 'Öffentlich freigegeben',
    public_preview_glb: 'Öffentliche 3D-Vorschau',
    draft: 'In Vorbereitung',
    pending: 'Ausstehend',
    reviewed: 'Geprüft',
    verified: 'Verifiziert'
  };
  return labels[value] ?? readablePublicMetadataValue(value);
}

export function publicAssetDisplayLabel(value: string) {
  const [project, ...rest] = value.split(':');
  if (!rest.length) return readablePublicMetadataValue(value);
  const subject = rest.join(':').trim();
  return `${project}: ${publicArchitectureTermLabel(subject)}`;
}

export function publicAssetProvenanceLabel(value: string) {
  const labels: Record<string, string> = {
    'analysis metadata': 'Analysemetadaten',
    'public gate': 'Öffentliche Rechteprüfung'
  };
  return labels[value.toLowerCase()] ?? readablePublicMetadataValue(value);
}

export function publicArchitectureTermLabel(value: string) {
  const labels: Record<string, string> = {
    circulation: 'Erschliessung',
    'environmental logic': 'Umweltstrategie',
    'material system': 'Materialsystem',
    'source reconstruction': 'Quellenrekonstruktion',
    'spatial order': 'Raumordnung',
    structure: 'Tragwerk',
    tectonics: 'Tektonik',
    typology: 'Typologie'
  };
  return labels[value.toLowerCase()] ?? readablePublicMetadataValue(value);
}

export function publicEntryTypeLabel(value: string) {
  const labels: Record<string, string> = {
    building: 'Gebäude',
    exhibition: 'Ausstellung',
    housing: 'Wohnbau',
    infrastructure: 'Infrastruktur',
    landscape: 'Landschaft',
    theory: 'Theorie',
    text: 'Text',
    urban_plan: 'Stadtentwurf',
    urban_space: 'Stadtraum'
  };
  return labels[value] ?? publicTechnicalLabel(value);
}

export function publicStyleSectorLabel(value: string) {
  const labels: Record<string, string> = {
    ancient: 'Antike',
    baroque: 'Barock',
    contemporary: 'Gegenwart',
    early_modern: 'Frühe Neuzeit',
    landscape_urbanism: 'Landschaft und Stadt',
    medieval: 'Mittelalter',
    modern_architecture: 'Moderne',
    postwar: 'Nachkriegsmoderne',
    postwar_modern: 'Nachkriegsmoderne',
    renaissance: 'Renaissance',
    sustainable_architecture: 'Nachhaltigkeit',
    vernacular: 'Vernakulär'
  };
  return labels[value] ?? publicTechnicalLabel(value);
}

export function publicTechnicalLabel(value: string) {
  const labels: Record<string, string> = {
    analysis: 'Analyse',
    circulation: 'Erschliessung',
    context: 'Kontext',
    dimension_chains: 'Massketten',
    envelope: 'Fassade',
    facade: 'Fassade',
    filter_classification: 'Filterordnung',
    full: 'Vollmodell',
    interior: 'Innenraum',
    low: 'reduziertes Modell',
    mass: 'Massenmodell',
    material_system: 'Materialsystem',
    material_tag: 'Materialhinweis',
    modern_architecture: 'Moderne',
    model: 'Modell',
    opening_semantics: 'Öffnungen',
    plan_geometry: 'Plangeometrie',
    public_preview: 'öffentliche Vorschau',
    public_preview_glb: 'öffentliche 3D-Vorschau',
    reviewed: 'geprüft',
    roof_form: 'Dachform',
    site: 'Terrain',
    source_reconstruction: 'Quellenrekonstruktion',
    spatial_order: 'Raumordnung',
    structure: 'Tragwerk',
    tectonic: 'Tektonik',
    tectonics: 'Tektonik',
    typology: 'Typologie'
  };
  return labels[value] ?? value.replace(/[_-]/g, ' ');
}

export function publicStatusLabel(value: string) {
  const labels: Record<string, string> = {
    draft: 'Entwurf',
    draft_review: 'Entwurf in Prüfung',
    generated_needs_review: 'generiert, Prüfung nötig',
    needs_review: 'Prüfung nötig',
    needs_source: 'Quelle nötig',
    needs_source_review: 'Quellenprüfung nötig',
    needs_sources: 'Quellen nötig',
    planned: 'geplant',
    'public pilot ready': 'Pilot öffentlich bereit',
    public_preview: 'öffentliche Vorschau',
    public_preview_glb: 'öffentliche 3D-Vorschau',
    'public review demo': 'öffentliche Demo in Prüfung',
    published: 'veröffentlicht',
    review: 'Prüfung',
    review_only: 'in Prüfung',
    reviewed: 'geprüft',
    'source review only': 'Quellenprüfung',
    source_review_only: 'Quellenprüfung intern',
    verified: 'verifiziert'
  };
  return labels[value] ?? publicTechnicalLabel(value);
}

export function publicWorkflowLabel(value: string) {
  const labels: Record<string, string> = {
    exact_projection: 'exakte Projektion',
    private_blocked: 'privat gesperrt',
    producer_live: 'Live-Erzeugung geprüft',
    public_preview_ready: 'öffentliche Vorschau bereit',
    ready: 'bereit',
    recognized: 'erkannt',
    source_review_only: 'Quellenprüfung intern',
    model_layers_planned: 'Modellgruppen geplant'
  };
  return labels[value] ?? publicStatusLabel(value);
}

export function publicSourceQualityLabel(value: string) {
  const labels: Record<string, string> = {
    captured_sources_with_diagrammatic_reconstruction: 'öffentliche Quellen mit eigener Diagrammrekonstruktion',
    needs_source_review: 'Quellenprüfung nötig',
    reviewed: 'geprüft',
    source_review_only: 'Quellenprüfung intern',
    verified: 'verifiziert',
    verified_public_sources: 'öffentlich verifizierte Quellen'
  };
  return labels[value] ?? publicWorkflowLabel(value);
}

export function readablePublicMetadataValue(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
