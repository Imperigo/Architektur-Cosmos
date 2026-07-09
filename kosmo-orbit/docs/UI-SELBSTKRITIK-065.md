# UI-Selbstkritik v0.6.5 — Kritik-Schleife des Fable-Intelligenz-Tags

**Verfahren:** Nach der Integration der sechs UI-Streams (W0–W6, ROADMAP 270/271)
lief ein Panel aus 5 parallelen Kritiker-Agenten über 20 frische Screenshots
(alle Kernstationen, beide Themes), Massstab = `UI-KONZEPT-065.md`.
Befund-Schwere: **A** blockiert Release · **B** sichtbar störend · **C** Notiz.

## Runde 1 — Bilanz: 11 A · 12 B · 9 C

### Wurzelfix (sofort, vor der Fix-Runde)
Drei A-Befunde (EBENEN-Trigger ~2:1, Data-Metazeilen ~3:1, Vis-Portlabels
unlesbar) hatten EINE Wurzel: `--k-ink-faint` war im ink-Theme zu dunkel und
fiel mit der k-selten-Dimmung unter 2:1. **Token-Fix** `#6e6a5f → #918c80`
(~5:1 nackt, >3:1 gedimmt).

### A-Befunde → Fix-Runde 1 (drei Besitzer-Agenten)
| # | Station | Befund | Besitzer |
|---|---|---|---|
| A1 | Vis | V-H4-Zweitfelder (Fassade/Jahreszeit) vom Kartenrand abgeschnitten | F-vis |
| A2 | Vis | Portlabels unverbundener Eingänge im ink-Theme (Token-Fix + Nachprüfung) | F-vis |
| A3 | Design | Tote unbeschriftete Beige-Fläche neben dem Grundriss (seit 0.6.4, Ursache klären!) | F-design |
| A4 | Design | EBENEN-Kontrast ink (Token-Fix + Nachprüfung) | F-design |
| A5 | Design | Export-Aufklapp verdrängt Rückgängig/Wiederholen; Kette wirkt wie lose Links | F-design |
| A6 | Zentrale | Orbit-Labels schneiden den Kreisrand | F-shell |
| A7 | Zentrale | Unbeschrifteter Orbit-Knoten mit dupliziertem Icon | F-shell |
| A8 | Data | Leerbild-Signet fehlt auf ~108/112 Karten | F-shell |
| A9 | Data/ink | Karten-Metazeilen-Kontrast (Token-Fix + Nachprüfung) | F-shell |
| A10 | Publish | Set-Name-Placeholder hart abgeschnitten | F-shell |
| A11 | (Verfahren) | Einstellungen-Screenshot war Data-Duplikat — Skriptfehler, kein App-Befund; Öffner gefixt, Runde 2 prüft die Einstellungen wirklich | erledigt |

### B-Befunde → Fix-Runde 1
Vis: Tab-Füllfläche statt Unterstrich · fehlende Gruppen-Hairlines. Design:
Aktiv-Zustände als Vollfüllung (EG/Grundriss/Textur) · zweite Zeile ohne
Gruppierung · abgeschnittenes Eck-Label. Zentrale: Katalog ↓/↑-Verwirrung ·
tote Fläche der 440px-Fächer-Reserve. Data: Fünf-Paradigmen-Zeile. Publish:
Füllflächen-Inkonsistenz (Baugesuch/Plansatz PDF/Blatt füllen) · nackte
Export-Textlinks. Doc: Leerfläche unter der Diagnosekarte.

### C-Befunde (kuratiert — bewusst NICHT diese Runde)
1. Vis: Bildvergleich-Leerzustand ohne Signet (F-vis nimmt es mit, falls billig).
2. Vis: Wandler-Kategorieton zu nah an Zahl-Portfarbe (F-vis nimmt es mit).
3. Design: Icon-Knöpfe neben reinen Text-Knöpfen in Gruppe 1 — Icons für
   Dach/Treppe/Stütze/Schnitt/Mesh fehlen in der Registry; additive Icons = 0.6.6.
