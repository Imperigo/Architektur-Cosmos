# KosmoOrbit Office Pilot Plan 2026-06-01

Status: lokaler Pilotplan fuer eine erste Buero-Erprobung von KosmoOrbit.

## Ziel

Der Pilot soll nicht beweisen, dass Architektur Kosmos schon ein fertiges CAD
oder eine fertige KI-Appliance ist. Er soll pruefen, ob die erste
KosmoOrbit-Logik im Buero verstaendlich und nuetzlich ist:

- Projektstatus schneller erfassen;
- Blocker frueher sehen;
- Rollen passender fuehren;
- Review-Schritte wiederholbarer dokumentieren;
- Ausbildung sicherer begleiten.

## Pilotumfang

- Dauer: 45 bis 60 Minuten.
- Projekt: ein kleines reales oder anonymisiertes Projektpaket.
- Rollen: Chef/Admin, Projektleitung, Entwurf, Zeichnung, Ausbildung.
- Modus: lokal, read-only, review-only.
- Kein Push, kein Upload, keine Kundendaten, keine Kosten, keine Generierung.

## Ablauf

1. **Ausgangslage messen**
   - Wo liegen aktuell Projektstatus, offene Fragen, Blocker und naechste
     Aktion?
   - Wie lange braucht eine Person, um sich zu orientieren?
   - Welche Informationen muessen gesucht oder bei anderen Personen erfragt
     werden?

2. **KosmoOrbit Preview zeigen**
   - Presenter-Modus;
   - Workflow-Delta;
   - Pilotmessung;
   - Pilot-Messkit;
   - Buero-Routine;
   - Projektpaket Tagesansicht;
   - KosmoDesign Handoff Console;
   - Rollenumschaltung, Rechte-Matrix und Ausbildungsmodus;
   - Review Decision Draft, Risiko-, Command- und Audit-Vertraege;
   - Pruefevidenz und Demo-Bereitschaft.

3. **Rollen getrennt testen**
   - Chef/Admin: erkennt Risiko, Freigabelinie und Public-Gates?
   - Projektleitung: erkennt naechste Review-Entscheidung?
   - Entwurf: versteht KosmoDesign Review Mode und blockierte Generation?
   - Zeichnung: findet Modell-/Artefakt- und Qualitaetsthemen?
   - Ausbildung: versteht Lernmodus ohne kritische Rechte?

4. **Messpunkte festhalten**
   - Zeit bis Orientierung;
   - Anzahl erkannter Blocker;
   - Anzahl offener Rueckfragen;
   - Verstaendlichkeit pro Rolle;
   - Vertrauen in Freigabelinie;
   - fehlende Informationen fuer echten Betrieb.

5. **Entscheidung**
   - Weiterentwickeln, wenn Rollenlogik und Review-Gates verstanden werden.
   - Verschieben, wenn Kernnutzen unklar bleibt.
   - Nicht live stellen, solange Runtime, Auth, Persistenz, Datenschutz,
     Rechte und Haftung nicht geklaert sind.

## Arbeitsartefakte

- `docs/kosmo-orbit-chef-demo-script-2026-06-01.md` fuer die kurze
  nicht-technische Erklaerung.
- `docs/kosmo-orbit-office-pilot-facilitator-checklist-2026-06-01.md` als
  Moderations-Checkliste fuer den ersten Buero-Pilot.
- `schema/kosmo-orbit-pilot-session.schema.json` als lokaler Messvertrag.
- `examples/kosmo-orbit/pilot/orbit-office-pilot-session.demo.json` als
  leeres Template fuer spaetere echte Pilotwerte.
- `npm run kosmo:orbit-pilot-session` prueft, dass das Template keine
  Kundendaten, Uploads, Kosten, Design-Generation oder erfundenen Resultate
  behauptet.
- `schema/kosmo-orbit-pilot-measurement-kit.schema.json` als lokaler Vertrag
  fuer die Messkarten.
- `examples/kosmo-orbit/pilot/orbit-office-pilot-measurement-kit.demo.json`
  als leeres Messkit mit Evidenzlinks und ohne behauptete Resultate.
- `npm run kosmo:orbit-pilot-kit` prueft, dass Messwerte, Notizen,
  Scoring und Entscheidung leer bleiben, bis ein Mensch den Pilot ausfuellt.
- `schema/kosmo-orbit-pilot-result-draft.schema.json` als lokaler Vertrag fuer
  spaetere echte Pilotresultate.
- `examples/kosmo-orbit/pilot/orbit-office-pilot-result-draft.demo.json` als
  leerer Resultat-Draft mit `null`-Slots, fehlender Evidenz und blockierten
  Public Claims.
- `npm run kosmo:orbit-pilot-result` prueft, dass keine Zeit-, Kosten-,
  Qualitaets- oder Validierungsclaims ohne menschliche Pilot-Evidenz entstehen.

## Fragen an die Chefs

- Wuerde diese Zentrale im Buero Orientierung sparen?
- Welche Rolle braucht zuerst eine echte Arbeitsoberflaeche?
- Wo sind die groessten heutigen Reibungsverluste: Suchen, Entscheiden,
  Modellqualitaet, Rechte, Ausbildung oder Abgabe?
- Welche Daten duerften lokal in einen Pilot, welche nicht?
- Welche Freigabe darf nie automatisiert werden?

## Sicherheitslinie

Dieser Pilot ist kein Deployment und kein Produktivbetrieb.

- keine API-Routes;
- keine Server Actions;
- keine Middleware;
- keine Aenderung an `wrangler.jsonc`;
- keine D1/R2-Writes;
- keine Uploads;
- keine externen Accounts;
- keine Secrets;
- keine Kosten;
- keine automatische Design- oder Plan-Generierung;
- kein Push ohne explizites Push-/Live-/Deploy-Go.

## Erfolgskriterium

Der Pilot ist erfolgreich, wenn ein Architekturbueroleiter in weniger als
zehn Minuten versteht:

- was KosmoOrbit ist;
- was heute schon sichtbar funktioniert;
- warum Generation noch blockiert bleibt;
- wie Rollen und Ausbildung unterschiedlich gefuehrt werden;
- welche Messung als naechster echter Produktschritt sinnvoll ist.
