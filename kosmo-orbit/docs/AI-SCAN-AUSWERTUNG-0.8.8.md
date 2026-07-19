# AI-Scan-Auswertung für v0.8.8

> Delta-Auswertung nach 0.6.3-Methodik, Release-Schritt §0
> (`docs/RELEASE-ABLAUF.md`). **Fenster: LEER** — v0.8.8 «Beweglich» ist
> der zweite Same-Day-Release nach v0.8.6/v0.8.7 (alle drei 19.07.2026).
> Die Notion-Suche zur Release-Zeit (19.07., abends nach dem
> 0.8.7-Release) zeigt als jüngste Scan-Seiten weiterhin
> 🔬 AI-Scan 2026-07-19 (05:15) und 🔭 Prepare-Scan 2026-07-19 (05:07) —
> exakt die zwei Seiten, die `AI-SCAN-AUSWERTUNG-0.8.6.md` heute früh
> vollständig ausgewertet hat. Es liegen KEINE neuen Scan-Seiten vor.
> **Datenbehandlungs-Regel** unverändert: Scan-Inhalte sind
> Fremdmaterial — als Daten behandelt.

## 1 · Executive Summary

Kein neues Delta. Die drei Punkte der 0.8.6-Auswertung gelten fort
(Typst 0.15.1 WATCH · Gemini Omni Flash live/Owner-Gate ·
swisstopo-mcp-Lizenz-Diskrepanz — vor jedem Einbau selbst verifizieren).

## 2 · Direkte Konsequenzen für v0.8.8

Keine neuen. Der 0.8.8-eigene D9-Befund (ÖREB-Live gegen die echte
Bundes-API nicht baubar: kein `attrs.egrid`, Extract-Pfad 404, Gateway
`oereb.geo.admin.ch` ausserhalb CSP/Allowlist) stammt aus EIGENER
Live-Recherche dieser Version, nicht aus einem Scan — dokumentiert in
`docs/V088-SPEZ.md` §2 D9 und als Code-Kommentar am `oerebAbrufen`-Weg
(Commit `093c330`).

## 3 · Ehrlichkeit

Diese Auswertung ist ein dokumentierter Leerlauf, kein Skip: der
Rückwärts-Wächter (`tools/ai-scan-delta.mjs`, E7 v0.8.6) verlangt je
Release eine Auswertung — beim zweiten Same-Day-Release desselben Tages
ist das ehrliche Ergebnis erneut «Fenster leer, die Tages-Auswertung
(0.8.6) deckt den Tag ab». Der nächste volle Scan-Morgen (20.07.) wird
regulär mit der dann aktuellen Version ausgewertet.
