#!/usr/bin/env python3
"""OneDrive-Anbindung (Microsoft Graph) für die Wissens-Pipeline.

Token liegt NIE im Repo: Pfad zur Token-Datei kommt aus der Umgebung
(KOSMO_GRAPH_TOKEN_DATEI), Format {"access_token": ..., "refresh_token": ...}.
Bei 401 wird der Refresh-Grant versucht und die Datei aktualisiert.

Nutzung:
  python3 onedrive.py ls   "02 Geschäftlich/…"
  python3 onedrive.py pull "02 Geschäftlich/…"  ziel/ordner  [--ext pdf,docx] [--max-mb 500]
"""
import json
import os
import sys
import time
import urllib.parse
import urllib.request

GRAPH = 'https://graph.microsoft.com/v1.0'
TOKEN_DATEI = os.environ.get('KOSMO_GRAPH_TOKEN_DATEI', '')
CLIENT_ID = '14d82eec-204b-4c2f-b7e8-296a70dab67e'  # Microsoft Graph PowerShell (public client)
SCOPE = 'https://graph.microsoft.com/Files.Read.All offline_access'


def _lade_token():
    return json.load(open(TOKEN_DATEI))


def _erneuere_token():
    alt = _lade_token()
    daten = urllib.parse.urlencode({
        'client_id': CLIENT_ID,
        'grant_type': 'refresh_token',
        'refresh_token': alt['refresh_token'],
        'scope': SCOPE,
    }).encode()
    req = urllib.request.Request(
        'https://login.microsoftonline.com/common/oauth2/v2.0/token', data=daten)
    neu = json.load(urllib.request.urlopen(req, timeout=30))
    alt.update({k: neu[k] for k in ('access_token', 'refresh_token') if k in neu})
    with open(TOKEN_DATEI, 'w') as f:
        json.dump(alt, f)
    os.chmod(TOKEN_DATEI, 0o600)
    return alt


def _anfrage(url, roh=False, _retry=True):
    tok = _lade_token()['access_token']
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {tok}'})
    for versuch in range(4):
        try:
            antwort = urllib.request.urlopen(req, timeout=120)
            break
        except urllib.error.HTTPError as e:
            if e.code == 401 and _retry:
                _erneuere_token()
                return _anfrage(url, roh=roh, _retry=False)
            if e.code in (429, 503) and versuch < 3:
                time.sleep(2 ** (versuch + 1))
                continue
            raise
        except urllib.error.URLError:  # z.B. Connection reset am Proxy
            if versuch < 3:
                time.sleep(2 ** (versuch + 1))
                continue
            raise
    return antwort if roh else json.load(antwort)


def kinder(pfad):
    url = (f"{GRAPH}/me/drive/root:/{urllib.parse.quote(pfad)}:/children"
           f"?$top=500&$select=name,folder,size")
    daten = _anfrage(url)
    eintraege = list(daten.get('value', []))
    while '@odata.nextLink' in daten:
        daten = _anfrage(daten['@odata.nextLink'])
        eintraege += daten.get('value', [])
    return eintraege


def lade_datei(pfad, ziel):
    # /content leitet auf eine vorsignierte URL um, die KEINEN Bearer-Header
    # verträgt (401) — darum downloadUrl holen und ohne Auth laden.
    meta = _anfrage(f"{GRAPH}/me/drive/root:/{urllib.parse.quote(pfad)}")
    url = meta['@microsoft.graph.downloadUrl']
    os.makedirs(os.path.dirname(ziel), exist_ok=True)
    for versuch in range(4):
        try:
            antwort = urllib.request.urlopen(url, timeout=600)
            with open(ziel + '.teil', 'wb') as f:
                while True:
                    block = antwort.read(1 << 20)
                    if not block:
                        break
                    f.write(block)
            os.replace(ziel + '.teil', ziel)
            return
        except urllib.error.URLError:
            if versuch < 3:
                time.sleep(2 ** (versuch + 1))
                continue
            raise


def pull(pfad, ziel, endungen=None, max_mb=None):
    """Ordner rekursiv spiegeln; überspringt schon vorhandene Dateien gleicher Grösse."""
    for it in kinder(pfad):
        name = it['name']
        if 'folder' in it:
            pull(f'{pfad}/{name}', os.path.join(ziel, name), endungen, max_mb)
            continue
        endung = name.rsplit('.', 1)[-1].lower() if '.' in name else ''
        if endungen and endung not in endungen:
            print(f'  ~ {name} (Endung .{endung} nicht gewünscht)', flush=True)
            continue
        if max_mb and it.get('size', 0) > max_mb * 1024 * 1024:
            print(f'  ~ {name} ({it["size"] >> 20} MB > {max_mb} MB — ausgelassen)', flush=True)
            continue
        lokal = os.path.join(ziel, name)
        if os.path.exists(lokal) and os.path.getsize(lokal) == it.get('size', -1):
            print(f'  = {name} (schon da)', flush=True)
            continue
        print(f'  ↓ {name} ({it.get("size", 0) >> 20} MB)', flush=True)
        lade_datei(f'{pfad}/{name}', lokal)


def main():
    if len(sys.argv) < 3 or not TOKEN_DATEI:
        print(__doc__)
        sys.exit(1)
    befehl, pfad = sys.argv[1], sys.argv[2]
    if befehl == 'ls':
        for it in kinder(pfad):
            art = '📁' if 'folder' in it else '📄'
            print(f"{art} {it['name']} ({it.get('size', 0) >> 20} MB)")
    elif befehl == 'pull':
        ziel = sys.argv[3]
        endungen = None
        max_mb = None
        for arg in sys.argv[4:]:
            if arg.startswith('--ext'):
                endungen = set(arg.split('=', 1)[1].split(','))
            elif arg.startswith('--max-mb'):
                max_mb = int(arg.split('=', 1)[1])
        pull(pfad, ziel, endungen, max_mb)
        print('FERTIG')
    else:
        print(__doc__)
        sys.exit(1)


if __name__ == '__main__':
    main()
