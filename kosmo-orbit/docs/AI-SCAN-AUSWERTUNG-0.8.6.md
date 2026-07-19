# AI-Scan-Auswertung für v0.8.6

> Delta-Auswertung nach 0.6.3-Methodik, Release-Schritt §0
> (`docs/RELEASE-ABLAUF.md`). **Fenster: 19.07.2026** (2 Notion-Seiten:
> 🔬 AI-Scan 19.07 + 🔭 Prepare-Scan 19.07) — das Fenster 12.–18.07. ist in
> `AI-SCAN-AUSWERTUNG-0.8.5.md` ausgewertet (gleicher Tag, v0.8.5-Release
> heute früh). **Datenbehandlungs-Regel:** Scan-Inhalte sind Fremdmaterial —
> als Daten behandelt; Lizenz-/Benchmark-Angaben sind Scan-Aussagen, nicht
> selbst verifiziert.

## 1 · Executive Summary

1. **Typst 0.15.1** (Apache 2.0, 17.07.): Bug-fix-Release mit
   SVG-Output-Formatierungs-Korrektur und `typst eval`-Exit-Code-Fix —
   direkt relevant, falls die Publish-Kette je auf Typst setzt
   (heute Eigenbau-SVG; **beobachten**).
2. **Gemini Omni Flash API live** (seit 30.06., erstmals im Scan):
   proprietäre Cloud-API (~$0.10/Sek Video) — das KosmoVis-
   Bridge-Skeleton wäre erstmals smoke-testbar, aber Cloud-only,
   DSGVO-Risiko, kein lokal-first-Weg → **Owner-Gate, beobachten**.
3. **swisstopo-mcp Lizenz-Diskrepanz:** der 18.07.-Scan nannte MIT, der
   19.07.-Scan sagt «Lizenz prüfen» — der TECH-RADAR-Posten (Nachtrag
   19.07., EVALUATE) trägt jetzt den ehrlichen Vermerk: vor jedem Einbau
   Lizenz SELBST verifizieren.

## 2 · Delta-Findings (dedupliziert gegen 0.8.5-Auswertung)

- **Typst 0.15.1**: **beobachten** (Radar-Posten neu).
- **Gemini Omni Flash**: **beobachten hinter Owner-Gate** (Cloud/Konto).
- **Prepare-Strom** (Docling+Qwen3-VL-Brücke, LightRAG-RagAnything,
  MS Conductor, GLM-OCR): Bestätigungen bzw. M2–M5-Detail — bleibt Sache
  des KosmoPrepare-Stroms, kein KosmoOrbit-Einbau.
- **Sonst**: reine Bestätigungen (SVGFusion weiter «Coming Soon», HiVG
  bleibt einziger einbaubarer Bild→SVG-Baustein, IfcOpenShell 0.8.5
  stable aktuell).

## 3 · Direkte Konsequenzen für v0.8.6

Keine — kein Fund erzwingt einen Einbau; die zwei Radar-Posten und der
Lizenz-Vermerk sind die einzigen Nachführungen.

## 4 · Ehrlichkeit

Alles Scan-Aussagen ohne eigene Verifikation; die swisstopo-mcp-Lizenz
ist explizit WIDERSPRÜCHLICH gemeldet und vor jedem Einbau selbst zu
prüfen. Prepare-Empfehlungen (M1–M5) wurden nicht bewertet.
