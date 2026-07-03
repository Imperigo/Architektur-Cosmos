#!/usr/bin/env python3
"""Trainings-Korpora → Web-Basis für KosmoPrepare.

Liest wissen/training/*.jsonl, gruppiert Chunks nach Quelle und schreibt je
Sammlung eine JSON-Datei nach kosmo-orbit/apps/kosmo-orbit/public/wissen/
plus einen index.json. KosmoPrepare lädt die Sammlungen auf Knopfdruck in
die lokale Wissensbasis (IndexedDB) — Kosmo zitiert sie dann mit [Q]-Marken.

Nach neuen Ingest-Läufen einfach erneut ausführen und committen.
"""
import json
import os

BASIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIEL = os.path.join(
    os.path.dirname(BASIS), 'kosmo-orbit', 'apps', 'kosmo-orbit', 'public', 'wissen'
)

LABELS = {
    'lehrhefte': 'Hochbauzeichner-Lehrhefte',
    'normen': 'Normen-Bibliothek (SIA, bfu, eBKP)',
    'persona': 'Golden Rules Andrin',
    'briefings': 'Kosmos-Briefings V0.1',
    'projektwissen': 'KosmoOrbit-Projektwissen',
    'vorlesungen': 'Vorlesungen HSLU/ETH',
    'buecher': 'Bücher-Bibliothek',
}


def main():
    os.makedirs(ZIEL, exist_ok=True)
    index = []
    ordner = os.path.join(BASIS, 'training')
    for datei in sorted(os.listdir(ordner)):
        if not datei.endswith('.jsonl'):
            continue
        sammlung = datei[:-6]
        quellen: dict[str, list] = {}
        kaputt = 0
        with open(os.path.join(ordner, datei)) as f:
            for zeile in f:
                zeile = zeile.strip()
                if not zeile:
                    continue
                try:
                    e = json.loads(zeile)
                except json.JSONDecodeError:
                    kaputt += 1
                    continue
                quellen.setdefault(e['quelle'], []).append(
                    {'text': e['text'], **({'seite': e['seite']} if 'seite' in e else {})}
                )
        if not quellen:
            continue
        raus = {
            'sammlung': sammlung,
            'label': LABELS.get(sammlung, sammlung),
            'quellen': [{'name': n, 'chunks': c} for n, c in sorted(quellen.items())],
        }
        pfad = os.path.join(ZIEL, f'{sammlung}.json')
        with open(pfad, 'w') as f:
            json.dump(raus, f, ensure_ascii=False)
        anzahl = sum(len(q['chunks']) for q in raus['quellen'])
        index.append({
            'sammlung': sammlung,
            'label': raus['label'],
            'quellen': len(raus['quellen']),
            'chunks': anzahl,
            'kb': os.path.getsize(pfad) // 1024,
        })
        print(f'{sammlung}: {len(raus["quellen"])} Quellen, {anzahl} Chunks'
              + (f' ({kaputt} kaputte Zeilen übersprungen)' if kaputt else ''))
    with open(os.path.join(ZIEL, 'index.json'), 'w') as f:
        json.dump(index, f, ensure_ascii=False)
    print(f'→ {ZIEL} ({len(index)} Sammlungen)')


if __name__ == '__main__':
    main()
