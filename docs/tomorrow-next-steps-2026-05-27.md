# Morgenplan 2026-05-27: KosmoAsset vom Gate-System zum ersten echten Arbeitsfluss

## Ausgangspunkt

Der Stand vom Abend 2026-05-26 ist lokal gespeichert. `main` ist sauber und
lokal zwei Commits vor `origin/main`:

```text
9273a5f Add KosmoAsset review certificate gate
7dbaa61 Add KosmoAsset certificate smoke guard
```

Der aktuelle KosmoAsset-Abendbatch laeuft technisch durch:

```bash
npm run kosmo:asset-full-review -- \
  --library examples/kosmo-assets/kosmo-asset-demo/library.json
```

Letzter Stand:

- Full Review: 10/10 technische Schritte passed;
- Human Review: 3 offene Asset-Entscheidungen;
- Certificate Smoke: passed;
- Promotion Guard: blocked, wie gewollt;
- Unsafe Findings: 0;
- Public Downloads, R2-Uploads und D1-Writes bleiben aus.

Das heisst: Die Pipeline ist technisch stabil genug fuer den naechsten Schritt,
aber noch nicht bereit fuer echte Promotion. Genau das ist richtig.

## Grosses Tagesziel

Morgen soll KosmoAsset nicht nur ein Set aus Gates sein, sondern der erste
verstaendliche Arbeitsfluss fuer ein kleines Architekturburo:

1. Asset kommt lokal in die Bibliothek.
2. Kosmo prueft Rechte, Quellen, Dateien, Exportwege und Review-Punkte.
3. Mensch entscheidet bewusst pro Asset und Route.
4. Lokales Architekturkosmos-Zertifikat bestaetigt Qualitaet und Herkunft.
5. Erst danach darf ein Asset fuer Sandbox, Blender/ArchiCAD-Test oder spaetere
   Public-Promotion vorgeschlagen werden.

Wichtig: Morgen geht es weiterhin um lokale Review-Sicherheit. Kein Cloud-Write,
kein R2, kein D1, keine oeffentliche Asset-Ausgabe.

## Block 0: Start-Check

Direkt beim Einstieg:

```bash
git status --short --branch --ahead-behind
git log --oneline -5
npm run kosmo:asset-full-review -- \
  --library examples/kosmo-assets/kosmo-asset-demo/library.json
```

Dann diese drei Reports lesen:

```text
examples/kosmo-assets/kosmo-asset-demo/review/asset-full-review.generated.md
examples/kosmo-assets/kosmo-asset-demo/review/asset-human-review-session.generated.md
examples/kosmo-assets/kosmo-asset-demo/review/asset-promotion-guard.generated.md
```

Done-Kriterium:

- Arbeitsbaum ist verstanden;
- Full Review reproduziert;
- keine temp Decision-, Certificate- oder Sandbox-Dateien liegen herum.

## Block 1: Human Decision Workflow scharf machen

Heute existiert das Decision-Ledger. Morgen soll die menschliche Entscheidung
als klarer V1-Prozess greifbar werden.

Aufgaben:

- pruefen, ob die Commands aus `asset-human-review-session.generated.md` fuer
  alle drei Demo-Assets eindeutig sind;
- Review-Decision-Output noch besser lesbar machen;
- Decision-Dateien klar zwischen `local_review_approved`, `blocked`,
  `rejected` und `needs_more_evidence` unterscheiden;
- verhindern, dass eine Decision ohne passende Asset-ID, Route oder Reviewer
  als gueltig zaehlt;
- kurze Doku ergaenzen: wie ein Mensch eine lokale Asset-Entscheidung
  nachvollziehbar setzt.

Moeglicher neuer Befehl:

```bash
npm run kosmo:asset-review-decision -- \
  --library examples/kosmo-assets/kosmo-asset-demo/library.json \
  --asset warm-concrete-material-001 \
  --route blender \
  --decision local_review_approved \
  --reviewer "REPLACE_WITH_REVIEWER_NAME" \
  --notes "Lokaler Test fuer Demo-Asset, keine Public-Freigabe."
```

