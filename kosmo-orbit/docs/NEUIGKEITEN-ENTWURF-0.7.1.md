# Neuigkeiten-Entwurf 0.7.1 — «Echt statt Attrappe»

Entwurf für den nächsten Block in `apps/kosmo-orbit/src/shell/neuigkeiten.ts`
(Serie K / Batch A4, «Funktionen & Neues» im zentralen Einstellungs-Panel).
Diese Datei ist bewusst NUR der Entwurf — die TS-Datei selbst bleibt in
diesem Stream unangetastet (fremder Besitz), damit kein anderer Stream, der
zeitgleich denselben Eintrag ergänzt, einen Merge-Konflikt bekommt. Tonalität
und Format folgen dem 0.7.0-Muster (`NEUIGKEITEN[0]`): kurze, ehrliche Sätze,
was wirklich gebaut wurde — kein Wunsch, kein Plan. Owner-Auftrag «Zwei-Tage-
Grossauftrag»: Schwerpunkt sind die Stellen, wo die App bisher ehrlich «noch
nicht» sagte und jetzt echt sind (`docs/V071-KONZEPT.md`).

## Vorschlag für den Eintrag

```ts
{
  version: '0.7.1',
  datum: '2026-07-11',
  punkte: [
    {
      text: 'Kosmo-Blick in der Cloud gehärtet: jedes Bild wird vor dem Versand auf ~1.15 Megapixel verkleinert und als JPEG neu encodiert, ein 4-MB-Budget prüft die Bildgrösse VOR dem Netz-Roundtrip, und ein zu grosses Bild bekommt eine konkrete deutsche Meldung statt eines generischen Fehlers — bewiesen per abgefangenem Anthropic-Request (Bild-Block im Request-Body); der echte Modell-Call mit einem echten Owner-Schlüssel bleibt Owner-Abnahme (Drehbuch in docs/BETRIEBSARTEN.md).',
    },
    {
      text: 'Cloud-Anmeldung: ein «Abmelden»-Knopf löscht das Abo-Token gezielt (der API-Schlüssel bleibt unangetastet), und ein neu eingetragener API-Schlüssel räumt jetzt auch ein liegengebliebenes Alt-Token auf.',
    },
    {
      text: 'Nachbargebäude amtlich: «Nachbarn übernehmen» im Standort-Panel holt echte Gebäude-Polygone von geo.admin.ch (VECTOR25, der einzige identify-fähige Layer mit Gebäude-Polygonen) und zeigt sie im Situationsplan als graue Footprints neben der eigenen, schwarzen Zone — offen benannt: der Datenstand ist ~2008, amtlich aber nicht tagesaktuell, neuere Gebäude können fehlen.',
      station: 'design',
    },
    {
      text: 'DXF-Export konsolidiert: es gibt jetzt nur noch EINEN Exporter, und er zeichnet Bemassungsketten (Mass, Ticks, Beschriftung) auf einem eigenen Layer mit — bewusster Verhaltenswechsel: Publish-DXF ist ab jetzt y-gespiegelt und trägt semantische Layer, konsistent mit dem Design-Export/Import (vorher unterschieden sich die beiden DXF-Wege).',
      station: 'publish',
    },
    {
      text: '3D-Referenzmodelle laden jetzt auch remote nach, wenn kein lokales Modell vorliegt (ehrlicher Fehler, falls das Archiv nicht erreichbar ist — dessen Inhalt kann derzeit noch leer sein); dazu ein erstes Gelände-Mesh im 3D-Viewport, wo ein Terrain-Profil erfasst ist.',
      station: 'data',
    },
    {
      text: 'Fenster bekommen echtes Glas in 3D (auch die bisher blossen Löcher der nicht-parametrischen Fenster) und eine SIA-gerechte Öffnungssymbolik in der Ansicht (Dreh-/Kipp-/Drehkipp-Dreieck, Schiebe-Pfeil) inklusive Angelseite — im Grundriss ergänzt Kipp ein kurzes Doppelstrich-Symbol; ohne gewählten Flügeltyp bleibt jedes Blatt byte-identisch zum bisherigen Bild.',
      station: 'design',
    },
  ],
}
```

## Ehrliche Grenzen dieses Entwurfs

- **Blick-Cloud**: der letzte Meter — ein echter Anthropic-Bildcall mit dem
  Owner-eigenen Schlüssel — ist in dieser Container-Umgebung nicht getestet
  (kein Netzzugang zu `api.anthropic.com`, kein echter Schlüssel hinterlegt).
  Bewiesen ist der Request-Bau (E2E fängt den Request ab), nicht die Antwort
  des echten Dienstes. Siehe `docs/BETRIEBSARTEN.md` § «Blick Cloud — echt
  (v0.7.1)» für das Abnahme-Drehbuch.
- **Nachbargebäude**: VECTOR25 (`ch.swisstopo.vec25-gebaeude`) ist amtlich,
  aber mit Datenstand ~2008 nicht tagesaktuell — neuere Gebäude in der
  Nachbarschaft können im Import fehlen. Liefert der Layer keine Polygone,
  entfällt der Import-Knopf ehrlich (Fallback: Nachbar-Zonen von Hand
  erfassen).
- **DXF-Verhaltenswechsel**: bewusst und dokumentiert (auch in
  `docs/INTEROP.md` zu ergänzen, ausserhalb dieses Streams) — bestehende
  Publish-DXF-Konsumenten sehen ab 0.7.1 gespiegelte y-Koordinaten und neue
  semantische Layer.
- **Ref-3D-Remote**: der CDN-Host (`archiv.architekturkosmos.ch`) ist ein
  geplanter Schlüssel-Resolver — das Archiv dahinter (R2) kann zum jetzigen
  Zeitpunkt unbefüllt sein; ein Fehlschlag wird gezeigt, nicht versteckt.
- **Terrain-Mesh**: beruht auf handgesetzten Profilen, nicht auf swissALTI3D
  (vertagt, siehe V071-KONZEPT.md «WATCH»).
- **Fenster/SIA-Symbolik**: kein Beschlag-Detail in IFC/DXF — die Symbolik
  ist eine reine Plan-/Ansichts-Konvention, kein zusätzliches Bauteil-Datum.

## Herkunft der Fakten

Ausschliesslich aus dem Code und `docs/V071-KONZEPT.md` geprüft, insbesondere
`packages/kosmo-ai/src/bild-budget.ts`, `apps/kosmo-orbit/src/state/kosmo-blick.ts`,
`packages/kosmo-ai/src/anthropic.ts`, `packages/kosmo-kernel/src/dxf/export.ts`,
`packages/kosmo-data/src/modell-url.ts`, `packages/kosmo-kernel/src/derive/scene.ts` —
nichts davon ist erfunden oder aus einem Plan vorweggenommen.
