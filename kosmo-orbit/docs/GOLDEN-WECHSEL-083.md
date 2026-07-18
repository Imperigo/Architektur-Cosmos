# Golden-Wechsel 083 — EIN neues Golden «masskette-plan.svg» (v0.8.3, W1/P3)

Diese Datei wurde VOR der Regeneration begonnen (Abschnitt 1–2, Scope/Guard-
Entscheid), der Ist-Teil danach ergänzt (Abschnitt 3–5) — Namensmuster
identisch zu `docs/GOLDEN-WECHSEL-081.md`/`-080.md` (`docs/V083-SPEZ.md`
§0.5, geprüfter Beleg 3).

## 0 · Referenzpunkt

Letzter bekannter Golden-Stand vor diesem Wechsel: `ce8b16c`/v0.8.2 (Release,
`docs/GOLDEN-WECHSEL-081.md` war der letzte Sammelwechsel davor). **35
bestehende SVG-Goldens** unter `packages/kosmo-kernel/test/golden/*.svg`
(Ist-Zahl `ls … | wc -l` = 35, `docs/V083-SPEZ.md` §14 Beleg 2).

## 1 · Auftrag (§0.5/§2.3, `docs/V083-SPEZ.md`)

**Kein Sammelwechsel an bestehenden Goldens** — dieses Paket ist **golden-
diszipliniert, nicht golden-still**: E2 (Mess-Werkzeug, §8-7-Freigabe)
braucht eine neue `MassKette`-Entität + `design.massKetteSetzen`-Command +
einen Plan-Derive-Zweig (`derive/plan.ts`), der eine Masskette-Linie +
-Längenlabel je Segment in den Plan-SVG-Output schreibt. Damit dieser neue
Zweig **die 35 bestehenden Goldens byte-gleich lässt**, gilt die
Guard-Regel aus der Spez wörtlich:

> «der Masskette-Derive-Codepfad darf nur dann in den Plan-SVG-Output
> schreiben, wenn `doc.byKind('masskette').length > 0` für das jeweilige
> Geschoss — jedes der 35 bestehenden Golden-Fixtures hat keine
> `MassKette`-Entität und bleibt dadurch strukturell unberührt, unabhängig
> vom Code-Zustand des neuen Zweigs.»

**Ergebnis: +1 neues Golden**, `masskette-plan.svg` — **35 → 36**.

## 2 · Guard-Umsetzung (`packages/kosmo-kernel/src/derive/plan.ts`)

`derivePlan()` sammelt kurz vor `computeBounds(regions, lines)` (unmittelbar
nach der Stützenraster-Achsen-Schleife) zusätzliche Linien/Texte:

```ts
const massketten = doc.byKind<MassKette>('masskette').filter((m) => m.storeyId === storeyId);
for (const mk of massketten) {
  for (let i = 1; i < mk.punkte.length; i++) {
    const a = mk.punkte[i - 1]!;
    const b = mk.punkte[i]!;
    lines.push({ a, b, classes: ['symbol', 'masskette'] });
    texte.push({
      at: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      text: formatLength(Math.round(dist(a, b))),
      classes: ['symbol', 'masskette-label'],
    });
  }
}
```

`doc.byKind<MassKette>('masskette')` ist für **jedes** der 35 Bestands-
Fixtures leer (keines legt je eine `masskette`-Entität an) — die Schleife
läuft dort nie, `lines`/`texte` bleiben unverändert, `computeBounds()`
liefert dieselbe Bounding-Box wie vor diesem Paket. Kein bestehender
Codepfad wurde verändert, nur additiv ergänzt (Zeilen davor/danach
byte-gleich). Rendering im Druckweg (`derive/plansvg.ts`) braucht **keine
Änderung**: die generischen `for (const l of plan.lines)`/
`for (const t of plan.texte)`-Schleifen dort rendern jede unbekannte Klasse
bereits mit den Default-Stiften (`STIFT.kante`/`GRAU.geschnitten`, Default-
Textgrösse 2.2mm) — `masskette`/`masskette-label` fallen automatisch in
diese Defaults, kein neuer Klassen-Zweig nötig.

## 3 · Fixture (`packages/kosmo-kernel/test/fixtures.ts`, `testhausMasskette()`)

