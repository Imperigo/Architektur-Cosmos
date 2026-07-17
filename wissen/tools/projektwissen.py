#!/usr/bin/env python3
"""Projektwissen → Trainings-JSONL: alles, was das Projekt über sich weiss
(docs/, ROADMAP, Gestaltungskonzept, Owner-Mandat …), gechunkt mit Quelle.
Wiederholbar laufen lassen, wenn Dokumente wachsen."""
import json
import os
import re

BASIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WURZEL = os.path.join(os.path.dirname(BASIS), 'kosmo-orbit')
QUELLEN = ['docs', 'ROADMAP.md', 'README.md']


def chunks(text, ziel=1200):
    absaetze = [a.strip() for a in re.split(r'\n{2,}', text) if a.strip()]
    aktuell = ''
    for a in absaetze:
        if aktuell and len(aktuell) + len(a) + 1 > ziel:
            yield aktuell
            aktuell = a
        else:
            aktuell = f'{aktuell}\n{a}' if aktuell else a
    if aktuell:
        yield aktuell


def main():
    eintraege = []
    dateien = []
    for q in QUELLEN:
        p = os.path.join(WURZEL, q)
        if os.path.isdir(p):
            dateien += [os.path.join(p, f) for f in sorted(os.listdir(p)) if f.endswith('.md')]
        elif os.path.isfile(p):
            dateien.append(p)
    for datei in dateien:
        rel = os.path.relpath(datei, WURZEL)
        text = open(datei).read()
        for c in chunks(text):
            if len(c) < 80:
                continue
            eintraege.append({'text': c, 'quelle': f'Projekt {rel}'})
    ziel = os.path.join(BASIS, 'training', 'korpora', 'projektwissen.jsonl')
    with open(ziel, 'w') as f:
        for e in eintraege:
            f.write(json.dumps(e, ensure_ascii=False) + '\n')
    print(f'{len(eintraege)} Chunks aus {len(dateien)} Dokumenten → {os.path.relpath(ziel, WURZEL)}')


if __name__ == '__main__':
    main()
