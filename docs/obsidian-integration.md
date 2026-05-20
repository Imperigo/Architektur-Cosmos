# Obsidian Integration for Architecture Cosmos

Stand: 2026-05-20

## Ziel

Obsidian soll Architecture Cosmos als private, menschenlesbare Wissensschicht
ergänzen. Es ist ideal für:

- Research Packs;
- Brain Reports;
- Projekt- und Quellen-Notizen;
- Design- und Architekturentscheidungen;
- Taxonomien für Material, Tragwerk, Stil, Typologie und Kontext;
- persönliche Denk- und Review-Prozesse.

Obsidian ersetzt aber nicht:

- die öffentliche Website;
- Cloudflare D1;
- R2/Asset-Speicherung;
- das Rights-Gate;
- die Git-History.

## Grundsatz

```text
Obsidian = privates Denk- und Review-Interface
D1       = strukturierter operativer State
Git      = versionierter Quellcode und geprüfte Daten
R2       = späterer Asset-Speicher
```

## Empfohlene Vault-Struktur

```text
Architecture Cosmos Vault/
  00 Inbox/
  01 Projects/
  02 Sources/
  03 Research Packs/
  04 Brain Reports/
  05 Decisions/
  06 Taxonomies/
  07 Blender + 3D/
  08 Private Rights Review/
```

## Public/Private-Regel

Obsidian darf private Notizen, urheberrechtlich unklare Quellenhinweise und
persönliche Research-Links enthalten. Nichts daraus wird automatisch public.

Wenn ein Obsidian-Inhalt später in die Website oder Datenbank wandert, muss er:

1. Quellenstatus haben;
2. Rechte-Status haben;
3. Public/Private-Klassifikation haben;
4. Review-Entscheid haben;
5. bei Assets nie automatisch öffentlich werden.

## Export V1

Der lokale Export erzeugt aus dem aktuellen Projektzustand eine Vault-Vorschau:

```bash
npm run obsidian:export
```

Output:

```text
out/obsidian-vault/Architecture Cosmos/
```

Dieser Export ist bewusst lokal und derived. Er wird nicht committed und nicht
hochgeladen. Er dient als Vorschau, wie ein späterer echter Obsidian-Vault
aussehen könnte.

## Empfohlene Nutzung

1. Brain Report öffnen.
2. Top Tasks lesen.
3. Research Packs oder Project Notes ergänzen.
4. Entscheidungen in `05 Decisions` festhalten.
5. Nur geprüfte Entscheidungen zurück ins Repo übernehmen.

## Spätere Optionen

- lokaler Sync in einen echten OneDrive-/iCloud-/Dropbox-Obsidian-Vault;
- bidirektionale Review-Links;
- Templates für Projektseiten;
- Dataview-Queries für Material, Typologie, Status und Quellenlücken;
- Claude/Codex liest Obsidian-Notizen als Kontext für Research- und Database-Arbeit.

## Nicht jetzt

- kein automatischer Import aus Obsidian in Public-Daten;
- kein Upload aus Obsidian in R2;
- keine Secrets oder Tokens im Vault;
- keine copyright-problematischen Medien public ausspielen.
