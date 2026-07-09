# UI-Selbstkritik v0.6.6 — Kritik-Schleife «Bewegung & Anpassung»

**Verfahren:** Nach der Welle-1-Integration (ROADMAP 276/277) lief die
Screenshot-Runde 1 (`e2e/tools/kritik-shots-066.mts`, 20 Bilder: Zentrale
Ruhe/Fächer, Design Voll/Modus-zeichnen/Chip-Menü/Modus-exportieren/
Mehr-im-Modus, Vis, Data, Einstellungen — beide Themes) mit Fable-Review.
Massstab: MOTION-KONZEPT-066 + BEWEGUNGSKONZEPT-066 + UI-KONZEPT-065.
Schwere: **A** blockiert Release · **B** sichtbar störend · **C** Notiz.

## Runde 1 — Bilanz: 1 A (sofort behoben) · 0 B · 3 C

### A1 (BEHOBEN, Fable direkt): Mehr-Dropdown unsichtbar geklemmt
Das «Mehr…»-Dropdown der Design-Kontextzeile war im DOM vollständig
(alle Überlauf-Einträge, opacity 1, korrekte Geometrie), aber **optisch
unsichtbar**: der Anker sass im `overflowX:auto`-Scrollbereich (0.6.5-Fix
der Export-Zeile), und sobald eine Achse scrollt, klemmt CSS auch die
andere Achse. Bestand vermutlich seit 0.6.5 unbemerkt — wurde aber
release-blockierend, weil die **Arbeitsmodi ihre Erreichbarkeits-Garantie
über genau diese Liste einlösen** (BEWEGUNGSKONZEPT-066 §4). Diagnose:
DOM-Geometrie-Probe (rect korrekt, zwei overflow-Vorfahren). Fix: Anker als
`flexShrink:0`-Geschwister AUSSERHALB der Scroll-Zone (Muster der
Verlauf-Gruppe), Dropdown rechtsbündig. Beweis: Screenshot p-07 neu, Liste
sichtbar mit allen Einträgen; oberflaeche-minimal + arbeitsmodi +
design-werkzeugleiste + oberflaeche-adaption/-hierarchie 19/19 grün.
**Lehre fürs Verfahren:** DOM-Präsenz ≠ Sichtbarkeit — Kritik-Runden
prüfen Overlays ab jetzt immer im Screenshot, nicht nur per testid.

### C-Befunde (kuratiert, nicht diese Runde)
1. **Modus-Chip-Menü ohne Begründungszeile:** Das Menü listet Modi +
   Festhalten/Automatik-aus; die «warum bin ich hier»-Erklärung lebt nur im
   Tooltip des Chips. Eine dezente Kopfzeile im Menü («erkannt: 2D + Wand»)
   wäre die vollständigere Ehrlichkeit → Stream E (Welle 3) nimmt es mit,
   falls billig; sonst 0.6.7.
2. **Modusname «Voll» im Neutral-Zustand** («Modus: Voll · automatisch»)
   ist Techniksprache; ein neutraleres Wort («Alles», «Übersicht») wäre
   menschlicher — Wortentscheid mit Bedacht, da arbeitsmodi.spec den
   Chip-Text prüft → Welle 3 / Kritik 2.
3. **Icon-only-Basiswerkzeuge** (Auswahl/Wand/Decke/Zone) sind bewusster
   0.6.5-Bestand mit title-Tooltips; im Modus-Kontext fällt der Kontrast
   zu den neuen Icon+Text-Knöpfen (Dach/Treppe/…) stärker auf. Beobachten;
   kein Handlungsbedarf diese Runde.

### Verifikationen ohne Befund
Fächer-Karteikarten mit Planet-Verbindungslinie und reduzierter
Ruhe-Reserve (beide Themes) · Status-Punkte-Bereinigung Kopfzeile ·
Modus-zeichnen blendet Export/Fähigkeiten aus, Statuszeile trägt den Chip ·
Chip-Menü öffnet mit Modusliste + Übersteuerung · ink-Theme durchgängig
(Pixelprüfung der Kopfzeilen — der erste visuelle Eindruck eines
Misch-Themes war ein Irrtum des Prüfers, dokumentiert der Ehrlichkeit
halber) · Vis/Data/Einstellungen ohne Regression.

## Runde 2 — nach Welle 3 (geplant)
Fokus: Kosmo-UI-Brücke sichtbar ehrlich, Gesten-Gefühl (Fling/Doppeltap),
Render-Knopf im Viewport, C-Befunde oben.
