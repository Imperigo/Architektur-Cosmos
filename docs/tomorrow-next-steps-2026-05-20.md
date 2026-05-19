# Tomorrow Next Steps: 2026-05-20

## Wichtigster Fokus

Brain V2 als offizielle Cloud-Version planen und beginnen.

## Ausgangslage

Lokal existieren jetzt:

```bash
npm run brain:review
npm run brain:doctor
```

`brain:doctor` ist die lokale Self-Healing-Version:

- Brain Review;
- Archive Validate;
- Lint;
- Build;
- Security Check;
- Report nach `out/brain-review/YYYY-MM-DD`.

## Ziel fuer morgen

Aus dem lokalen Brain wird ein hosted Brain-Konzept:

```text
Cloudflare Scheduled Brain
```

Es soll spaeter ohne Laptop laufen.

## Morgenplan

1. Architektur entscheiden:
   - Cloudflare Worker Cron;
   - D1 fuer Brain-State;
   - optional R2 fuer Reports;
   - GitHub API fuer PRs;
   - Mail/Notification erst nach Approval-Konzept.

2. Dokument erstellen:
   - `docs/cloud-brain-architecture.md`
   - Rollen, Cron, Datenfluesse, Approval Gates, Failure Recovery.

3. Datenmodell vorbereiten:
   - `brain_runs`;
   - `brain_tasks`;
   - `brain_approvals`;
   - `brain_errors`;
   - `brain_reports`.

4. API-/Worker-Entscheid:
   - read-only Status endpoint zuerst;
   - keine echten Writes am Anfang;
   - keine E-Mails ohne explizite Freigabe.

5. Safety:
   - grosse Aenderungen fragen immer;
   - Self-healing nur fuer Checks, Reports und derived outputs;
   - kein automatischer Push auf `main` ohne Approval.

## Danach

- Mobile UI weiter verfeinern.
- Database Profile Coverage erhoehen.
- 3D Viewer und Material-/Tragwerksanalyse weiter ausbauen.
- Rechte-Gate fuer public/private Daten schaerfen.

