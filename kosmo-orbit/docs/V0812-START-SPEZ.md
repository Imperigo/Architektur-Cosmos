# V0812-START-SPEZ — Vorgezogener Strang «Start & Zentrale» (Teil 1)

**Owner-Order 21.07.2026 ~12:55Z:** «doch starte, erweitere plan um 3h ab
jetzt los» — auf Basis des soeben gelieferten Owner-Packages
`docs/owner-packages/2026-07-21-startsequenz/` (ROADMAP 583). Dieses Dokument
ist die verbindliche Spez für die zwei vorgezogenen Pakete; der volle
0.8.12-Bogen (inkl. Projekt-Tableiste der Zentrale, Golden-Züge, KosmoSpez-UI)
folgt als eigene V0812-SPEZ.

## Quellen (gelesen, verbindlich)
- Package-README: ehrlicher Boot (KERN · KOSMO-LLM · PROJEKTGRAPH · BRIDGE ·
  STATIONEN), Satellit als Ladeanzeige (Punkt umkreist Ellipse 2.6s linear,
  dockt bei «Bereit» an), Leitsatz «Der Architekt bleibt Autor.» +
  SYSTEM BEREIT, Motion-Token Entrance (0.16,1,0.3,1) / Standard (0.4,0,0.2,1)
  / 0.16/0.24/0.5s / Orbit-Drift 12–24s / Glow nur als Zustand /
  prefers-reduced-motion respektiert, alles skippbar. Logo-Geometrie:
  Ellipse rotate −24°, rx 17 / ry 8.5, Teal #57B6C2; A-Spitze
  M11 25 L20 9 L29 25 in #DCE0E8; Knoten r 2.4.
- Bestand: `index.html` trägt den STATISCHEN #splash (Vor-JS-Zustand,
  Vertrag e2e/splash.spec.ts — App.tsx entfernt ihn synchron beim Mount).
  `shell/OrbitStart.tsx` trägt den Hover-Fächer mit HARTEM Klick-Vertrag
  (PA2-Kommentar: ~40 Specs klicken Hauptwerkzeuge direkt; Klick auf
  nicht-aktives Hauptwerkzeug öffnet NUR den Fächer usw.).

## E-Punkte

