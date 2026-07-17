#!/usr/bin/env python3
"""OCR-Pipeline: Lehrheft-PDFs (gescannt) → Obsidian-Vault + Trainings-JSONL.

Je Heft:  wissen/vault/<Name>.md   — Frontmatter + eine Sektion pro Seite
Gesamt:   wissen/training/korpora/lehrhefte.jsonl — Chunks (~1200 Zeichen) mit Quelle+Seite

Läuft lokal (tesseract deu, 200 dpi) — wiederholbar, wenn neue Hefte dazukommen.
"""
import concurrent.futures as cf
import json
import os
import re
import subprocess
import sys
import tempfile

import fitz  # PyMuPDF

BASIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HEFTE = json.load(open(os.path.join(BASIS, 'tools', 'hefte.json')))


def ocr_seite(args):
    pfad, seite = args
    doc = fitz.open(pfad)
    pix = doc[seite].get_pixmap(dpi=200)
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
        pix.save(f.name)
        tmp = f.name
    try:
        # OMP_THREAD_LIMIT=1: 6 Prozesse × N Threads übersubskribieren sonst die CPU
        out = subprocess.run(
            ['tesseract', tmp, '-', '-l', 'deu', '--psm', '3'],
            capture_output=True, text=True, timeout=180,
            env={**os.environ, 'OMP_THREAD_LIMIT': '1'},
        )
        return seite, out.stdout
    except Exception as e:  # eine kaputte Seite darf den Lauf nicht reissen
        print(f'  ! Seite {seite + 1} übersprungen: {e}', flush=True)
        return seite, ''
    finally:
        os.unlink(tmp)


def bereinige(text: str) -> str:
    # OCR-Rauschen dämpfen: Silbentrennung am Zeilenende zusammenziehen
    text = re.sub(r'([a-zäöü])-\n([a-zäöü])', r'\1\2', text)
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def chunks(text: str, ziel=1200):
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
    nur = sys.argv[1] if len(sys.argv) > 1 else None
    jsonl_pfad = os.path.join(BASIS, 'training', 'korpora', 'lehrhefte.jsonl')
    for datei, titel in sorted(HEFTE.items()):
        if nur and nur not in datei:
            continue
        eintraege = []
        name = datei.replace('.pdf', '.md')
        if os.path.exists(os.path.join(BASIS, 'vault', name)):
            print(f'{titel}: schon da — übersprungen', flush=True)
            continue
        pfad = os.path.join(BASIS, 'lehrhefte', datei)
        doc = fitz.open(pfad)
        n = doc.page_count
        doc.close()
        print(f'{titel}: {n} Seiten …', flush=True)
        seiten = {}
        with cf.ProcessPoolExecutor(max_workers=6) as ex:
            for seite, text in ex.map(ocr_seite, [(pfad, i) for i in range(n)]):
                seiten[seite] = bereinige(text)
        md = [
            '---',
            f'titel: {titel}',
            'quelle: Hochbauzeichner-Lehrmittel (Owner-Bibliothek, gescannt)',
            f'datei: lehrhefte/{datei}',
            f'seiten: {n}',
            'ocr: tesseract-deu 200dpi',
            'tags: [bauwissen, lehrheft]',
            '---',
            '',
            f'# {titel}',
            '',
        ]
        for i in range(n):
            if not seiten.get(i):
                continue
            md.append(f'## S. {i + 1}')
            md.append('')
            md.append(seiten[i])
            md.append('')
        with open(os.path.join(BASIS, 'vault', name), 'w') as f:
            f.write('\n'.join(md))
        for i in range(n):
            for c in chunks(seiten.get(i, '')):
                if len(c) < 80:
                    continue  # Bildunterschrift-Schnipsel ohne Substanz
                eintraege.append({'text': c, 'quelle': f'Lehrheft {titel}', 'seite': i + 1})
        # je Heft sofort anhängen — der Lauf ist damit jederzeit wiederaufnehmbar
        with open(jsonl_pfad, 'a') as f:
            for e in eintraege:
                f.write(json.dumps(e, ensure_ascii=False) + '\n')
        print(f'  → vault/{name} + {len(eintraege)} Chunks', flush=True)
    print('FERTIG: alle Hefte verarbeitet')


if __name__ == '__main__':
    main()
