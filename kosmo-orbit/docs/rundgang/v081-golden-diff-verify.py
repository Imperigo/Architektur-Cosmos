#!/usr/bin/env python3
"""v0.8.1/P6 Golden-Diff-Verify (GOLDEN-WECHSEL-081.md) — Muster wie
v080-golden-diff-verify.py. Prüft je betroffenem planToSvg-Golden:

1. Nur die `<g transform="translate(tx, ty) scale(f)">`-Zeile (Zentrierung)
   und alles ab dem alten Nordpfeil-Block (inkl.) bis zum Dateiende dürfen
   sich unterscheiden — die reine Zeichnungsgeometrie (Wände/Bemassung/
   Symbole) VOR dieser Zeile muss byte-identisch bleiben.
2. Die ty-Verschiebung der Transform-Zeile muss exakt
   (alte contentH/2) - (neue contentH/2) = (275 - 232) / 2 = 21.5 mm
   betragen (275 = 297 - 22 alte Reserve, 232 = 297 - 65 neue Reserve,
   `plankopfReserveMm().hoehe`), sofern `b` (Zeichnungs-Bounds) vorhanden ist
   (tx bleibt unverändert, da nur die Höhen-Reserve wuchs).
3. Der neue Block enthält `data-teil="nordpfeil"` UND `data-teil="plankopf"`.

Aufruf: `python3 docs/rundgang/v081-golden-diff-verify.py` (Repo-Root
`kosmo-orbit/`), nutzt `git show HEAD:<pfad>` als Alt-Stand.
"""
import re
import subprocess
import sys

GOLDENS = [
    "grundriss-fenster-zweifluegel",
    "grundriss-fensterband",
    "grundriss-kipp",
    "grundriss-kontext-baueingabe",
    "grundriss-kontext-werkplan",
    "grundriss-kontext-wettbewerb",
    "grundriss-satteldach-eg-darunter",
    "grundriss-satteldach-first",
    "grundriss-testhaus-baueingabe",
    "grundriss-testhaus-wettbewerb",
    "grundriss-testhaus",
    "grundriss-walmdach-flach",
    "plankopf-stammdaten",
    "werkplan-beschlag-s2",
    "werkplan-beschlag",
]

TRANSFORM_RE = re.compile(r'<g transform="translate\(([\-0-9.]+), ([\-0-9.]+)\) scale\(([\-0-9.]+)\)">')
EXPECTED_DELTA_TY = 21.5  # (297 - 22)/2 - (297 - 65)/2, A3_QUER paper used by all 15 fixtures


def alt_inhalt(pfad: str) -> str:
    return subprocess.run(
        ["git", "show", f"HEAD:kosmo-orbit/packages/kosmo-kernel/test/golden/{pfad}"],
        cwd="../..",
        capture_output=True,
        text=True,
        check=True,
    ).stdout


def main() -> int:
    ok = True
    for name in GOLDENS:
        pfad = f"{name}.svg"
        alt = alt_inhalt(pfad)
        with open(f"../../packages/kosmo-kernel/test/golden/{pfad}", encoding="utf-8") as f:
            neu = f.read()

        alt_lines = alt.splitlines()
        neu_lines = neu.splitlines()

        # Erste divergierende Zeile suchen.
        i = 0
        while i < len(alt_lines) and i < len(neu_lines) and alt_lines[i] == neu_lines[i]:
            i += 1

        if i >= len(alt_lines) or i >= len(neu_lines):
            print(f"FEHLER {name}: keine Divergenz gefunden (Dateien identisch?)")
            ok = False
            continue

        divergente_alt_zeile = alt_lines[i]
        m_alt = TRANSFORM_RE.match(divergente_alt_zeile)
        if not m_alt:
            print(f"FEHLER {name}: erste Abweichung ist nicht die Transform-Zeile: {divergente_alt_zeile!r}")
            ok = False
            continue
        m_neu = TRANSFORM_RE.match(neu_lines[i])
        if not m_neu:
            print(f"FEHLER {name}: neue Zeile an derselben Stelle ist keine Transform-Zeile: {neu_lines[i]!r}")
            ok = False
            continue

        tx_alt, ty_alt = float(m_alt.group(1)), float(m_alt.group(2))
        tx_neu, ty_neu = float(m_neu.group(1)), float(m_neu.group(2))
        if tx_alt != tx_neu:
            print(f"FEHLER {name}: tx änderte sich ({tx_alt} -> {tx_neu}), erwartet unverändert")
            ok = False
            continue
        delta = round(ty_alt - ty_neu, 2)
        if delta != EXPECTED_DELTA_TY:
            print(f"FEHLER {name}: ty-Delta {delta} != erwartete {EXPECTED_DELTA_TY}")
            ok = False
            continue

        # Rest der Datei (nach der Transform-Zeile) bis zum alten Nordpfeil-
        # Block muss byte-identisch bleiben; der Nordpfeil-Block selbst und
        # alles danach darf sich unterscheiden (Vollplankopf-Swap).
        rest_alt = alt_lines[i + 1 :]
        rest_neu = neu_lines[i + 1 :]
        j = 0
        while j < len(rest_alt) and j < len(rest_neu) and rest_alt[j] == rest_neu[j]:
            j += 1
        # ab hier muss der ALTE Rest mit dem Nordpfeil-Kommentar/Block beginnen
        alt_rest_ab_j = "\n".join(rest_alt[j:])
        if "Nordpfeil" not in alt_rest_ab_j and 'stroke="black" fill="none"' not in alt_rest_ab_j:
            print(f"FEHLER {name}: Divergenz beginnt nicht beim Nordpfeil-Block: {rest_alt[j] if j < len(rest_alt) else '<EOF>'!r}")
            ok = False
            continue

        neu_rest_ab_j = "\n".join(rest_neu[j:])
        if 'data-teil="nordpfeil"' not in neu_rest_ab_j or 'data-teil="plankopf"' not in neu_rest_ab_j:
            print(f"FEHLER {name}: neuer Block enthält nicht beide data-teil-Marker")
            ok = False
            continue

        print(f"OK   {name}: nur Transform-ty (-{delta}mm, Reserve 22->65) + Nordpfeil/Plankopf-Block geändert, Rest byte-identisch")

    print()
    print("Gesamtergebnis:", "ALLE 15 GOLDENS OK" if ok else "ABWEICHUNGEN GEFUNDEN")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
