# OneDrive-Ablage — «11 AI Workflow»

Der Owner wünscht die fertige Software, das Handbuch-PDF und die Worker-
Übergaben sauber im OneDrive-Ordner **«11 AI Workflow»** abgelegt. Das ist
ein **Fünf-Minuten-Handgriff am ersten Abend** — es braucht nur ein
OneDrive-Token mit Schreibrecht, das auf dieser Container-Maschine bewusst
nicht liegt (kein Geheimnis im Repo).

## Voraussetzung: Token mit Schreibrecht

Das bestehende `wissen/tools/onedrive.py` hat neu einen `push`-Befehl. Er
braucht den Scope **Files.ReadWrite.All** (die Wissens-Pipeline nutzte bisher
nur Files.Read.All). Token-Datei wie gehabt über die Umgebung:

```bash
export KOSMO_GRAPH_TOKEN_DATEI=/pfad/zur/token.json   # {"access_token":…,"refresh_token":…}
```

Beim ersten `push` erneuert das Skript den Token per Refresh-Grant selbst,
falls er abgelaufen ist.

## Ablegen

```bash
cd /pfad/zu/Architektur-Cosmos

# 1) Die Abgabe (Handbuch, Galerie, Übergaben)
python3 wissen/tools/onedrive.py push kosmo-orbit/abgabe "11 AI Workflow/KosmoOrbit-V1/Abgabe"

# 2) Die fertigen Installer (nachdem sie aus der CI heruntergeladen sind —
#    siehe CI-ARTEFAKTE.md; Binärdateien liegen nie im Git)
python3 wissen/tools/onedrive.py push ~/Downloads/kosmoorbit-installer "11 AI Workflow/KosmoOrbit-V1/Software"

# 3) Die Worker-Übergabe (CLAUDE.md + V2-AUFTAKT als Kontext für den nächsten Worker)
python3 wissen/tools/onedrive.py push kosmo-orbit/docs/V2-AUFTAKT.md "11 AI Workflow/KosmoOrbit-V1/Uebergabe/V2-AUFTAKT.md"
python3 wissen/tools/onedrive.py push kosmo-orbit/CLAUDE.md            "11 AI Workflow/KosmoOrbit-V1/Uebergabe/CLAUDE.md"
```

Ergebnis-Struktur in OneDrive:

```
11 AI Workflow/
└── KosmoOrbit-V1/
    ├── Abgabe/        HANDBUCH-KOSMOORBIT-V1.pdf, galerie/, INSTALL.md, …
    ├── Software/      dmg, AppImage, deb, rpm, msi, exe, iOS-Xcode-Artefakt
    └── Uebergabe/     CLAUDE.md, V2-AUFTAKT.md
```

`push` lädt kleine Dateien direkt und grosse (Installer, PDF) via
Upload-Session in 10-MB-Blöcken; bestehende Dateien werden ersetzt.