Eigenes Fixture-Doc (bewusst NICHT eines der 35 Bestands-Fixtures
wiederverwendet — die Golden-Politik verlangt, dass KEIN Bestands-Fixture je
eine `MassKette`-Entität zeigt): Testhaus 8×6 m (identischer Wandring wie
`testhausWalmdachGrundriss()`) + **eine** `design.massKetteSetzen`-Kette mit
drei Punkten (zwei Segmente, diagonal quer durchs Gebäude:
`(500,500)→(4000,3000)→(7500,5500)`).

## 4 · Erzeugender Test (`packages/kosmo-kernel/test/masskette.test.ts`)

```ts
it('Golden: Grundriss mit gesetzter Masskette (drei Punkte, zwei Segmente) ist byte-identisch', () => {
  const { doc, storeyId } = testhausMasskette();
  const svg = planToSvg(doc, storeyId, {
    scale: 50,
    paper: A3_QUER,
    projectName: 'Golden-Masskette',
    planTitle: 'Grundriss Masskette',
    date: '18.07.2026',
  });
  pruefeGolden(svg, new URL('./golden/masskette-plan.svg', import.meta.url));
});
```

Erzeugt via `GOLDEN_UPDATE=1 npx vitest run test/masskette.test.ts` (Muster
`test/golden-helfer.ts`), danach byte-gleicher Zweitlauf ohne die
Umgebungsvariable geprüft (grün).

## 5 · Ist-Nachweis nach Regeneration (18.07.2026)

- `git status --porcelain -- packages/kosmo-kernel/test/golden/` zeigt
  **genau EINE neue, bisher ungetrackte Datei**
  (`?? packages/kosmo-kernel/test/golden/masskette-plan.svg`) — **keine**
  der 35 bestehenden Golden-Dateien erscheint im Status.
- `git diff --stat -- packages/kosmo-kernel/test/golden/` ist **leer**
  (neue, ungetrackte Dateien erscheinen nicht in `git diff`; der Diff der 35
  bestehenden, bereits getrackten Dateien ist explizit 0 Zeilen) —
  Byte-Gleichheit der 35 Alt-Goldens damit belegt.
- `npm run svg-qa` → **36 Goldens geprüft, 0 harte Fehler, weiterhin genau 4
  Text-Overlap-Warnungen** (`abnahmeprotokoll.svg` 1, `blatt-autofuellung.svg`
  8, `blatt-framework.svg` 3, `plankopf-framework.svg` 24 — alle vier
  vorbestehend, unverändert; `masskette-plan.svg` selbst 0 Warnungen, 0
  Fehler, Fitting/Text-Containment beide im Toleranzband).
- `masskette-plan.svg` SHA-256: `332ee7d024fa76f9cb6c90b988de8af5fc56ae94cf98dc476d35bb0433cfa9d2`
  (53 Zeilen) — festgehalten hier, damit ein künftiger Wechsel den
  Referenzpunkt dieses Pakets kennt.
- Kernel-Suite: **994/994 grün** (964 Bestand v0.8.2 + 30 neue additive
  Tests — 16 `test/kommentar.test.ts` + 14 `test/masskette.test.ts`, davon 2
  der 14 der Golden-/Guard-Beweis dieses Wechsels).

## 6 · Offene Punkte / ehrliche Grenzen

- Die Masskette-Linie/-Label trägt im Golden bewusst **keine eigene,
  unterscheidbare Strichkonvention** (z.B. eine gestrichelte Mess-Kadenz wie
  bei der assoziativen Aussenbemassung, `derive/dimensions.ts`) — sie fällt
  in `plansvg.ts` auf dieselben Default-Stifte wie eine gewöhnliche
  Bauteilkante (`STIFT.kante`/`GRAU.geschnitten`). Das ist funktional
  korrekt (Golden-Politik verlangt keine neue Stilblatt-Konvention) und
  hält den Diffkern klein, ist aber eine optische Vereinfachung — eine
  eigene `masskette`-Kadenz (z.B. `DASH`-Eintrag) wäre ein separater,
  bewusster Sammelwechsel, sollte der Owner das wünschen.
- Kein Sammelwechsel an den 35 Bestands-Goldens war nötig oder geplant —
  dieser Wechsel ist ausschliesslich additiv (+1 Datei), keine der
  35 bestehenden Dateien wurde inhaltlich berührt.
