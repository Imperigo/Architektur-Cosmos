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

## Bekannte Grenze: hochgestellte Ziffern 4–9 fehlen

Weder Lato noch IBM Plex Mono enthalten Glyphen für U+2074–U+2079 (⁴⁵⁶⁷⁸⁹) —
auch nicht über ein OpenType-`sups`-Feature (beide Fonts haben schlicht keine
Superscript-Glyphen ausserhalb von ¹²³, die im Latin-1-Block U+00B9/00B2/00B3
liegen und darum funktionieren). Empirisch bestätigt mit `docs/rundgang/
d4-pdffonts-stichprobe.mjs` + `pdftoppm`: die fehlende Glyphe erscheint NICHT
als sichtbares Tofu/Kästchen, sondern wird von jsPDF/Poppler still
ausgelassen — «361⁵» wird im PDF zu «361» ohne jeden Hinweis auf den
verlorenen mm-Rest (Rendering-Beweis: `docs/rundgang/
d4-pdffonts-stichprobe-1.png`). Das ist strenger als ein sichtbares
Missing-Glyph-Kästchen: ein stiller Informationsverlust. Die SIA-Bemassung (`derive/dimensions.ts`,
`dimensionLabel`) zeigt einen hochgestellten mm-Rest **nur für 1–9** (Rest 0
wird nie hochgestellt ausgegeben) — im PDF-Pfad mit eingebettetem Font
erscheint für Rest 4–9 darum eine Missing-Glyph-Box (Tofu) statt der Ziffer,
Rest 1–3 funktioniert. Dies ist eine Bestandsgrenze der beiden Fonts, keine
Einbettungs-Fehlfunktion — dokumentierter Kandidat für 0.7.4 (Sonderfont oder
gezielter Helvetica-Fallback nur für Bemassungstext im PDF-Pfad).

## 700 vs. 900 — Lato «Heavy» (empirischer Entscheid)

`@fontsource/lato` kennt kein Gewicht 800 («Heavy»). Vergleichs-Renderings
gegen Soll 5b unter `docs/rundgang/d4-lato-700-vs-900*.png` — **900 (Black)**
trifft die Strichstärke des Soll-Titels sichtbar näher als 700 (Bold), s.
`docs/GOLDEN-WECHSEL-D4.md` für den vollständigen Vergleich.

## Lizenz

Wie `apps/kosmo-orbit/public/fonts/README.md`: beide Familien SIL Open Font
License 1.1 (OFL-1.1) — Lato © tyPoland Łukasz Dziedzic, IBM Plex Mono ©
IBM Corp. Volltext: <https://scripts.sil.org/OFL>.
