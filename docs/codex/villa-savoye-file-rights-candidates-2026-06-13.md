# Villa Savoye File Rights Candidates

Datum: 2026-06-13

Codex hat fuer die lokalen Villa-Savoye-Dateien erste file-level
Rights-Kandidaten recherchiert. Das ist noch keine Public-Freigabe.

## Ergebnis

- Dateien geprueft: 7
- Exakte Remote-Matches: 3
- Derivat/ungeklaert: 4
- Public-ready: 0
- Rights-Candidate-Check: `passed`, 0 Failures, 0 Warnings

## Exakte Remote-Matches

| Lokale Datei | Quelle | Status |
| --- | --- | --- |
| `savoye-3-exterior-cc0.jpg` | Wikimedia Commons `File:Savoye 3.JPG` | exact hash match, CC0 candidate |
| `villa-savoye-loc-exterior.jpg` | Library of Congress item `2020714937` | exact hash match, no-known-restrictions candidate |
| `villa-savoye-chaise-longue-interior-cc-by-sa-2.jpg` | Wikimedia Commons `File:Villa Savoye (8237925975).jpg` | exact hash match, CC BY-SA 2.0 candidate |

## Weiter blockiert

- `villa-savoye-loc-exterior-crop.jpg`: basiert vermutlich auf dem LOC-Bild,
  ist aber kein exakter Remote-Match; Derivat/Crop muss geprueft werden.
- `villa-savoye-ground-floor-diagram.svg`: Quelle/Geometrie-Basis unklar.
- `villa-savoye-long-section-diagram.svg`: Quelle/Geometrie-Basis unklar.
- `low.glb`: Build-Log und Source-Basis fehlen.

## Policy

Auch bei exaktem Remote-Match bleibt `public_ready=false`, bis ein Mensch die
Attribution, Lizenzkompatibilitaet, Bearbeitungen und Public-Display-Entscheidung
freigibt.

## Check

```bash
npm run kosmo:reference-rights-candidate-check -- \
  --candidates examples/kosmo-references/provenance/villa-savoye-file-rights-candidates-2026-06-13.json \
  --out examples/kosmo-references/provenance/villa-savoye-file-level-review
```

## Quellen

- Wikimedia Commons: `https://commons.wikimedia.org/wiki/File:Savoye_3.JPG`
- Wikimedia Commons: `https://commons.wikimedia.org/wiki/File:Villa_Savoye_(8237925975).jpg`
- Library of Congress: `https://www.loc.gov/pictures/item/2020714937/`
