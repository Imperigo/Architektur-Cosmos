# Oberflächen-Fokus-Systematik (T7, 06.07.2026)

Kurzes, verbindliches Prinzip: **wie wichtig/häufig ein Element ist, bestimmt
wie es gestaltet wird.** Keine grosse Engine — drei Stufen, konsistent über
die ganze Oberfläche angewendet.

## Die drei Stufen

| Stufe | Bedeutung | Gestaltung |
| --- | --- | --- |
| **Primär** | oft gebraucht, zentral fürs Tagesgeschäft | gross, prominent, **immer sichtbar** |
| **Sekundär** | regelmässig, aber nicht dauerzentral | kleiner, **gruppiert**, eine Ebene tiefer |
| **Selten** | projektspezifisch, wechselt kaum, oder noch nicht gebaut (V2) | in Overflow/Menü/dezent, **nicht dauerpräsent** |

CSS-Klassen (`packages/kosmo-ui/src/aura.css`): `.k-primaer` / `.k-sekundaer`
/ `.k-selten`. Auf Textknoten, die wir selbst ohne kollidierende Inline-Styles
schreiben (Familien-Titel in der Zentrale, Projekt-Menü-Beschriftung,
V2-Platzhalter), steuert die Klasse auch Grösse/Gewicht. Auf bestehenden
Komponenten wie `KButton`/`Badge` (die Grösse/Deckkraft schon selbst inline
setzen) wirkt die Klasse über die **Deckkraft der ganzen Gruppe** — das
überschreibt kein Inline-Attribut eines einzelnen Kindes, sondern dimmt den
gerenderten Teilbaum als Ganzes (CSS-`opacity` ist kein vererbtes Attribut,
sondern eine Compositing-Eigenschaft: Elternteil auf 0.6 dimmt sichtbar, auch
wenn das Kind selbst `opacity:1` inline setzt). `.k-selten` hellt bei
Hover/Fokus wieder auf 1 auf — Detailtiefe ist nie weg, nur zurückgenommen.

Logische Zuordnung ist unit-testbar unter `apps/kosmo-orbit/src/state/fokus.ts`
(`fokusStufe(element)`) und `apps/kosmo-orbit/src/state/stationen.ts`
(`stationFamilie(id)` für die Stations-Gruppierung).

## Wo angewandt

**Kopfleiste (`App.tsx`, `state/fokus.ts` → `KOPFLEISTE_FOKUS`):**
- **Primär:** Kosmo-Umschalter, Speichern, Öffnen — Kernaktionen, immer da.
- **Sekundär:** Sync-Status/-Umschalter — wichtig, aber nicht dauerzentral.
- **Selten:** Thema- und Akzent-Wahl — ändert sich praktisch nie, sitzt ganz
  rechts, gedimmt bis Hover/Fokus.

**Zentrale/Startseite (`App.tsx`):**
- **Primär:** Kosmo-Kachel (eigener Platz, VOR den Familien — Kosmo ist die
  übergeordnete Intelligenz, keine Familie) + die Familien-Titel selbst
  (`KosmoDesign`/`KosmoData`/`KosmoBüro`).
- **Sekundär:** die Familien-Untertitel («Entwerfen & Produzieren» etc.) und
  die einzelnen Stations-Kacheln innerhalb einer Familie.
- **Selten:** die V2-Platzhalter (KosmoLead/KosmoBüro-HR/KosmoLehre/KosmoBau)
  — dezent, ausgegraut, nicht anklickbar, ganz unten.

**KosmoDesign-Werkzeugleiste (`modules/design/DesignWorkspace.tsx`):**
- **Primär:** die Zeichen-Werkzeuge selbst (Auswahl/Wand/Volumen/…) — das
  Tagesgeschäft, immer in derselben Zeile.
