# PDF-Einbettungs-Fonts (v0.7.3 D4 «Zwei Stimmen»)

jsPDF (v4.2.1, `svg2pdf.js`-Pfad) kann **kein woff2** einbetten — nur TrueType
(TTF)/OpenType. Diese drei Dateien sind darum ein **eigener, zweiter**
Font-Satz neben `apps/kosmo-orbit/public/fonts/*.woff2` (die UI-Fonts aus
v0.7.2, self-hosted für `fonts.css`): latin-subsettete **TTF**, ausschliesslich
für den PDF-Export (`jsPDF.addFileToVFS`/`addFont` in `export-plan.ts` und
`export-sheets.ts`).

| Datei | Schrift/Schnitt | Grösse | Verwendung |
| --- | --- | --- | --- |
| `lato-900-latin-pdf.ttf` | Lato Black (900) | 26.0 KB | Titel (Plankopf-/Legenden-Titel, `font-weight="bold"` in den Goldens) |
| `ibm-plex-mono-400-latin-pdf.ttf` | IBM Plex Mono Regular (400) | 18.5 KB | Messbares (Masse, Koten, Etiketten, Plankopf-Meta, Achskreise) |
| `ibm-plex-mono-600-latin-pdf.ttf` | IBM Plex Mono SemiBold (600) | 18.4 KB | Messbares, fett hervorgehoben (z.B. Total-Zeilen) |

Alle drei zusammen **63 KB** — weit unter dem 200-KB-Einzellimit.

## Herkunft & Subsetting

Quelle: `npm pack @fontsource/lato @fontsource/ibm-plex-mono` (registry.npmjs.org,
direkt erreichbar — github-raw ist Policy-403 und wurde NICHT versucht). Die
fontsource-woff2-Dateien wurden mit `fontTools.ttLib.TTFont` entflaviort
(`flavor = None`) zu rohem TTF, danach mit `pyftsubset` auf den Zeichensatz

```
U+0020-00FF, U+2013, U+2014, U+2018-201D, U+2022, U+00B7, U+2212, U+2070-2079
```

(Latin-1 + Gedankenstriche/Anführungszeichen/Mittelpunkt/Minus + hochgestellte
Ziffern) reduziert.

## Hochgestellte mm-Reste im PDF — GELÖST in v0.7.4 (P1)

**Bestand (v0.7.3):** Weder Lato noch IBM Plex Mono enthalten Glyphen für
U+2074–U+2079 (⁴⁵⁶⁷⁸⁹). Solange die SIA-Bemassung den mm-Rest als **Unicode-
Superscript-Zeichen** ausgab, wurde «361⁵» im PDF still zu «361» — ein
unsichtbarer Informationsverlust (empirisch mit `docs/rundgang/
d4-pdffonts-stichprobe.mjs` + `pdftoppm` bestätigt, Rendering-Beweis
`docs/rundgang/d4-pdffonts-stichprobe-1.png`), Rest 1–3 funktionierte nur,
weil ¹²³ im Latin-1-Block (U+00B9/00B2/00B3) liegen.

**Fix (v0.7.4 P1, `derive/dimensions.ts` `dimensionLabelParts` +
`derive/plansvg.ts` `hochzahlSvg`):** Der mm-Rest wird nicht mehr als
Sonderzeichen gesetzt, sondern als **normale Ziffer 0–9 in einem eigenen,
kleineren, hochgestellt positionierten `<tspan>`** (Versatz in SVG-User-
Einheiten, nicht `em` — svg2pdf-sicher). Damit greift für ALLE Reste 1–9 die
ganz normale Ziffern-Glyphe der eingebetteten Fonts; kein Superscript-Glyph
wird mehr gebraucht. Byte-Beweis: Golden-Sammelwechsel 074 (`docs/GOLDEN-
WECHSEL-074.md`) + produktionsechter PDF-Beleg `docs/rundgang/kritik-074/`
(VORHER «361» → NACHHER «361⁵» im PDF). Diese Font-Grenze ist damit für den
Bemassungstext **geschlossen**.

## 700 vs. 900 — Lato «Heavy» (empirischer Entscheid)

`@fontsource/lato` kennt kein Gewicht 800 («Heavy»). Vergleichs-Renderings
gegen Soll 5b unter `docs/rundgang/d4-lato-700-vs-900*.png` — **900 (Black)**
trifft die Strichstärke des Soll-Titels sichtbar näher als 700 (Bold), s.
`docs/GOLDEN-WECHSEL-D4.md` für den vollständigen Vergleich.

## Offene Grenze (v0.7.4): Plankopf-Untertitel/«N» im PDF nur als Bold-Fallback

Eingebettet ist von Lato **nur der Schnitt 900 (Black)** — die Golden-Titel
tragen `font-weight="bold"`, dafür genügt der eine Schnitt. Die v0.7.4-P4-
Feinschliffe am Plankopf (Untertitel-Zeile + Nordpfeil-«N») nutzen aber Lato
im **Regular-Schnitt (400)** auf dem Bildschirm. Im PDF-Pfad fehlt dieser
Schnitt in der VFS — jsPDF fällt darum für diese eine Nebenzeile auf den
nächstbesten eingebetteten Font zurück (kein Tofu, kein Informationsverlust:
der Text erscheint, nur in einer sans-nahen Ersatz-Type statt in Lato 400).
Der on-screen-Stand ist golden-bestätigt; nur der PDF-Export zeigt hier eine
subtile Type-Abweichung in einer sekundären Zeile.

**Ehrlicher Kandidat für später:** `lato-400-latin-pdf.ttf` analog zu den
übrigen Dateien subsetten und in `export-plan.ts`/`export-sheets.ts`
registrieren (~26 KB, weit unter dem 200-KB-Limit). Bewusst NICHT in v0.7.4
gemacht — eigener Font-Bau + Golden-Berührung wären für eine Sekundärzeile
unverhältnismässig; die Nebenzeile bleibt lesbar.

## Lizenz

Wie `apps/kosmo-orbit/public/fonts/README.md`: beide Familien SIL Open Font
License 1.1 (OFL-1.1) — Lato © tyPoland Łukasz Dziedzic, IBM Plex Mono ©
IBM Corp. Volltext: <https://scripts.sil.org/OFL>.
