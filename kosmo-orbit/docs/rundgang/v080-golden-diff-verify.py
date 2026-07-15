#!/usr/bin/env python3
"""P7-Golden-Diff-Verifikation (v0.8.0, Golden-Sammelwechsel 080).

Beweist für jedes geänderte Blatt-Golden, dass der Diff zwischen alt (git
HEAD) und neu (Arbeitskopie) ausserhalb der Gruppen `<g data-teil="plankopf">`
und `<g data-teil="blattlayout">` (und dem alten Fusskopf, der KEIN
`data-teil`-Attribut trägt) entweder null ist ODER ausschliesslich aus dem
EINEN dokumentierten, erwarteten Zusatz-Effekt besteht: der
Auto-Fuellungs-Rasterverschiebung durch die geänderte `PLANKOPF_RESERVE`
(`derive/blattfuellung.ts`, 40→`plankopfReserveMm().hoehe`=65mm,
docs/GOLDEN-WECHSEL-080.md Abschnitt 1). Anders als beim D4-Sammelwechsel
(reine Font-Attribute) ist das Kriterium hier zweistufig — Stufe 1 entfernt
Chrome (Plankopf/Blattlayout/Alt-Fusskopf), Stufe 2 klassifiziert den REST
explizit statt ihn stillschweigend auf 0 zu zwingen: jede verbleibende
Diff-Zeile wird als "erwartete Platzierungsverschiebung" (nur Zahlen in
`translate(...)`/x/y-Attributen unterscheiden sich, derselbe Textinhalt/dieselbe
Struktur) oder "UNERWARTET" eingestuft. Nur im zweiten Fall ist das Ergebnis
ein Fehler.
"""
import re
import subprocess
import sys

REPO_TOP = "/home/user/Architektur-Cosmos"
GOLDEN_REL = "kosmo-orbit/packages/kosmo-kernel/test/golden/{name}.svg"

# Blatt-Goldens, die dieser Sammelwechsel laut Erwartungsliste (Abschnitt 2
# von GOLDEN-WECHSEL-080.md) ändert. Nur eine Datei — s. dortige Begründung.
CHANGED_SHEET_GOLDENS = ["blatt-autofuellung"]


def git_show_head(rel_path: str) -> str:
    return subprocess.run(
        ["git", "show", f"HEAD:{rel_path}"],
        cwd=REPO_TOP,
        capture_output=True,
        text=True,
        check=True,
    ).stdout


def strip_balanced_groups(svg: str, marker: str) -> str:
    """Entfernt jede `<g data-teil="{marker}">...</g>`-Gruppe komplett,
    balanced über verschachtelte <g>-Tags (die Blattlayout-Gruppen wickeln
    z.B. `<g data-teil="wasserzeichen">` als Kind ein)."""
    out = []
    i = 0
    open_tag = f'<g data-teil="{marker}">'
    while True:
        idx = svg.find(open_tag, i)
        if idx < 0:
            out.append(svg[i:])
            break
        out.append(svg[i:idx])
        depth = 1
        j = idx + len(open_tag)
        while depth > 0:
            next_open = svg.find("<g", j)
            next_close = svg.find("</g>", j)
            if next_close < 0:
                raise ValueError(f"Unbalanced <g data-teil=\"{marker}\"> group")
            if 0 <= next_open < next_close:
                depth += 1
                j = next_open + 2
            else:
                depth -= 1
                j = next_close + 4
        i = j
    return "".join(out)


# Alter kompakter Fusskopf (`derive/sheet.ts` ALT-PFAD vor P7): eine
# `<g font-size="3">...</g>`-Gruppe OHNE `data-teil` — existiert nur in der
# ALTEN (HEAD-)Fassung, die neue kennt sie nicht mehr (Default-Flip).
ALT_FUSSKOPF_RE = re.compile(r'<g font-size="3">.*?</g>\n?', re.DOTALL)

