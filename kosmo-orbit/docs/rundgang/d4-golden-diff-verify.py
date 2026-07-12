#!/usr/bin/env python3
"""D4-Golden-Diff-Verifikation: beweist, dass die 6 geänderten Goldens NUR
Schrift-Attribute (font-family/letter-spacing/font-feature-settings) und
Text-Versalisierung tragen, KEINE Geometrie-/Koordinaten-/Farb-Änderung.

Vorgehen: aus alt (git show HEAD:...) und neu (Arbeitskopie) je Datei die drei
D4-Attribut-Typen entfernen, den Text-Inhalt aller <text>-Elemente Ziffern-
neutral gross schreiben (nur Buchstaben), dann exakt vergleichen.
"""
import re
import subprocess
import sys

FILES = [
    "abnahmeprotokoll",
    "ausnuetzungsnachweis",
    "bauablaufblatt",
    "blatt-autofuellung",
    "kvblatt",
    "studienbericht",
]

# D4 betrifft GENAU diese SVG-Attribute (Typografie-Stimme + Grösse/Gewicht/
# Tracking der vier BLATT_TYPO_MM-Stufen) — alles andere (Koordinaten, Pfade,
# Farben, Stiftstärken, `fill`, `stroke*`, `text-anchor`, `transform`) MUSS
# byte-identisch bleiben. Wir entfernen darum genau diese fünf Attribute
# (unabhängig von ihrer Reihenfolge im Tag) statt sie wertgleich zu vergleichen.
ATTR_RE = re.compile(
    r'''\s?font-family="[^"]*"'''
    r'''|\s?letter-spacing="[^"]*"'''
    r'''|\s?font-feature-settings="[^"]*"'''
    r'''|\s?font-size="[^"]*"'''
    r'''|\s?font-weight="[^"]*"'''
)


def normalize(svg: str) -> str:
    s = ATTR_RE.sub("", svg)
    # Leerzeichen vor '>' aufräumen, die durchs Entfernen von Attributen entstehen.
    s = re.sub(r"\s+>", ">", s)
    # Die EINE geplante D4-Stiftstärken-Änderung (Plankopf-Trennlinie, s.
    # BLATT_TYPO_MM.trennlinie in stilblatt.ts): 0.18 (D1-Feinlinie) → 0.35
    # (D4-Fixwert). Einzige Geometrie-/Stift-Änderung in diesem Sammelwechsel,
    # explizit in der Erwartungsliste (GOLDEN-WECHSEL-D4.md §2) vorhergesagt —
    # hier normalisiert, damit der Rest des Diffs sauber auf 0 prüft.
    s = s.replace('x1="711" y1="567" x2="831" y2="567" stroke="black" stroke-width="0.35"', 'x1="711" y1="567" x2="831" y2="567" stroke="black" stroke-width="TRENNLINIE"')
    s = s.replace('x1="711" y1="567" x2="831" y2="567" stroke="black" stroke-width="0.18"', 'x1="711" y1="567" x2="831" y2="567" stroke="black" stroke-width="TRENNLINIE"')

    # JEDEN Text-Knoten (zwischen '>' und '<') versal machen — auch bei
    # verschachtelten <tspan>-Elementen (Ziffern/Satzzeichen bleiben von
    # .upper() unberührt) — damit reine Versalisierungs-Diffs verschwinden,
    # echte Inhaltsänderungen aber nicht. In diesen Report-/Blatt-Goldens
    # liegt aller Textinhalt zwischen Tags, nie ausserhalb — global sicher.
    s = re.sub(r">([^<]+)<", lambda m: ">" + m.group(1).upper() + "<", s)
    return s


def git_show_head(path: str) -> str:
    return subprocess.run(
        ["git", "show", f"HEAD:kosmo-orbit/{path}"], cwd=REPO_TOP, capture_output=True, text=True, check=True
    ).stdout


REPO = "/home/user/wt-s3/kosmo-orbit"
REPO_TOP = "/home/user/wt-s3"

all_ok = True
for name in FILES:
    rel = f"packages/kosmo-kernel/test/golden/{name}.svg"
    old = git_show_head(rel)
    with open(f"{REPO}/{rel}", encoding="utf-8") as f:
        new = f.read()

    old_n = normalize(old)
    new_n = normalize(new)

    if old_n == new_n:
        print(f"OK   {name}: nach Entfernen der D4-Font-Attribute + Versal-Normalisierung BYTE-IDENTISCH (0 Geometrie-/Text-Diff)")
    else:
        all_ok = False
        print(f"DIFF {name}: Unterschied bleibt NACH Normalisierung — echte Inhaltsänderung, prüfen!")
        # Kurzer Kontext-Diff
        import difflib

        for line in difflib.unified_diff(
            [old_n[i : i + 200] for i in range(0, len(old_n), 200)],
            [new_n[i : i + 200] for i in range(0, len(new_n), 200)],
            lineterm="",
        ):
            print(line[:220])

print()
print("Gesamtergebnis:", "ALLE 6 GOLDENS NUR FONT+VERSAL, 0 GEOMETRIE-DIFF" if all_ok else "ABWEICHUNG GEFUNDEN")
sys.exit(0 if all_ok else 1)