4. Design: Grundriss-Ansicht passt nicht automatisch ein (nur wenn ohne
   E2E-Koordinatenrisiko machbar; sonst 0.6.6 zusammen mit SK-D4-Rest).
5. Zentrale: Fächer ohne sichtbaren Bezug zum auslösenden Planeten
   (Verbindungslinie/Aktiv-Rahmen) — 0.6.6.
6. Zentrale: Status-Punkte vor ?-/Zahnrad-Icons ohne Statuswert — 0.6.6.
7. Data: doppeltes Zahnrad, Klickbarkeit «Sync»/«Oberfläche zurücksetzen»
   (F-shell prüft, sonst 0.6.6).
8. Publish/Doc: Hairline-Gruppen, Leersatz-Stimme (F-shell nimmt Billiges mit).
9. Nebenstationen: 45°-Akzent-Eckpunkt-Geometrie aus §2 flächig nachziehen — 0.6.6.

### Aus der Stream-Phase bereits ehrlich vertagt (0.6.6-Kandidaten)
Mehrfachauswahl/Snapping/Ausrichten im Node-Editor · orthogonales
Kanten-Routing · Node-Kollaps · Custom-Dropdown-Popups (native Selects bleiben
E2E-Vertrag) · Orbit-Icon-Neuzeichnung · Minimap · KTooltip-Rollout auf alle
Icon-Knöpfe · V-M1 Render-Knopf im 3D-Viewport (fiel der dichten Kritik-Runde
zum Opfer — Priorität 1 für 0.6.6) · V-H5 Kuratier-Fläche · Node-Palette mit
Kategorien · KMenu/KDialog-Fokus-Trap · KSelect-Chevron folgt keinem
Akzentwechsel.

## Runde 2 — Bilanz: 10 von 11 A-Befunden bestätigt behoben, 3 Nachzügler sofort gefixt

Drei strenge Nachprüfer (frische Screenshots beider Themes, diesmal mit ECHTEM
Einstellungen-Bild) bestätigten pixelgenau: V-H4-Felder im Kartenmass, Tabs
mit Unterstrich, Gruppen-Hairlines, gerahmte+beschriftete Zone statt toter
Fläche («⚠ Foyer / Ausleihe»), Export verdrängt Undo/Redo nicht mehr,
Aktiv-Zustände als Rahmen, Orbit-Labels frei, Duplikat-Knoten still,
Leerbilder auf allen bildlosen Karten, Metazeilen lesbar, Set-Name voll,
Doc-Signet da.

**Nachzügler (sofort behoben, Fable selbst):**
1. Vis-Portlabels blieben durch Canvas-Zoom-Antialiasing zu blass →
   Portlabels tragen jetzt volle Tusche (`--k-ink`); Hierarchie kommt aus
   Grösse/Gewicht, nicht aus Blässe.
2. NEU: Einstellungen-Körper scrollte funktional, aber der Scroll-Daumen
   (`--k-line-strong` auf `--k-raised`) war unsichtbar — Inhalt wirkte hart
   abgeschnitten → Dialog-Scrollbalken auf `--k-ink-faint` (beide Themes
   deutlich).
3. NEU: Baugesuch-Akzent-Eckpunkt schwebte losgelöst (Grid streckte den
   Wrapper auf Spaltenbreite) → `justifySelf:'start'`.

**Zusätzlich in der Schleife gefunden und behoben:** die bedingte
Fächer-Reserve der Zentrale liess beim Hover das Layout um 408px springen
(Oszillation unter dem Zeiger) → Reserve wieder statisch; der tote
Ruhezustands-Raum bleibt als 0.6.6-Befund (richtige Lösung:
Öffnungsrichtung des oben-Fächers).

**Verdikt:** keine offenen A-Befunde. Die B/C-Restliste oben ist die
kuratierte 0.6.6-Arbeitsliste.