Done-Kriterium:

- Decision-Ledger erkennt echte lokale Entscheidungen;
- Promotion Guard bleibt blockiert, solange Zertifikat oder Sandbox fehlt;
- temporaere Tests raeumen ihre Freigaben wieder weg.

## Block 2: Architekturkosmos-Zertifikat als Qualitaetsidee vorbereiten

Die Idee vom Architekturkosmos-Zertifikat soll morgen nicht als Marketing-Text,
sondern als technische Policy vorbereitet werden.

Zertifikat V1 soll bestaetigen:

- menschliche architektonische Sichtung;
- Quelle und Rechte wurden geprueft;
- Asset ist kein ungepruefter KI-Slop;
- Datei, Route und Zweck sind nachvollziehbar;
- keine automatische Public-Freigabe;
- lokale Nutzung ist vom spaeteren Publizieren getrennt.

Aufgaben:

- vorhandenes `kosmo:asset-review-certificate` pruefen und schaerfen;
- Zertifikat-Felder mit `certificate_seed` aus Human-Review-Session abgleichen;
- Markdown-Ausgabe so gestalten, dass sie als internes Qualitaetsblatt taugt;
- klaeren, welche Formulierungen rechtlich vorsichtig bleiben muessen;
- Promotion Guard so lassen, dass ein Zertifikat nur eine Voraussetzung ist,
  nicht die alleinige Freigabe.

Done-Kriterium:

- Zertifikat ist ein nachvollziehbares lokales Qualitaetsartefakt;
- keine Public-Freigabe entsteht automatisch;
- Doku erklaert klar: Zertifikat heisst "menschlich geprueft", nicht
  "rechtlich weltweit frei".

## Block 3: KosmoAsset UI im Atlas/Orbit verstaendlicher machen

Die Dev-UI zeigt bereits Review-Aktionen. Morgen soll sie fuer Menschen besser
lesbar werden.

Aufgaben:

- KosmoAsset-Statuskarten pruefen:
  - Full Review;
  - Human Review;
  - Decision Ledger;
  - Certificate Smoke;
  - Promotion Guard.
- UI-Texte auf klare Ampellogik bringen:
  - gruen: technische Gate-Checks passed;
  - gelb: menschliche Entscheidung fehlt;
  - rot: unsafe oder broken;
  - blau: lokal/review-only.
- keine sichtbare Anleitung als Erklaerwand bauen, sondern kurze Labels und
  praezise Report-Links/Commands verwenden;
- mobile Ansicht kurz pruefen.

Done-Kriterium:

- ein Nutzer versteht: "Pipeline laeuft, aber Promotion ist blockiert";
- die UI verleitet nicht dazu, Review-only mit Public-ready zu verwechseln.

## Block 4: Demo-Asset-Library realer machen

Die drei Demo-Assets sind noch bewusst einfache Skizzen. Morgen kann die Demo
mehr wie eine kleine Buero-Bibliothek wirken.

Aufgaben:

- jedes Demo-Asset auf echte lokale Evidence pruefen;
- fehlende Demo-Dateien nur dann ergaenzen, wenn Rechte und Herkunft intern
  sauber sind;
- `planned` vs. `available` klar halten;
- mindestens ein Asset als vollstaendigen lokalen Review-Pfad testen:
  - Decision;
  - Certificate;
  - Ledger;
  - Promotion Guard bleibt trotzdem public-blocked.

Kandidaten:

- Warm Concrete Study Material als Material-/Texturpfad;
- Generic Column GLB Slot als 3D-Bauteilpfad;
- Kosmo Axis Marker als 2D/SVG/Planwerkpfad.

Done-Kriterium:

