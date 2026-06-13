# KosmoReferences / KosmoAsset Worker Doctrine

Datum: 2026-06-13

Diese Doctrine ist eine kompakte Arbeitsanweisung fuer lokale LLMs, Kosmo,
Codex und Claude. Sie basiert auf den privaten Projektquellen, aber kopiert
keine privaten Volltexte.

## Hierarchie

1. Owner: Vision, Prioritaeten, finale Freigaben.
2. Central Codex Worker: Data-Lane-Architektur, Source-Package-Vertraege,
   Validierung, GitHub-Pushes, kritischer Review.
3. Claude Code / KosmoOverseer: KosmoOrbit-Koordination, UI-/Runtime-Integration,
   Cross-Worker-Review.
4. Kosmo / Odysseus Local LLM: private Fleissarbeit, Drafting, Extraction,
   Batch-Coding, Architektur-Spezialisierung.
5. Local Batch Workers: begrenzte repetitive Arbeitspakete mit klaren
   Input-/Output-Ordnern.

## Grundregel

Lokale LLMs duerfen viel arbeiten, aber wenig entscheiden. Sie erstellen
strukturierte Vorschlaege, Drafts, Extrakte und Code-Batches. Codex/Claude
ueberpruefen, verbessern, entscheiden ueber Promotion und halten die
Public-/Private-Grenze geschlossen.

## KosmoReferences

KosmoReferences ist die Referenzprojekt- und Wissensdatenbank:

- Quellen, Metadaten, Links, Literatur und Vorlesungen;
- Projekt-Eintraege mit Text, Plaenen, Bildern, Materialisierung, Struktur und
  3D-/Modellabsichten;
- Review-only Drafts, bis Quellen und Rechte sauber sind.

Aktuelle Piloten:

- Villa Savoye;
- Kapelle Sogn Benedetg;
- Alterszentrum Kloster Ingenbohl.

## KosmoAsset

KosmoAsset ist die 2D-/3D-/Material-/Textur-/Bauteilbibliothek:

- wiederverwendbare Assets fuer Blender, ArchiCAD, Web und Entwurfsworkflows;
- getrennt von KosmoReferences, aber ueber Quellen- und Kontext-Referenzen
  verbunden;
- V1 bleibt local-review-only: keine automatischen Public-Assets, keine R2- oder
  D1-Promotion.

## Rechte- und Provenance-Grenze

Standard fuer neue Quellen:

- `private_research` fuer lokale/private Quellen;
- `link_only` fuer oeffentliche Quellen ohne klare Wiederverwendungsrechte;
- public-ready nur bei file-level Provenance, public-safe Rights und expliziter
  Freigabe.

Private PDFs, Buchscans, Plaene, Screenshots und extrahierte Volltexte duerfen
nicht als Public Content oder UI-Material erscheinen.

## Task-Routing

- Vision Prompt: Codex/Claude zerlegen in gates und Worker-Pakete.
- Bulk Inventory: Kosmo/local LLM erzeugt Kandidatenlisten und Unsicherheiten.
- Source Package: Codex baut/validiert den Vertrag.
- Entry Draft: Kosmo/local LLM darf draften, Codex reviewed.
- Asset Draft: Kosmo/local LLM darf Material-/Geometrie-Kandidaten sammeln,
  Public-Gate bleibt geschlossen.
- UI Status: Claude/KosmoOrbit darf Status zeigen, aber keine privaten Inhalte
  leaken.

## Tagesloop

1. Neuste Handoffs und Memory lesen.
2. Registry, Provenance und Statuskarte pruefen.
3. Einen begrenzten Batch waehlen.
4. Relevante Checks laufen lassen.
5. Explizite Dateien committen und pushen.
6. Memory und KosmoOrbit-Handoff schreiben.
7. Weiter mit dem naechsten hoechstwertigen Batch.

## Stand

- Data-Lane Status: `passed_review_only`
- Source Packages: 5
- Entry Drafts: 3
- Asset Libraries: 1
- Public-ready Assets: 0
- Blocked Public Promotions: 26
- Grosse Buch-/ETH-/HSLU-Library: in den geprueften Pfaden noch nicht sichtbar
