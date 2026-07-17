# grundriss-v1.jsonl — Statistikbericht

Erzeugt von `tools/training/generiere-grundriss-sft.mts` (Seed `0x4b4f534d`,
V082-SPEZ.md §6.2). Deterministisch — zwei Läufe erzeugen eine byte-identische
Datei (Doppellauf-Beweis im P2-Abschlussbericht).

## Zeilen gesamt

**925 Zeilen** in `grundriss-v1.jsonl`.

| Aufgabentyp | Zeilen |
|---|---|
| grundriss-generieren (Rechteck) | 559 |
| grundriss-generieren (L-Form) | 204 |
| grundriss-generieren (Ablehn-/Diagnose-Fälle, kuratiert) | 8 |
| wohnung-segmentieren | 154 |

## Filterquote je Pool (geometrische Näherung, V082-SPEZ.md §6.2 / LORA-KONZEPT.md §1.3)

| Pool | Roh (Grid + seeded Zufall) | Verworfen: Zimmerbreite < 2.40 m | Verworfen: kein Layout (< 6×6 m) | Behalten |
|---|---|---|---|---|
| Rechteck | 580 | 21 | 0 | 559 |
| L-Form | 204 | 0 | 0 | 204 |

L-Form, davon mit ausgelassenem Flügel (Naht < 90 cm, Generator diagnostiziert
statt zu erfinden, trotzdem behalten): 0.

Ablehn-/Diagnose-Fälle (kuratiert, umgehen den Filter bewusst — ihr Wert IST
die Ablehnung/Diagnose): 8.

## Wohnungs-Segmentierung (`segmentiere()`)

Kein Zimmer-Richtwert-Filter (checks.ts:70-72 nimmt Programm-Zonen/ganze
Wohnungen von der Zimmerbreite/-fläche-Regel aus) — hier zählt nur, ob
überhaupt ein Band ≥ 3 m Tiefe neben dem Korridor lag.

| Pool | Roh | Leer (kein Band, als Diagnose behalten) | Mit ≥ 1 geschnittener Wohnung |
|---|---|---|---|
| Segmentierung | 154 | 2 | 152 |

## Qualitätsfilter — Begründung der Näherung (nicht verschwiegen)

V082-SPEZ.md §6.2 legt für P2 explizit die geometrische Näherung fest
("`pruefeGrundriss`-Filter (geometrische Näherung wie in der Stichprobe,
`docs/LORA-KONZEPT.md` §1.3)"). Ein Weg zum SCHARFEN Check (echtes KosmoDoc
mit Wall/Opening, `pruefeGrundriss()` unverändert) existiert im Kernel
bereits über `design.geschossErstellen` → `design.zoneErstellen` →
`design.grundrissGenerieren` → `design.waendeAusZonen` (belegt:
`packages/kosmo-kernel/test/kernel.test.ts:4780-4805`) — für P2 nicht gebaut,
weil die Spec ihn nicht verlangt und `docs/LORA-KONZEPT.md` §1.3 den Aufwand
für eine Vollmenge als unverhältnismässig einstuft (dort für "v1.1"
vorgemerkt). Referenziert für eine künftige Version, nicht verschwiegen.