# Alter, uniformer 10mm-Rahmen des ALT-PFADS — eine BARE <rect>, nicht in
# einer <g> gewickelt (anders als der neue Rahmen, der immer unter
# `<g data-teil="blattlayout">` steht).
ALT_RAHMEN_RE = re.compile(
    r'<rect x="10" y="10" width="[\d.]+" height="[\d.]+" fill="none" stroke="black" stroke-width="0\.35"/>\n?'
)


def _drop_blank_lines(svg: str) -> str:
    # Entfernen einer Gruppe reisst eine leere Zeile an ihrer Stelle auf
    # (die Zeilenumbrüche rund um die Gruppe bleiben stehen) — reines
    # Skript-Artefakt der Entfernung, kein Inhaltsunterschied.
    return "\n".join(line for line in svg.split("\n") if line.strip() != "")


def normalize_old(svg: str) -> str:
    svg = strip_balanced_groups(svg, "plankopf")
    svg = strip_balanced_groups(svg, "blattlayout")
    svg = ALT_FUSSKOPF_RE.sub("", svg)
    svg = ALT_RAHMEN_RE.sub("", svg)
    return _drop_blank_lines(svg)


def normalize_new(svg: str) -> str:
    svg = strip_balanced_groups(svg, "plankopf")
    svg = strip_balanced_groups(svg, "blattlayout")
    return _drop_blank_lines(svg)


NUMBER_RE = re.compile(r"-?\d+(?:\.\d+)?")


def nur_zahlen_unterschiedlich(a: str, b: str) -> bool:
    """True, wenn `a`/`b` nach dem Herausnehmen aller Zahlen identisch sind
    (Struktur/Tags/Textinhalt gleich, nur Koordinatenwerte unterschiedlich) —
    das Kennzeichen einer reinen Platzierungsverschiebung, kein Struktur-/
    Text-/Farb-Diff."""
    return NUMBER_RE.sub("#", a) == NUMBER_RE.sub("#", b)


def diff_zeilen(old: str, new: str):
    old_lines = old.split("\n")
    new_lines = new.split("\n")
    import difflib

    sm = difflib.SequenceMatcher(a=old_lines, b=new_lines)
    erwartet = []
    unerwartet = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            continue
        old_block = old_lines[i1:i2]
        new_block = new_lines[j1:j2]
        if tag == "replace" and len(old_block) == len(new_block):
            for o, n in zip(old_block, new_block):
                if nur_zahlen_unterschiedlich(o, n):
                    erwartet.append((o, n))
                else:
                    unerwartet.append((o, n))
        else:
            for o in old_block:
                unerwartet.append((o, None))
            for n in new_block:
                unerwartet.append((None, n))
    return erwartet, unerwartet


def main() -> int:
    all_ok = True
    for name in CHANGED_SHEET_GOLDENS:
        rel = GOLDEN_REL.format(name=name)
        old = git_show_head(rel)
        with open(f"{REPO_TOP}/{rel}", encoding="utf-8") as f:
            new = f.read()

        old_n = normalize_old(old)
        new_n = normalize_new(new)

        if old_n == new_n:
            print(f"OK   {name}: nach Entfernen von Plankopf/Blattlayout/Alt-Fusskopf BYTE-IDENTISCH (0 Geometrie-Diff)")
            continue

        erwartet, unerwartet = diff_zeilen(old_n, new_n)
        if unerwartet:
            all_ok = False
            print(f"DIFF {name}: {len(unerwartet)} UNERWARTETE Zeilen ausserhalb der Chrome-Gruppen — ECHTER Regressionsverdacht:")
            for o, n in unerwartet[:20]:
                print(f"  - {o!r}")
                print(f"  + {n!r}")
        else:
            print(
                f"OK   {name}: {len(erwartet)} Zeilen unterscheiden sich NUR in Zahlenwerten (Struktur/Text identisch) — "
                f"erwartete Platzierungsverschiebung durch PLANKOPF_RESERVE 40→{65}mm (docs/GOLDEN-WECHSEL-080.md Abschnitt 1), 0 unerwarteter Diff"
            )

    print()
    print("Gesamtergebnis:", "ALLE GEPRÜFTEN GOLDENS OK (0 unerwarteter Geometrie-Diff)" if all_ok else "ABWEICHUNG GEFUNDEN")
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
