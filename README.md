# Zicounsels Compass Mail

A deployable first release of Zicounsels’ email workspace: a plain HTML/JavaScript frontend on Vercel, a Node.js API on Google Cloud Run, Google Sheets contacts, Firestore scheduling, and Resend email delivery.

**Start with [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).** It explains every service, where to paste each value, deployment order and the first staff test. No emails have been sent and no external resources have been created as part of generating this package.

## What is included

- Branded responsive staff interface using the logo extracted from the supplied offer letter.
- 36 editable email templates covering growth, welcome, webinars, The Compass, celebrations, retention and volunteer HR.
- HTML import, sandboxed preview, merge values, calendar attachments, plain-text fallback and staff test sends.
- Google sign-in with server-side token verification; admin, editor and viewer roles.
- Contacts CSV import/export, deduplication, exact segment/tag filters and persistent suppression.
- Campaign draft → preflight → admin approval → queued → scheduled; pause, resume and cancel.
- Eight journey recipes, including birthdays, anniversaries, a five-part welcome, webinar steps and re-engagement.
- Signed unsubscribe and preferences links, one-click unsubscribe headers, verified provider webhooks and audit records.
- Persistent recipient jobs, transaction claims, stable provider idempotency keys and a review state for uncertain old sends.
- Setup scripts, pinned dependency lockfile, regression tests and staff instructions.

This is a custom first release, **not full Mailchimp feature parity**. Read [docs/FEATURES.md](docs/FEATURES.md) for implemented behavior, limits and next milestones. Complete the real-cloud acceptance checks before using a customer list.

## Package map

| Path | Purpose |
|---|---|
| public/index.html | Staff app shell |
| public/app.js | Staff workflows and HTML preview |
| public/style.css | Responsive design |
| public/templates.json | Email copy and markup |
| public/config.js | Two public frontend configuration values |
| server/index.js | Protected API, webhook and public unsubscribe |
| server/engine.js | Job queue, provider sending, automation scheduling |
| server/store.js | Sheets and Firestore access |
| server/core.js | Validation, sanitization, consent, calendar and tokens |
| scripts/ | Google Cloud setup helpers and template source |
| docs/ | Deployment, staff guide, coverage and verification |
| package-lock.json | Exact resolved dependency tree |

## Local checks

Use Node 22.3+ (Node 24 recommended for development):

```bash
npm ci
npm test
npm run check
```

For a frontend-only preview, `python3 -m http.server 8080 --directory public`, then open http://localhost:8080. It shows an empty workspace and templates; it is not a simulated backend. For the API, copy `.env.example` to `.env`, fill in values, authenticate with `gcloud auth application-default login` and run `npm run dev`. The local Google account needs access to the Sheet and Firestore. Add the localhost origin to the OAuth web client and APP_ORIGIN. Never commit `.env`, account key files or secrets.

## Business content grounding

Template structure and audiences follow the supplied Zicounsels Master Implementation Plan snapshot: its service ladder, Academy, Safari Zetu, email cadence, welcome sequence, webinar ladder and volunteer pathway. The extracted offer-letter logo is used unchanged. Historical subscriber counts and proposed targets are not presented as live metrics. Testimonials, availability, course URLs, fees and approved policies must be supplied by staff.
