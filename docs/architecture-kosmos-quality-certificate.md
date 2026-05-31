# Architecture Kosmos Quality Certificate V1

Status: interner Qualitaetsnachweis, nicht offizielles Normzertifikat.

## Zweck

Das Architecture Kosmos Quality Certificate ist ein lokaler Review-Nachweis fuer
architektonische Arbeitsschritte. Es soll zeigen, dass ein Output nicht einfach
ungepruefter KI-Output ist, sondern durch eine menschliche architektonische
Pruefung, Quellen-/Rechtekontrolle und technische Evidenz gegangen ist.

Es ist bewusst kein Ersatz fuer:

- Baubewilligung, Normpruefung oder Behoerdenfreigabe;
- rechtliche Lizenz- oder Urheberrechtsberatung;
- externe Produkt-, Material- oder Sicherheitszertifizierung;
- automatische Veroeffentlichung auf der Website.

## Kernprinzip

Ein Zertifikat bestaetigt nur das, was lokal wirklich belegt ist.

Wenn Quellen, Rechte, Reviewer, Dateiqualitaet, Modellmassstab, Layer,
Materialparameter oder Public-Gates fehlen, bleibt der Status `needs-review`
oder `blocked`. Ein Zertifikat darf nie aus einer KI-Behauptung entstehen,
sondern nur aus einer nachvollziehbaren Review-Spur.

## V1-Scope

V1 gilt zuerst fuer KosmoAsset:

- lokale Asset-Datei oder generiertes Review-Profil ist vorhanden;
- menschlicher Reviewer ist benannt;
- Review-Entscheidung ist explizit gespeichert;
- Handoff-Smoke oder technische Route ist bestanden;
- Public-Gate bleibt blockiert, solange keine separate Publikationsfreigabe
  existiert;
- keine D1-Schreibvorgaenge, keine R2-Uploads, keine oeffentlichen Downloads.

Der aktuelle Pilot ist `warm-concrete-material-001` mit lokaler Blender-Route.

## Qualitaetsachsen

1. Menschliche Architekturpruefung:
   Ein Mensch bestaetigt, dass Zweck, Massstab, Materiallogik, Verwendung und
   Qualitaetsniveau fuer den lokalen Kontext sinnvoll sind.

2. Quellen und Rechte:
   Herkunft, Referenzen und Nutzungsgrenzen sind dokumentiert. Kontext aus
   KosmoData darf helfen, aber keine unklaren Bilder, Plaene oder Modelle
   duerfen dadurch automatisch zu freigegebenen Assets werden.

3. KI-Slop-Gate:
   Der Output muss als architektonisch brauchbar, nachvollziehbar und nicht nur
   plausibel aussehender KI-Output bewertet werden.

4. Technische Evidenz:
   Dateien, Layer, Materialien, Routen, Smoke-Tests und Sandbox-Ergebnisse sind
   lokal pruefbar.

5. Public-Gate:
   Lokale Zertifizierung ist keine oeffentliche Freigabe. Publikation,
   Download, R2-Upload oder Verwendung in produktiven Projektdateien brauchen
   separate Freigabe.

## Statusvokabular

| Status | Bedeutung |
| --- | --- |
| `needs-review` | Es gibt eine bewusste Review-Spur, aber keine Freigabe. |
| `approve-local` | Menschlich lokal geprueft, nur fuer lokale Sandbox-Arbeit. |
| `asset_local_review_certified` | Lokaler Review-Nachweis ist vollstaendig. |
| `block-public` | Oeffentliche Nutzung bleibt bewusst gesperrt. |
| `reject` | Route oder Asset wird fuer diesen Zweck abgelehnt. |

## Nicht verhandelbare Grenze

Das Zertifikat darf nie als Marketing-Siegel verwendet werden, das mehr
behauptet als die Evidenz zeigt. Es ist zuerst ein internes Qualitaetswerkzeug:
es hilft dem Architekturbuero, KI-gestuetzte Arbeit verantwortbar,
nachvollziehbar und menschlich kontrolliert zu machen.