### E-S1 «Startsequenz/Boot» (Paket P-S1, Sonnet, Worktree start-boot :5179)
1. NEU `shell/StartSequenz.tsx` + `shell/start-sequenz.css`: Vollbild-Ebene
   nach App-Mount (der statische #splash bleibt UNVERÄNDERT davor):
   KosmoOrbit-Marke (Logo-Geometrie oben, EIN SVG), darunter die fünf
   EHRLICHEN Boot-Zeilen KERN / KOSMO-LLM / PROJEKTGRAPH / BRIDGE /
   STATIONEN in Mono-Versalien — jede Zeile bindet an ein ECHTES Signal:
   KERN = Kernel-Module geladen (synchron wahr), PROJEKTGRAPH =
   initVault()-Restore abgeschlossen, BRIDGE = Health-Ping :8600 (Timeout
   1.5s → Zeile ehrlich «BRIDGE — NICHT VERBUNDEN», Sequenz läuft weiter),
   KOSMO-LLM = Provider-Konfig gelesen (mock/ollama/… genügt; kein
   API-Call), STATIONEN = Modul-Registry vorhanden. KEINE Fake-Prozente.
2. Satellit = Ladeanzeige: ein Punkt umkreist die Ellipse (2.6s linear,
   CSS-Animation), dockt bei «Bereit» an den Knoten an; danach Leitsatz
   «Der Architekt bleibt Autor.» + «SYSTEM BEREIT» (Mono), sanfter Austritt
   (Motion-Token oben), Übergabe an die Zentrale.
3. Skippbar: Klick/Tap/Escape beendet sofort (Design «alles skippbar»);
   `prefers-reduced-motion` → keine Orbit-Animation, Zeilen erscheinen
   sofort, Auto-Ende nach Signal-Abschluss.
4. E2E-Bestandsschutz (HART): bei `navigator.webdriver` rendert die Sequenz
   NUR, wenn `localStorage['kosmo.start.erzwingen']==='1'` (Muster
   `kosmo.vis.onboarding.erzwingen`) — sonst Null-Render. KEIN bestehender
   Spec darf dadurch auch nur eine Assertion ändern.
5. NEU `e2e/start-sequenz.spec.ts`: (a) erzwungen: fünf Boot-Zeilen
   erscheinen, Satellit-Knoten existiert, «SYSTEM BEREIT» kommt, danach
   Zentrale bedienbar; (b) Escape-Skip landet sofort in der Zentrale;
   (c) OHNE erzwingen-Flag: Sequenz-Root hat Count 0 (Bestandsschutz);
   (d) Bridge-offline-Ehrlichkeit: mit umgebogener Bridge-URL erscheint
   «NICHT VERBUNDEN», Sequenz endet trotzdem.
- Dateikreis: NEU StartSequenz.tsx + start-sequenz.css, App.tsx (NUR
  Mount-Zeile + Import), NEU e2e-Spec. TABU: index.html, OrbitStart.tsx,
  alle Islands/Stationen, kosmo-ui.

### E-S2 «Zentrale-Blöcke K13» (Paket P-S2, Sonnet, Worktree zentrale-bloecke :5180)
1. OrbitStart.tsx-Fächer-OPTIK gemäss Owner-K13 («gerade und nüchterne
   blöcke und ganze logos bitte») + Package-Zentrale: Fächer-Einträge werden
   eine gerade, linksbündige BLOCKLISTE — je Block: vollständiges
   Werkzeug-Logo (bestehende KIcon-Registry, Grösse 20) + Klartext-Name in
   Mono-Versalien + 1px-Hairline-Trennung, ruhige Fläche (--k-raised),
   kein Neon, Touch-Höhe ≥44px.
2. Der VERHALTENS-Vertrag des Fächers bleibt BYTE-GLEICH (Hover öffnet,
   Klick-Regeln, testids, aria — der PA2-Kommentar listet den Vertrag):
   NUR Markup/CSS der Einträge ändert sich. Begrüssungszeile: kein
   Listen-/Aufzählungsstil (Package: «Begrüssung ohne Punkt-Listen») —
   prüfen, ob heute eine Punktliste rendert; wenn nein, nichts anfassen
   und im Bericht belegen. KosmoOffice bleibt «KOMMEND».
3. E2E: bestehende `orbit-start.spec.ts` bleibt grün OHNE
   Assertion-Änderung (Vertrag!); NEU kleiner describe-Block (eigene neue
   Datei `e2e/zentrale-bloecke.spec.ts`): jeder Fächer-Eintrag zeigt
   Logo-SVG + Klartext, Trefferfläche ≥44px, Blöcke linksbündig
   ausgerichtet (x-Koordinaten identisch).
- Dateikreis: OrbitStart.tsx, dessen CSS-Datei (grep .k-orbit-faecher),
  NEU e2e/zentrale-bloecke.spec.ts. TABU: App.tsx, StartSequenz-Dateien,
  Fächer-VERHALTEN, testids, alle Stationen.

## Sanktionen
1. P-S1 bricht auch nur EINEN Bestands-Spec → Paket ungültig (Webdriver-
   Guard ist die Versicherung).
2. P-S2 ändert Fächer-Verhalten/testids → Paket ungültig.
3. Fake-Boot (Zeile «bereit» ohne echtes Signal) → Paket ungültig
   (Ehrlichkeits-Grundsatz, Package-Kernentscheid «ehrlicher Boot»).
4. Goldens byte-still (kein Kernel-Kontakt — jede Kernel-Berührung ist
   Scope-Bruch).

## Vollständigkeit
C-1 fünf ehrliche Boot-Zeilen + Satellit + BEREIT → P-S1 · C-2 Skip/
reduced-motion/webdriver-Guard → P-S1 · C-3 Blockliste mit ganzen Logos,
Vertrag unverändert → P-S2 · C-4 beide Bestands-Specs (splash, orbit-start)
unverändert grün → beide · C-5 Gates im Hauptbaum (TC, App-Suite, Build,
gezielte E2E :5183, Screenshots durch Fable) → Fable.

## Nicht-Ziele (dieser 3h-Slice)
Projekt-Tableiste der Zentrale (App.tsx-ProjektListe-Umbau — 0.8.12 mit
eigener Spez) · Boot-Dauer-Tweaks/Gerätewahl aus dem Prototyp · Export des
Motion-Pieces als Video · KosmoSpez-K37c-UI (Hauptstrang B, 0.8.12).
