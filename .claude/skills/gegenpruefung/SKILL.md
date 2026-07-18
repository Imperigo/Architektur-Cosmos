---
name: gegenpruefung
description: Gegen Gates prüfen statt einem Screenshot glauben — Byte-Diff bei Goldens, Live-DOM-Nachmessung gegen einen frischen Build, volle Suite statt nur der zwei nächstliegenden Specs. Nutzen vor jedem Abschluss-Gate eines Pakets oder einer Version.
---

*Adaptiert aus `shanraisshan/claude-code-best-practice` (MIT) — Kernidee dort:
Cross-Model-Review (ein zweites Modell prüft unabhängig), Challenge-Prompts
(«prove to me this works»), Produkt-Verifikations-Skills statt reiner
Test-Grün-Meldung. Details/Attribution: `.claude/skills/QUELLEN.md`.*

## KosmoOrbit-Fassung — drei gelernte Lehren als Prüf-Disziplin

Dieses Repo hat sein eigenes Äquivalent zum Quell-Repo-`/ultrareview`: kein
einzelner Screenshot oder Test-Lauf gilt als Beweis, solange er nicht gegen
den *aktuellen* Quellstand nachgemessen ist (`wissen/training/claude/lehren/v0.8.2.md`,
Abschnitt Gate):

1. **Ein Screenshot beweist nur den Build, gegen den er entstand.** Vor jeder
   Schlussfolgerung aus einem Bild: gegen den lebenden, frisch gebauten DOM
   nachmessen (Live-DOM-Probe, z.B. `elementFromPoint`- oder Zählungs-Probe),
   nie ein altes Bundle als aktuellen Zustand ausgeben.
2. **Nach jeder Verhaltensänderung an einem Strom ALLE Specs dieses Stroms
   fahren, nicht nur die zwei thematisch nächstliegenden** — ein Gate, das nur
   einen Teil der betroffenen Spec-Familie prüft, verdeckt Regressionen (die
   PD3c-Lehre: 2 von 4 Island-Specs liefen, zwei Regressionen fielen erst eine
   Runde später auf).
3. **Ein Validator gehört ins automatisierte Gate, nicht nur in den manuellen
   Lauf** — ein Prüfer, der nicht im `release-gate`-Script hängt, fängt seinen
   eigenen Anspruch nicht automatisch ab.

## Die harten Gegenprüf-Werkzeuge dieses Repos

- **Byte-Diff bei Goldens** — `packages/kosmo-kernel/test/golden/*.svg` müssen
  byte-gleich bleiben, wo ein Feature ohne Daten inaktiv ist; ein neues Golden
  kommt nur additiv dazu (`sha256sum`/`git diff --stat` gegen den Vorversion-Stand,
  Muster `V083-SPEZ.md` §0.5 Golden-Politik: `npm run svg-qa` liefert N/0 harte
  Fehler UND ein Byte-Diff der alten Dateien bleibt leer).
- **Isolations-Worktree-Beweis** — ein eigener Worktree + eigener
  `KOSMO_E2E_PORT` beweist, dass ein Paket nicht heimlich an parallelem WIP
  hängt (s. Skill `parallel-pakete`).
- **Matrix-Abnahme (W3/P10-Muster)** — am Ende einer Version prüft ein
  adversariales Gate jede C-Zeile der Vollständigkeits-Matrix einzeln gegen
  ihre Abnahme-Formulierung (`V083-SPEZ.md` §12.9, C-25), nicht summarisch
  «alles läuft».
- **Wörtliches Zitieren statt Zusammenfassen** — ein Gate-Bericht zitiert die
  tatsächliche Testlauf-Ausgabe («239 passed», nicht «Tests laufen durch»);
  eine reine N-passed-Zeile ohne geprüften Exit-Code gilt nicht als Beweis
  (dieselbe Lehre wie `v0.8.0B.md`).

## Anwendung

Vor jedem Abschluss-Bericht eines Pakets: die volle betroffene Suite laufen
lassen (nicht nur den neuen Test), Exit-Codes wörtlich zitieren, bei
UI-Ansprüchen gegen den frisch gebauten DOM nachmessen statt gegen einen alten
Screenshot, und bei Golden-Ansprüchen den Byte-Diff selbst ausführen statt ihn
zu behaupten.