- mindestens ein Demo-Asset zeigt den kompletten lokalen Review-Zyklus;
- keine echte Public-Promotion;
- keine fremden CAD-/Asset-Dateien ohne klare Rechte.

## Block 5: Blender/ArchiCAD-Handoff als trockener Arbeitsfluss

Morgen nicht versuchen, ArchiCAD oder Blender komplett zu automatisieren. Ziel
ist ein glaubwuerdiger, trockener Uebergabepfad.

Aufgaben:

- `asset-blender-handoff.generated.py` lesen und pruefen;
- falls Blender lokal erreichbar ist: nur einen nicht-mutierenden Testlauf
  planen oder separat abstimmen;
- CSV fuer ArchiCAD-Layer/Oberflaechen auf Lesbarkeit pruefen;
- klaeren, welche Informationen spaeter fuer echte Importer gebraucht werden:
  - Layer;
  - Materials;
  - Units;
  - Origin;
  - Scale;
  - Source license;
  - Review certificate.

Done-Kriterium:

- Handoff bleibt dry-run und review-only;
- spaeterer Blender/ArchiCAD-Test hat klare Inputs;
- keine externe Software wird ungefragt veraendert.

## Block 6: KosmoData und KosmoAsset sauber trennen und verbinden

KosmoData ist Wissen ueber Architekturprojekte. KosmoAsset ist verwendbares
Material fuer Entwurf und Produktion. Morgen soll diese Trennung in der
Dokumentation und im UI-Konzept klarer werden.

Aufgaben:

- pruefen, ob `docs/kosmo-asset-library.md` die Grenze gut erklaert;
- Brain-Tool-Eintraege fuer KosmoAsset einmal komplett durchsehen;
- spaeteren Link vorbereiten:
  - Projekt in KosmoData kann Assets vorschlagen;
  - Asset kann auf Projekt, Quelle oder Referenz verweisen;
  - Freigabe bleibt aber Asset-spezifisch.

Done-Kriterium:

- kein Vermischen von Projektwissen und wiederverwendbaren Assets;
- KosmoAsset wirkt wie eine eigene Orbit-Station im Netzwerk.

## Block 7: Recht und Produktlogik als Guardrail notieren

Nicht als Rechtsberatung, aber als Produktregel.

Morgen festhalten:

- keine 1:1-Nachahmung proprietaerer CAD-Funktionen;
- keine Reverse-Engineering-Ergebnisse in Repo-Dokumente schreiben;
- Blender als Open-Source-Grundlage nur mit Lizenzklarheit denken;
- ArchiCAD, Vectorworks, Rhino dienen als Inspirations- und Workflow-Vergleich,
  nicht als Kopiervorlage;
- jedes Asset braucht Herkunft, Rechte, Review und Zweck.

Done-Kriterium:

- `docs/rights-and-public-sources.md` oder `docs/kosmo-asset-library.md`
  enthaelt eine klare KosmoAsset-Rechte-Guardrail;
- Zertifikat behauptet nicht mehr, als es beweisen kann.

## Block 8: Test- und Commit-Gate

Vor Tagesabschluss morgen:

```bash
npm run kosmo:asset-full-review -- \
  --library examples/kosmo-assets/kosmo-asset-demo/library.json
npm run lint
npx tsc --noEmit
npm run brain:doctor
npm run ui:audit
npm run build:fresh
git diff --check
```

Wenn geaendert wurde:

```bash
git status --short --branch --ahead-behind
git add <gezielte dateien>
git commit -m "Advance KosmoAsset review workflow"
```

Nur wenn der Nutzer ausdruecklich "publish", "deploy", "live" oder
"veroeffentlichen" sagt:

```bash
git push origin main
```

## Morgen-Navigation

Wenn wir morgen weitermachen, mit diesem Satz starten:

> Wir fahren mit `docs/tomorrow-next-steps-2026-05-27.md` fort und bauen
> KosmoAsset vom Gate-System zum ersten echten Arbeitsfluss aus.
