# Weekly Update Scout

The Weekly Update Scout is the safe V1 of an autonomous research assistant for
Architecture Cosmos.

It can run once per week, look for similar reference projects, create concrete
update proposals and optionally email them to the maintainer. It never changes the
public Atlas by itself.

## Current Implementation

Command:

```bash
npm run archive:update-scout
```

Outputs:

```text
out/update-scout/YYYY-MM-DD/update-proposals.json
out/update-scout/YYYY-MM-DD/update-proposals.md
```

Optional email:

```bash
npm run archive:update-scout:mail
```

Required email secrets:

```text
RESEND_API_KEY
UPDATE_SCOUT_EMAIL_TO
UPDATE_SCOUT_EMAIL_FROM
```

Optional live web search:

```text
BRAVE_SEARCH_API_KEY
```

Without a search API key, the scout creates a reviewable query pack and proposal
structure instead of pretending that live internet research happened.

## Approval Links

The script can prepare signed approval links, but they should only be enabled
after a secure Worker endpoint exists.

Required future secrets:

```text
UPDATE_SCOUT_APPROVAL_BASE_URL
UPDATE_SCOUT_SIGNING_SECRET
```

The approval endpoint must:

- verify the HMAC signature;
- verify token expiry;
- require maintainer/admin authentication;
- load the proposal by ID;
- apply only deterministic, reviewed patches;
- create a commit/PR or admin review event;
- never accept arbitrary code or JSON from the email link.

Until that endpoint exists, approval is manual review only.

## Weekly Automation

The intended production scheduler is GitHub Actions or Cloudflare Cron.

Recommended first step:

1. Run weekly in GitHub Actions.
2. Generate the report as an artifact.
3. Send an email only if `RESEND_API_KEY` and recipient secrets are present.
4. Keep approval links disabled until the Worker API is built.

## Security Rules

- The scout does not modify `data/mock-entries.json`.
- The scout does not upload files.
- The scout does not publish anything publicly.
- Candidate sources are suggestions, not trusted facts.
- Copyrighted media remains link-only/private until review.
- Email approval links must be signed and short-lived.
- A clicked email link may approve a proposal, but must never contain raw write
  data that the backend blindly trusts.

## Future Flow

```text
Weekly cron
  -> research similar projects
  -> generate proposal report
  -> send email
  -> maintainer clicks approve
  -> Worker validates signed token + admin session
  -> proposal enters review/apply queue
  -> deterministic patch or PR is generated
  -> public Atlas updates after build/deploy
```
