# Merk-Zettel für Fable 5 — Start 06.07.2026

**Notiert von Opus 4.8 am 04.07.2026 im Auftrag des Owners (Andrin).**
Dies ist **kein Plan**, sondern die Auftragsnotiz. **Fable legt übermorzen den
Plan aus** (erst erkunden, dann Plan, dann bauen — Owner-Muster).

## Was übernommen wird (bisher beim Codex-Worker)

Der Owner zieht die Entwicklung vom **Codex-Worker** zu sich (Opus/Fable). Neu in
unserer Hand:

1. **KosmoReference** — fertig bauen, **auf denselben Fertigstellungsgrad und die
   Qualität wie KosmoData**.
2. **KosmoAsset** — ebenfalls fertig bauen, **wie KosmoData** (volle Station, kein
   Teilausbau).
3. **Website www.architekturkosmos.ch** — die Entwicklung der Website war bisher
   ebenfalls bei Codex; wir übernehmen sie und **bauen sie fertig**.

## Rahmen (Owner-Wortlaut)

- **Zeit:** in **zwei Tagen** fertig (Start 06.07., wenn Fable 5 wieder verfügbar).
- **Massstab:** «wie KosmoData» — d.h. voll funktionsfähig, getestet, dokumentiert,
  im gleichen Gestaltungs-/Qualitätsniveau wie die fertigen V1-Stationen.
- **Rollen:** Opus hat heute (04.07.) nur **notiert**. **Fable legt den Plan aus**
  und führt ihn aus.

## Was Fable zuerst tun sollte (Hinweis, nicht Plan)

- Ist-Stand erkunden: Wo stehen KosmoReference und KosmoAsset heute im Repo
  (`apps/kosmo-orbit/src/modules/…`), was ist schon da, was fehlt zu «wie
  KosmoData»? KosmoData als Vorbild/Referenz für Umfang nehmen.
- Den **Codex-Stand** sichten: was hat der Codex-Worker an KosmoReference/
  KosmoAsset und an der Website bereits gebaut, wo liegt das (eigenes Repo/
  Verzeichnis?), was wird übernommen, was neu gemacht.
- Website www.architekturkosmos.ch: Quelle/Stack klären (wo liegt der Code, wie
  wird deployed), dann Fertigbau-Plan.
- Erst danach: **Plan auslegen** (Explore → Plan → Batches mit Tests/Commits/Push,
  Owner-Arbeitsmuster wie in `CLAUDE.md`), dem Owner vorlegen.

## Offene Fragen für den Owner (von Fable am Start zu klären)

- Wo liegt der **Codex-Code** für Website + KosmoReference/KosmoAsset (Repo/Zugang)?
- Gehört die Website ins selbe Repo (`Architektur-Cosmos`) oder bleibt sie separat?
- «Wie KosmoData» — reicht Funktions-/Qualitätsparität, oder gibt es für
  KosmoReference/KosmoAsset zusätzliche inhaltliche Wünsche?

_Stand: reine Notiz. Kein Code an KosmoReference/KosmoAsset/Website geändert._
