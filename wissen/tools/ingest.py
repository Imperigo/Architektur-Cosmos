#!/usr/bin/env python3
"""Verallgemeinerte Wissens-Pipeline: PDF-Ordner → Obsidian-Vault + Trainings-JSONL.

Anders als ocr-lehrhefte.py (rein gescannte Hefte) prüft dieses Skript zuerst
den Textlayer je Seite und fällt nur bei Bild-Seiten auf OCR (tesseract deu)
zurück — digitale PDFs (Normen, Vorlesungen, Bücher) laufen so in Sekunden.

Nutzung:
  python3 ingest.py <quell-ordner> <sammlung> [--quelle "Label"] [--tags a,b]
                    [--ohne-ocr] [--max-seiten N] [--ausschluss=teil1,teil2]

Ergebnis:
  wissen/vault/<sammlung>/<Name>.md              (eine Sektion pro Seite)
  wissen/training/korpora/<sammlung>.jsonl       (Chunks ~1200 Zeichen, Quelle+Seite)

Wiederaufnehmbar: vorhandene Vault-Dateien werden übersprungen, JSONL wird
je Dokument sofort angehängt.
"""
import concurrent.futures as cf
import fcntl
import json
import os
import re
import subprocess
import sys
import tempfile

import fitz  # PyMuPDF

BASIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MIN_TEXT_ZEICHEN = 40  # darunter gilt die Seite als Scan → OCR


def ocr_seite(args):
    pfad, seite = args
    doc = fitz.open(pfad)
    pix = doc[seite].get_pixmap(dpi=200)
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
        pix.save(f.name)
        tmp = f.name
    try:
        out = subprocess.run(
            ['tesseract', tmp, '-', '-l', 'deu', '--psm', '3'],
            capture_output=True, text=True, timeout=180,
            env={**os.environ, 'OMP_THREAD_LIMIT': '1'},
        )
        return seite, out.stdout
    except Exception as e:
        print(f'  ! OCR Seite {seite + 1} übersprungen: {e}', flush=True)
        return seite, ''
    finally:
        os.unlink(tmp)


def bereinige(text: str) -> str:
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


def sicherer_name(name: str) -> str:
    name = name.rsplit('.', 1)[0]
    name = name.replace('ä', 'ae').replace('ö', 'oe').replace('ü', 'ue').replace('ß', 'ss')
    name = re.sub(r'[^A-Za-z0-9._-]+', '-', name).strip('-')
    return name or 'dokument'


def verarbeite(pfad, sammlung, quelle, tags, ohne_ocr, max_seiten):
    datei = os.path.basename(pfad)
    vault_ordner = os.path.join(BASIS, 'vault', sammlung)
    os.makedirs(vault_ordner, exist_ok=True)
    md_pfad = os.path.join(vault_ordner, sicherer_name(datei) + '.md')
    if os.path.exists(md_pfad):
        print(f'{datei}: schon da — übersprungen', flush=True)
        return 0
    try:
        doc = fitz.open(pfad)
    except Exception as e:
        print(f'{datei}: nicht lesbar ({e}) — übersprungen', flush=True)
        return 0
    n = doc.page_count
    if max_seiten and n > max_seiten:
        print(f'{datei}: {n} Seiten > Limit {max_seiten} — übersprungen', flush=True)
        doc.close()
        return 0
    seiten = {}
    scan_seiten = []
    for i in range(n):
        text = doc[i].get_text()
        if len(text.strip()) >= MIN_TEXT_ZEICHEN:
            seiten[i] = bereinige(text)
        else:
            scan_seiten.append(i)
    doc.close()
    if scan_seiten and not ohne_ocr:
        print(f'{datei}: {n} Seiten, davon {len(scan_seiten)} per OCR …', flush=True)
        with cf.ProcessPoolExecutor(max_workers=6) as ex:
            for seite, text in ex.map(ocr_seite, [(pfad, i) for i in scan_seiten]):
                seiten[seite] = bereinige(text)
    else:
        print(f'{datei}: {n} Seiten (Textlayer)', flush=True)
    titel = datei.rsplit('.', 1)[0]
    md = [
        '---',
        f'titel: "{titel}"',
        f'quelle: "{quelle}"',
        f'datei: "{datei}"',
        f'seiten: {n}',
        f'ocr-seiten: {len(scan_seiten) if not ohne_ocr else 0}',
        f'tags: [{tags}]',
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
    with open(md_pfad, 'w') as f:
        f.write('\n'.join(md))
    eintraege = []
    for i in range(n):
        for c in chunks(seiten.get(i, '')):
            if len(c) < 80:
                continue
            eintraege.append({'text': c, 'quelle': f'{quelle}: {titel}', 'seite': i + 1})
    with open(os.path.join(BASIS, 'training', 'korpora', f'{sammlung}.jsonl'), 'a') as f:
        # flock: parallele Läufe dürfen keine Zeilen zerreissen
        fcntl.flock(f, fcntl.LOCK_EX)
        for e in eintraege:
            f.write(json.dumps(e, ensure_ascii=False) + '\n')
        fcntl.flock(f, fcntl.LOCK_UN)
    print(f'  → vault/{sammlung}/{os.path.basename(md_pfad)} + {len(eintraege)} Chunks', flush=True)
    return len(eintraege)


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    quell_ordner, sammlung = sys.argv[1], sys.argv[2]
    quelle = sammlung
    tags = 'bauwissen'
    ohne_ocr = False
    max_seiten = 0
    ausschluss: list[str] = []
    for arg in sys.argv[3:]:
        if arg.startswith('--quelle='):
            quelle = arg.split('=', 1)[1]
        elif arg.startswith('--tags='):
            tags = ', '.join(arg.split('=', 1)[1].split(','))
        elif arg == '--ohne-ocr':
            ohne_ocr = True
        elif arg.startswith('--max-seiten='):
            max_seiten = int(arg.split('=', 1)[1])
        elif arg.startswith('--ausschluss='):
            ausschluss = arg.split('=', 1)[1].split(',')
    gesamt = 0
    pdfs = []
    for wurzel, _, dateien in os.walk(quell_ordner):
        if any(a and a in wurzel for a in ausschluss):
            continue
        for d in sorted(dateien):
            if d.lower().endswith('.pdf'):
                pdfs.append(os.path.join(wurzel, d))
    for pfad in sorted(pdfs):
        gesamt += verarbeite(pfad, sammlung, quelle, tags, ohne_ocr, max_seiten)
    print(f'FERTIG: {len(pdfs)} PDFs, {gesamt} neue Chunks')


if __name__ == '__main__':
    main()
