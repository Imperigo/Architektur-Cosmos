/**
 * Tech-Radar — kuratierte Sicht auf docs/TECH-RADAR.md fürs KosmoDoc-Modul
 * (v0.6.4, Notion-Rest F: «Tech-Radar sichtbar machen»).
 *
 * BEWUSST eine Hand-Kuration, kein Markdown-Parser: die Quelle bleibt
 * docs/TECH-RADAR.md (verifiziert 02.07.2026 + Nachträge bis 08.07.2026);
 * hier stehen die Posten, die dem Owner im Alltag etwas sagen — was die App
 * trägt (ADOPT), was Eigenbau ist und was nur beobachtet wird. Einträge aus
 * dem Notion-Scan-Nachtrag sind als «Scan-Aussage, nicht selbst verifiziert»
 * markiert (Ehrlichkeit vor Politur).
 */

export type RadarEntscheid = 'ADOPT' | 'SELBST' | 'PATTERN' | 'TEST' | 'EVALUATE' | 'WATCH' | 'REJECT';

export interface RadarPosten {
  bereich: string;
  baustein: string;
  entscheid: RadarEntscheid;
  /** Paket/Quelle — leer bei reinen Eigenbau-Entscheiden. */
  paket: string;
  lizenz: string;
  kommentar: string;
  /** Aus dem Notion-Scan übernommen, noch nicht selbst verifiziert. */
  unverifiziert?: boolean;
}

export const RADAR_STAND = 'verifiziert 02.07.2026 · Nachträge bis 08.07.2026 · Quelle docs/TECH-RADAR.md';

