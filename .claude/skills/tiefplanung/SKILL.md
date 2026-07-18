---
name: tiefplanung
description: Vor grossen Paketen erst eine verbindliche V0xx-SPEZ.md schreiben — geprüfte Belege statt Annahmen, vertikale Schnitte statt Phasen-Horizonte, Sanktionsliste + Vollständigkeits-Matrix. Nutzen, bevor ein Bauagenten-Auftrag für ein mehrteiliges Paket geschrieben wird.
---

*Adaptiert aus `shanraisshan/claude-code-best-practice` (MIT) — Kernidee dort:
immer mit Plan-Modus beginnen, PRDs in vertikale Schnitte statt horizontale
Phasen zerlegen, einen zweiten Claude als Staff-Engineer gegenlesen lassen.
Details/Attribution: `.claude/skills/QUELLEN.md`.*

## KosmoOrbit-Fassung — das `docs/V0xx-SPEZ.md`-Muster

Dieses Repo hat sein eigenes, härteres Äquivalent zum Quell-Repo-`/ultraplan`:
jede grössere Version beginnt mit einem **W0-Paket**, das eine verbindliche
`docs/V0xx-SPEZ.md` schreibt (Muster `V082-SPEZ.md`, `V083-SPEZ.md`). Diese
Datei ist danach **Owner-Sache, nicht Bauagenten-Ermessen** — kein stiller
Re-Interpretationsspielraum im Code, jeder Widerspruch geht zurück an
Fable/Owner statt selbst entschieden zu werden (`V083-SPEZ.md`, Schlusszeile).

**Die vier Bausteine einer Tiefplanung hier:**

1. **Geprüfte Belege statt Annahmen** — jede Behauptung über den Ist-Stand
   trägt `Datei:Zeile`, gegengeprüft gegen einen konkreten Commit-Hash
   (`V083-SPEZ.md` §14, 32 Belege, mehrere davon als explizite Korrektur
   gegenüber der Kurzfassung des Ultraplans markiert — «Plan-Referenz `:1040`
   stimmt NICHT, der tatsächliche Mechanismus liegt bei `:1108-1127`»). Ein
   Plan, der Codezeilen behauptet statt sie nachzulesen, ist keine Tiefplanung.
2. **Vertikale statt horizontale Schnitte** — ein Paket zieht eine Fähigkeit
   durch alle Schichten (Entity → Command → Derive → UI → Test), statt «erst
   alle Entities, dann alle Commands» zu bauen. Beispiel `V083-SPEZ.md` §1
   (Kommentar-Entität): Entity, Command, Registry-Zeile, UI-Anschluss stehen
   in einem Paketauftrag, nicht auf drei verteilt.
3. **Sanktionsliste (eng begrenzt)** — jede Tiefplanung listet explizit, WAS
   ausserhalb der eigentlichen neuen Dateien verändert werden darf (`V083-SPEZ.md`
   §11, 13 Punkte). Alles andere bleibt byte-gleich. Das ist der Dateikreis
   eines Pakets, bevor es überhaupt anfängt.
4. **Vollständigkeits-Matrix mit messbarer Abnahme** — jeder Entscheid bekommt
   eine C-Zeile mit Ziel-Paket und einem prüfbaren Kriterium, nie einem
   Gefühl («sieht fertig aus») (`V083-SPEZ.md` §12, 25 Zeilen C-1…C-25). Ein
   Bauagent, der seinen Auftrag bekommt, findet seine eigenen C-Zeilen und
   liefert exakt gegen deren Abnahme-Text.

## Anwendung

Vor einem neuen mehrteiligen Paket: Owner-Auftrag → Ultraplan (Fable/Opus,
ausserhalb des Repos) → `docs/V0xx-SPEZ.md` (W0, mit Belegen §14, Sanktionsliste
§11, Matrix §12) → erst dann Bauagenten-Aufträge (Wxx/Pxx) an Sonnet, jeder mit
exaktem Dateikreis aus der Spez zitiert.
