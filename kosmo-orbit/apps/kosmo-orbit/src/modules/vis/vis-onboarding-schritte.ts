/**
 * vis-onboarding-schritte (v0.8.1 / P8, 0.7.5-Welle-2 «Vis-Onboarding-
 * Stepper», Spec §6.2/§9.17, B-102) — reine, unit-testbare Schritt-Daten für
 * `VisOnboarding.tsx`. Eigenständig für KosmoVis (NICHT `shell/
 * OnboardingWizard.tsx`/`onboarding-schritte.ts` — jene sind der app-weite
 * Erststart-Assistent aus einem anderen Paket, dieser Stepper erklärt NUR
 * die vier echten KosmoVis-Bausteine, die es bereits gibt: Node-Tree,
 * Rendern, Kuratieren, gespeicherte Ansichten/Review). Ehrlich: jeder Schritt
 * beschreibt ein Feature, das im Modul TATSÄCHLICH existiert (Node-Tree =
 * `NodeCanvas.tsx`, Rendern = `vis-jobs.ts`, Kuratieren = `KuratierFlaeche.tsx`,
 * Ansichten = `GespeicherteAnsichten.tsx`) — kein Soll-Bild-Text ohne Deckung.
 */
export interface VisOnboardingSchritt {
  id: string;
  titel: string;
  text: string;
}

export const VIS_ONBOARDING_SCHRITTE: readonly VisOnboardingSchritt[] = [
  {
    id: 'graph',
    titel: 'Node-Tree bauen',
    text: 'Modell, Material und Stimmung verbindest du zu einem Render-Graphen — «+ Graph» beginnt leer, «+ Drei Stimmungen» setzt eine fertige Kette aus drei Beleuchtungen.',
  },
  {
    id: 'rendern',
    titel: 'Rendern auf Abruf',
    text: 'Jeder Render-Node rechnet nur auf «Ausführen» — der Graph selbst ist Teil des Projekts (Undo, Sync), das eigentliche Bild kommt von der HomeStation-Bridge im GPU-Leerlauf-Fenster.',
  },
  {
    id: 'kuratieren',
    titel: 'Kuratieren statt löschen',
    text: 'Fertige Bilder markierst du (Favorit) oder verwirfst sie in die Ablage — nichts geht verloren, der A/B-Vergleich erscheint automatisch bei zwei markierten Bildern.',
  },
  {
    id: 'ansichten',
    titel: 'Ansichten speichern, Review markieren',
    text: 'Im Tab «Ansichten» hältst du bis zu drei Standpunkte (ISO/NORD/DETAIL) fest und lässt Kommentar-Pins direkt auf dem Snapshot zurück.',
  },
];