- **Sekundär:** Ansicht (3D/Plan/4er), Export (PDF/SVG/IFC), Ebenen-Umschalter
  (Textur/Sonne/Varianten/Draw/Liste/Raster) — gruppiert mit kleinen,
  dezenten Sektions-Beschriftungen.
- **Selten:** Projekt-Einstellungen (SIA-Phase, Bemassungsstil) — siehe
  Abschnitt Projekt-Lebenszyklus unten: hinter einem «Projekt ▾»-Umschalter,
  nicht mehr dauerhaft in der Werkzeugzeile.

## Projekt-Lebenszyklus (Abschnitt C)

Eine Projektdatei lebt Jahre; SIA-Phase (Vorprojekt/Bauprojekt/Werkplan) und
der Bemassungsstil (u. a. «Wettbewerb») ändern sich selten und sind
projektspezifisch — sie gehören nicht dauerhaft in die oberste Werkzeugzeile.
`design.phaseSetzen`/`design.bemassungSetzen` sind unverändert (gleiche
Commands, gleiche `data-testid`s `phase-stil`/`bemassung-stil`), nur ihr Ort
hat sich geändert: ein **Projekt-Menü** (`data-testid="projekt-menu-toggle"`,
Fokus-Stufe «selten»), das sich per Klick öffnet und die beiden Auswahlfelder
in einer eigenen Zeile zeigt. Nichts wurde entfernt — nur umgehängt.

## J3: dynamische Ableitung auf der statischen Basis (Serie J, 07.07.2026)

Die Stufen oben sind die **statische T7-Basis** — sie ändert sich nie zur
Laufzeit. Serie J (`docs/SERIE-J-BUILDPLAN.md` Abschnitt 2) setzt eine
**dynamische Ableitung darüber**: `state/oberflaeche-adaption.ts` exportiert
`adaptiveFokusStufe(gruppe, basis, kontext, nutzung)` — eine reine Funktion,
die dieselbe Basis-Stufe nimmt und sie je nach aktueller Tätigkeit (Werkzeug,
SIA-Phase) und lokal gelernter Nutzung anhebt oder zurückstellt, bevor
`fokusKlasse()` (unverändert, Abschnitt oben) daraus die CSS-Klasse macht.
`fokusStufe()`/`KOPFLEISTE_FOKUS`/`fokusKlasse()` bleiben exakt wie bisher —
J3 ergänzt eine Schicht, ersetzt nichts.

Batch J3a (dieser Eintrag) liefert nur das reine Regelwerk + einen
localStorage-Store (`kosmo.adaption.v1`, Halbwertszeit-Verfall 7 Tage,
Opt-out, Reset) — **kein UI-Wiring**. Die Werkzeugleiste selbst lebt erst ab
J3b: die Sektionen bekommen ihre Klasse aus `adaptiveFokusStufe(...)` statt
direkt aus der Basis, eingefroren während einer laufenden Aktion
(`darfUmordnen`), nie mit DOM-Umordnung (feste Anker, Regel 2.3.1). J3c fügt
das sichtbare Lernen (Häufigkeit) sowie Opt-out-Schalter/Reset im
Projekt-Menü hinzu. Details, Tätigkeits-Matrix und Nerv-Faktor-Regeln stehen
in `docs/SERIE-J-BUILDPLAN.md` Abschnitt 2.

## V2-Notiz: volle Werkzeugleisten-Ausbaustufe

Dieser Batch liefert **Stufe 1**: eine saubere, konsistente Werkzeugleiste
mit klaren Sektionen nach Fokus-Systematik — kein andockbares
Multi-Panel-System. Für V2 vorgemerkt: Blender/ArchiCAD-nahe andockbare
Panels (links/rechts/unten frei platzierbar, je Nutzer gespeichert), wenn die
Werkzeugtiefe weiter wächst (siehe auch Serie F, Rollenprofile/
Erfahrungsstufen — eine «simple»-Stufe würde ohnehin weniger Werkzeuge zeigen
als «experte»).
