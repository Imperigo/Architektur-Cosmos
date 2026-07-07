# Serie H — Vollständige Benutzersimulation (Owner-Auftrag, V2/Fable)

> Owner (06.07.2026): «Baue ein sauberes Testprogramm für die Software,
> vollständige Benutzersimulation … du bist der Architekt eines Projektes und
> nutzt alle möglichen Funktionen von KosmoOrbit. Du testest extrem penibel.
> Simuliere auch die lokale KI mit AI-Imaging etc. Teste wirklich jedes Tool von
> Anfang bis Ende. Mache das viele Male aus anderen Perspektiven und entwirf
> andere Häusertypen (Umbau, Stadthaus, Blockrand, EFH, MFH, Hochhaus …), nimm
> jeweils richtige Schweizer Parzellenszenarien, lade alle Infos die du brauchst,
> mach Gestaltungskonzepte, modelliere selbst mit allen Tools.»

Ziel: KosmoOrbit nicht nur mit atomaren E2E-Tests prüfen, sondern als **ganzer
Architekt-Arbeitsablauf** — pro SIA-Phase ein vollständiges Projekt, über viele
Haustypen, extrem penibel. Deckt Bedien-, Daten-, Rechen- und Regressionslücken
auf, die atomare Tests nie sehen. **Saat existiert bereits** aus den V1-Testläufen
(ROADMAP 151): `e2e/sim-umbau.spec.ts` + `e2e/sim-mfh.spec.ts` grün,
`docs/V1-TESTLAUF-BEFUNDE.md`.

## Modellgebrauch (Guideline)
Fable = Urteil/Härteste; Opus = Orchestrierung; Sonnet = Ausführung. Serie H wird
von **Opus orchestriert**, die einzelnen Journeys von **Sonnet-Agenten** gebaut,
die Befund-Triation/Schwerste-Fälle von **Fable** beurteilt.

## H1 — Simulations-Harness (Fundament)
Ein wiederverwendbares Gerüst statt Einzel-Specs:
- **Szenario-Datensatz** `e2e/sim/szenarien.ts`: je Haustyp ein Objekt (CH-Parzelle
  mit echten Rahmendaten — Zone, AZ, Grenzabstände, Fläche, Hanglage; Raumprogramm;
  Gestaltungs-Leitidee). Deterministisch, offline.
- **Journey-Bausteine** `e2e/sim/bausteine.ts`: geprüfte, wiederverwendbare
  Schritte (onboarden, Geschoss/Aufbau bootstrappen, Zone ziehen + Kennzahl prüfen,
  Wände/Dach/Treppe, Grundriss generieren, Geschosse stapeln, Schnitt/Ansicht,
  Berechnungsliste, Publish-Blatt, Kosmo-Frage). Robuste Assertions (Layer-zählende
  Fallen aus V1 vermeiden — «mindestens eine» statt fixer Pfadzahl).
- **Härte-Layer**: jeder Baustein prüft Ergebnis, nicht nur «geklickt» (sichtbare
  Kennzahl, gerendertes Bauteil, Befund-Text, exportierte Dateigrösse).

## H2 — Haustyp-Journeys (breite Abdeckung)
Je Haustyp eine vollständige `e2e/sim-<typ>.spec.ts` aus H1-Bausteinen:
Umbau ✅ · MFH ✅ · EFH · Stadthaus/Reihenhaus · Blockrand(-schliessung) ·
Hochhaus/Punkthaus · (später: Gewerbe/Hallenbau, Schulhaus, Sonderbau). Je Typ ein
**echtes CH-Parzellenszenario** (z.B. Ersatzneubau Zürich-Altstetten,
Blockrandlücke Basel, Hochhaus Zürich-West, EFH-Hanglage Emmental).
Reihenfolge nach Aufdeckungswert; EFH + Hochhaus sind schon entworfen und für die
Härtung vorgemerkt.

## H3 — Lokale-KI-/AI-Imaging-Simulation
Die HomeStation-Bridge (`tools/homestation-bridge`, `--fake`) läuft im Container
als deterministischer Fake. Serie H fährt bewusst DURCH die Bridge:
- Kosmo-Chat gegen den Mock-Provider (Diff-Karten, Quellensprung, Command-Ausführung).
- **KosmoVis-Renderkette**: Node-Tree → Render-Job an die Fake-Bridge → Bild am
  Node → «Aufs Blatt» (existiert als `visgraph.spec.ts`; in H integrieren).
- **AI-Imaging ehrlich**: die reale Bildgenerierung ist HomeStation/GPU — der
  Fake liefert Platzhalter. Serie H prüft den **Weg** (Prompt-Komposition,
  Job-Status, Blatt-Senke), nicht die Bildqualität. Kein vorgetäuschtes Ergebnis.

## H4 — «Selbst modellieren & Gestaltungskonzept»
Über blosses Tool-Klicken hinaus: je Journey ein kohärentes **Gestaltungskonzept**
(Leitidee → Volumen → Fassade/Material → Grundrissorganisation) als roter Faden,
damit die Simulation echte Entwurfsentscheide durchspielt statt zufälliger Klicks.
Modelliert wird mit allen Werkzeugen (Direktzeichnen, Generator, Module, Treppe,
Dach, Möblierung), inkl. Skizzieren (T5/A4).

## H5 — Befund-Pipeline
Jeder Lauf triagiert automatisch: echter Bug vs. Test-Artefakt; bestätigte Bugs →
`docs/V1-TESTLAUF-BEFUNDE.md`-Nachfolger `docs/SIM-BEFUNDE.md`, die klaren Fixes als
eigene verifizierte Batches (Muster ROADMAP 151), grössere/Design-Fragen an den
Owner. Fable beurteilt die härtesten/mehrdeutigen Fälle.

**Seit H5a (07.07.2026) scharf geschaltet:** `docs/SIM-BEFUNDE.md` ist ab jetzt
das lebende, append-only Befund-Journal der Serie H (Schema + Triage-Ablauf
+ Startbestand aus `docs/V1-TESTLAUF-BEFUNDE.md`) — neue Befunde aller
folgenden Batches werden dort angehängt, nie mehr in
`docs/V1-TESTLAUF-BEFUNDE.md`.

## Grenzen (ehrlich)
- Echte Bildgenerierung, Whisper/Piper scharf, LoRA — HomeStation/GPU, nicht in der
  Simulation prüfbar (nur der Weg dahin).
- Vollständige «alle Tools»-Abdeckung ist ein wachsendes Ziel; H1/H2 sind so
  gebaut, dass neue Werkzeuge als Baustein leicht andocken.

## Startpunkt für Fable/Opus
1. H1-Harness aus den zwei grünen Sim-Specs refaktorieren (Bausteine extrahieren).
2. EFH + Hochhaus härten (die entworfenen Journeys grün machen).
3. Stadthaus + Blockrand ergänzen.
4. H3 (KI/Vis) in jede Journey einweben, H5-Pipeline scharf schalten.
