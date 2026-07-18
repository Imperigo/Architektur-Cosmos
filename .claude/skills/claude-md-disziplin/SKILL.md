---
name: claude-md-disziplin
description: CLAUDE.md bleibt schlank und additiv — neue Punkte in der Leseliste anhängen statt umschreiben, Versions-Banner immer aktuell, Rollback-Riegel nie umgehen. Nutzen, bevor kosmo-orbit/CLAUDE.md geändert wird (nur Fable/Owner-Ermessen, s. Hinweis unten).
---

*Adaptiert aus `shanraisshan/claude-code-best-practice` (MIT) — Kernidee dort:
CLAUDE.md unter ~200 Zeilen halten, Domänenregeln in `.claude/rules/*.md`
auslagern statt die Hauptdatei wachsen zu lassen, `<important if="...">`-Tags
gegen das «wird mit wachsender Datei ignoriert»-Risiko. Details/Attribution:
`.claude/skills/QUELLEN.md`.*

## KosmoOrbit-Fassung — additiv statt umschreiben

`kosmo-orbit/CLAUDE.md` ist die Arbeitsanleitung, die jeder neue Worker
zuerst liest. Drei Disziplinen halten sie brauchbar, statt sie zu einem
unlesbaren Archiv wachsen zu lassen:

1. **Additive Sanktionsliste, kein freies Umschreiben.** Jede
   `docs/V0xx-SPEZ.md` listet explizit, welche Zeile in `CLAUDE.md` ein Paket
   anfassen darf (Muster `V083-SPEZ.md` §11 Punkt 4: «`CLAUDE.md`-Punkt 6 —
   additiver sechster Punkt in „Was du zuerst liest“»). Ein Bauagent, der
   nicht explizit die Freigabe hat, liefert den Text im Bericht — die
   tatsächliche Einfügung macht Fable/der Owner. Kein stiller
   Re-Interpretationsspielraum.
2. **Leseliste wächst nur additiv.** «Was du zuerst liest» ist nummeriert
   (aktuell 5 Punkte: ROADMAP.md, V2-AUFTAKT.md, GESTALTUNGSKONZEPT/
   OWNER-MANDAT, HOMESTATION-AUFTRAG.md, `wissen/training/claude/lehren/`).
   Ein neuer Punkt wird angehängt, nie ein bestehender gestrichen oder
   umformuliert — das ist derselbe Grundsatz wie die Sanktionslisten der
   Pakete selbst: additiv, nachvollziehbar, nie ein Rewrite «aus Geschmack».
3. **Versions-Banner + Rollback-Riegel bleiben eine Einheit.** Der Kopf von
   `CLAUDE.md» trägt ein Stand-Banner («⚠️ ZUERST: Stand prüfen»,
   Aktuelle Version, Verweis auf `STAND.md`); der `session-start.sh`-Hook
   erzwingt automatisch, dass eine Sitzung vom echten Remote-Kopf ausgeht,
   nicht von einem zurückgerollten Web-Container-Snapshot. Ein Banner-Update
   ohne den passenden Hook-Zustand (oder umgekehrt) ist ein halb gemachter
   Job.

## Was NIE in `CLAUDE.md` gehört

Grosse, sich häufig ändernde Inhalte gehören in eigene Dateien mit Verweis,
nicht in die Hauptdatei selbst — genau der Auslagerungs-Gedanke der Quelle
(`.claude/rules/*.md` dort, hier: `docs/V0xx-SPEZ.md`, `wissen/training/
claude/lehren/`, `ROADMAP.md`). `CLAUDE.md` bleibt der **Einstiegspunkt mit
Verweisen**, nicht der Ort, an dem alles selbst steht.

## Anwendung

Vor jeder `CLAUDE.md`-Änderung: steht sie explizit in der Sanktionsliste des
laufenden Pakets? Wenn nein — Text im Bericht liefern, Datei selbst nicht
anfassen. Wenn ja — additiv einfügen (anhängen, nie umschreiben), Banner/Hook
konsistent halten.
