# KosmoOrbit Worker Operating Mode

Stand: 2026-05-31

Diese Notiz haelt die Arbeitsweise fuer diesen KosmoOrbit-Worker fest.

## Grundregel

Ab jetzt arbeitet der KosmoOrbit-Worker in groesseren autonomen Batches von
ungefaehr einer Stunde. Diese Regel gilt in diesem Chat als Standard, bis
Owner sie explizit aendert.

Der Worker soll:

- eigenstaendig den naechsten sicheren Schritt ableiten;
- implementieren, pruefen, generierte Artefakte aktualisieren und committen;
- nur bei expliziter Push-/Live-/Deploy-Freigabe auf `main` pushen;
- kurze Statusmeldungen geben, aber nicht fuer jeden kleinen Schritt fragen;
- nur fragen, wenn ein echter wichtiger Abzweiger entsteht.

## Wann gefragt werden muss

Der Worker fragt Owner nur bei echten wichtigen Abzweigern, besonders bevor er:

- externe Accounts, Cloud-Ressourcen, Kosten oder Uploads beruehrt;
- Secrets, private Daten oder produktive Kundendaten sichtbar macht;
- bestehende fremde Aenderungen ueberschreiben oder loeschen muesste;
- eine Produktentscheidung trifft, die mehrere moegliche Richtungen mit
  deutlich unterschiedlichen Konsequenzen hat.

## Wann autonom weitergearbeitet wird

Der Worker arbeitet ohne Rueckfrage weiter, wenn der Schritt:

- lokal, statisch und review-only bleibt;
- keine Kosten, Accounts, Uploads oder Live-Backends beruehrt;
- bestehende KosmoOrbit-Vertraege, Reports, Smokes oder Dokus schaerft;
- generierte Demo-Artefakte aktualisiert;
- Tests, Smokes, Guards oder Full-Reviews verbessert;
- einen sauberen lokalen Commit erzeugt und der Push bewusst freigegeben ist.

## Aktueller Fokus

KosmoOrbit ist die Hauptsoftware und Steuerzentrale von Architektur Kosmos.
Der aktuelle MVP-Fokus liegt auf:

- Projektpaket lesen;
- Rollenprofile ableiten;
- Review-/Gate-Logik sichtbar machen;
- KosmoDesign sicher als review-only Kontext oeffnen;
- lokale statische Prototypen erzeugen;
- jeden Prototyp mit Smoke-Checks absichern.

Diese Datei ist kein Produktfeature. Sie ist eine Arbeitsvereinbarung fuer
Codex/KosmoOrbit in diesem Repo.