export const TECH_RADAR: RadarPosten[] = [
  // Geometrie & BIM-Kern
  { bereich: 'Geometrie & Kern', baustein: '3D-Boolean', entscheid: 'ADOPT', paket: 'manifold-3d', lizenz: 'Apache-2.0', kommentar: 'Garantiert-manifolde Ausgabe für Volumen-Verschneidungen.' },
  { bereich: 'Geometrie & Kern', baustein: '2D-Boolean/Offset', entscheid: 'ADOPT', paket: 'clipper2-ts', lizenz: 'BSL-1.0', kommentar: 'Nativ int64 — passt exakt zu den mm-Integer-Koordinaten des Kernels; kann Wanddicken-Offsets.' },
  { bereich: 'Geometrie & Kern', baustein: 'Straight Skeleton (Walmdach)', entscheid: 'SELBST', paket: '', lizenz: '', kommentar: 'Lizenzfalle: fertige Pakete wrappen CGAL (GPL). Eigene TS-Implementierung auf int-mm.' },
  { bereich: 'Geometrie & Kern', baustein: 'IFC lesen/schreiben', entscheid: 'ADOPT', paket: 'web-ifc', lizenz: 'MPL-2.0', kommentar: 'Einziger realer Browser-IFC4-Weg; der High-Level-Author-Layer ist Eigenbau.' },
  { bereich: 'Geometrie & Kern', baustein: 'Web-CAD-Kern als Basis', entscheid: 'REJECT', paket: 'chili3d · CADmium · opencascade.js', lizenz: 'AGPL/—/LGPL', kommentar: 'Kein adoptierbarer Kernel existiert — der KosmoOrbit-Kernel bleibt Eigenbau (Command-Pattern = Kosmos Sprache).' },
  // Viewport
  { bereich: 'Viewport & Pläne', baustein: 'Kamera', entscheid: 'ADOPT', paket: 'camera-controls', lizenz: 'MIT', kommentar: 'Maus-/Touch-Belegung läuft über das eigene Eingabemodell (Serie J).' },
  { bereich: 'Viewport & Pläne', baustein: 'Picking/Spatial', entscheid: 'ADOPT', paket: 'three-mesh-bvh', lizenz: 'MIT', kommentar: 'Schnelles Raycasting auch bei grossen Modellen.' },
  { bereich: 'Viewport & Pläne', baustein: 'Sonnenstand', entscheid: 'ADOPT', paket: 'suncalc', lizenz: 'BSD-2', kommentar: 'Echte Sonnen-Koordinaten für Schatten-/Besonnungsstudien.' },
  { bereich: 'Viewport & Pläne', baustein: 'DXF schreiben/lesen', entscheid: 'ADOPT', paket: '@tarikjabiri/dxf · dxf', lizenz: 'MIT', kommentar: 'Interop AutoCAD/Rhino/Vectorworks (Block G).' },
  { bereich: 'Viewport & Pläne', baustein: 'PDF (Vektor, A0–A4)', entscheid: 'ADOPT', paket: 'jspdf + svg2pdf.js', lizenz: 'MIT', kommentar: 'Druckfähige Plansätze direkt aus den SVG-Ableitungen.' },
  // App & UI
  { bereich: 'App & UI', baustein: 'Undo/Redo', entscheid: 'SELBST', paket: '', lizenz: '', kommentar: 'Command-Stack mit Patch-Inversen — atomare Gruppen, auch für Kosmo-Vorschläge.' },
  { bereich: 'App & UI', baustein: 'State', entscheid: 'ADOPT', paket: 'zustand', lizenz: 'MIT', kommentar: 'Entity-Store ausserhalb React, transient subscribe für three.js.' },
  { bereich: 'App & UI', baustein: 'Pencil-Strokes', entscheid: 'ADOPT', paket: 'perfect-freehand', lizenz: 'MIT', kommentar: 'Druckempfindliche Skizzenstriche (KosmoSketch).' },
  { bereich: 'App & UI', baustein: 'Zip (.kosmo-Pakete)', entscheid: 'ADOPT', paket: 'fflate', lizenz: 'MIT', kommentar: 'Projektpakete mit Assets, ohne Server.' },
  // Sync & Sicherheit
  { bereich: 'Sync', baustein: 'Live-Zusammenarbeit (CRDT)', entscheid: 'ADOPT', paket: 'yjs + y-indexeddb', lizenz: 'MIT', kommentar: 'Hinter eigenem Adapter isoliert; Sync-Server = 1 Node-Prozess + SQLite auf der HomeStation.' },
  // KI-Schicht
  { bereich: 'KI-Schicht', baustein: 'Lokale LLMs', entscheid: 'ADOPT', paket: 'ollama (qwen3-coder:30b / qwen3:32b)', lizenz: 'MIT/Apache-2.0', kommentar: 'Kosmos lokale Modelle auf der RTX-5090-HomeStation; Tool-Calls über JSON-Schema + Retry.' },
  { bereich: 'KI-Schicht', baustein: 'STT Schweizerdeutsch', entscheid: 'ADOPT', paket: 'faster-whisper (swiss-german-ct2)', lizenz: '—', kommentar: 'Ehrliche Erwartung: ~25 % Wortfehlerrate laut Paper — Fallback large-v3.' },
  { bereich: 'KI-Schicht', baustein: 'TTS (Kosmos Stimme)', entscheid: 'ADOPT', paket: 'Chatterbox Multilingual', lizenz: 'MIT', kommentar: 'Deutsch inkl. Voice-Cloning, läuft auf der HomeStation.' },
  { bereich: 'KI-Schicht', baustein: 'Embeddings (RAG)', entscheid: 'ADOPT', paket: 'bge-m3 via Ollama', lizenz: 'MIT', kommentar: 'Abruf-Index über Wissen, Journal und Dossiers ([Q]-Zitate).' },
  { bereich: 'KI-Schicht', baustein: 'Blender', entscheid: 'PATTERN', paket: 'headless-Worker an der Bridge', lizenz: 'GPL (separater Prozess)', kommentar: 'Werkbank + Render-/Physik-Worker, NIE Fork als Grundlage (GPL-Zwang, Architekturverlust).' },
  { bereich: 'KI-Schicht', baustein: 'Bestandsaufnahme → Splats', entscheid: 'ADOPT', paket: 'LingBot-Map', lizenz: 'Apache-2.0', kommentar: 'Streaming-3D-Rekonstruktion fürs Handyvideo → Splat (HomeStation-Posten).' },
  // Notion-Scan-Nachtrag 08.07. — Scan-Aussagen, nicht selbst verifiziert
  { bereich: 'Beobachtung (Scan 08.07.)', baustein: 'Gemini Omni Flash', entscheid: 'TEST', paket: 'Gemini API (Preview)', lizenz: 'proprietär', kommentar: 'Erster konkreter Cloud-Renderweg ohne HomeStation (0.10 USD/s, max 10 s). Owner-Entscheid: Schlüssel, Kosten, Datenabfluss.', unverifiziert: true },
  { bereich: 'Beobachtung (Scan 08.07.)', baustein: 'Open-Design (nexu-io)', entscheid: 'EVALUATE', paket: 'github.com/nexu-io/open-design', lizenz: 'Apache-2.0 (laut Scan)', kommentar: 'Lokal-first Design-Desktop mit Haus-Stil-Profil — direktester Andockpunkt für die Publish-Auto-Befüllung (K10).', unverifiziert: true },
  { bereich: 'Beobachtung (Scan 08.07.)', baustein: 'PosterGen', entscheid: 'WATCH', paket: 'github.com/Y-Research-SBU/PosterGen', lizenz: 'MIT (laut Scan)', kommentar: 'Mehr-Agenten-Poster-Pipeline als Architektur-Blaupause, kein Einbau.', unverifiziert: true },
  { bereich: 'Beobachtung (Scan 08.07.)', baustein: 'Arbor (RUC-NLPIR)', entscheid: 'WATCH', paket: 'github.com/RUC-NLPIR/Arbor', lizenz: 'widersprüchlich ⚠', kommentar: 'Lizenzangaben der Scans widersprechen sich — vor jedem Einsatz selbst verifizieren, nur mit Owner-Mandat.', unverifiziert: true },
];

/** Anzeige-Reihenfolge der Bereiche (stabil, testbar). */
export const RADAR_BEREICHE: string[] = [...new Set(TECH_RADAR.map((p) => p.bereich))];

/** Farbton je Entscheid — ruhige Semantik statt Ampel-Alarm. */
export function entscheidFarbe(e: RadarEntscheid): string {
  switch (e) {
    case 'ADOPT':
      return 'var(--k-success)';
    case 'SELBST':
    case 'PATTERN':
      return 'var(--k-accent)';
    case 'TEST':
    case 'EVALUATE':
      return 'var(--k-warning)';
    case 'WATCH':
      return 'var(--k-ink-soft)';
    case 'REJECT':
      return 'var(--k-danger)';
  }
}
