# Verification and launch acceptance

## Completed locally

- 18 automated tests passed with Node 24: consent evidence, minors and suppression, exact audience matching, merge-value escaping/missing values, imported HTML sanitization, signed unsubscribe tokens, WAT scheduling and quiet hours, safe retry cutoff, calendar escaping and all 36 templates.
- Queue tests used an in-memory Firestore test adapter and mocked provider responses. They exercised repeated enqueue, post-schedule unsubscribe, accepted-job duplicate protection, immutable payload retry, aged-uncertain review state, campaign/journey pause, future jobs and active claims, repeat-safe enrollment and unsubscribe headers.
- JavaScript syntax checks passed for API, worker and frontend.
- Live local API startup and HTTP smoke checks passed: health 200, unauthenticated staff route 401, unauthenticated scheduler 401, webhook with no configured signing secret 503 and invalid unsubscribe link 400.
- Headless Chromium checks covered the overview, 36-template library, birthday editor and personalization preview, webinar journey fields, and mobile viewport. No page JavaScript errors were observed. Overview, editor and mobile screenshots were visually inspected.
- Production dependency audit reported zero known vulnerabilities in the resolved lockfile at packaging time. This is not a guarantee against future advisories.

No real Google Sheet/Firestore/Cloud Scheduler/Resend integration was executed. Google sign-in success, real provider acceptance/delivery, domain DNS, production IAM and cloud concurrency must be checked in the deployed environment. The tests do not prove production scalability or exactly-once delivery under every infrastructure failure.

## Required first-recipient acceptance

Use a dedicated test contact and real company-controlled infrastructure.

| Check | Expected result |
|---|---|
| Allowed Google admin sign-in | Dashboard and setup available |
| Unlisted Google account | API denies access |
| Editor attempts approval or HR access | API denies access |
| Initialize new empty Sheet twice | Correct headers; no duplicate tab or contact loss |
| Import same CSV twice | Second import skips existing addresses |
| Marketing contact without consent evidence | Excluded from preflight/sending |
| Minor without parental consent | Excluded from marketing |
| Template with missing variable | Preflight/enable fails with a specific missing field |
| Staff test | Only the signed-in admin receives it |
| Approved one-recipient schedule | Queue created; provider accepts at/after scheduled time |
| Repeated Scheduler force run | No additional email for an accepted job |
| Unsubscribe before a pending send | Job suppressed; no later reimport bypass |
| Signed provider delivered event | Delivered count appears |
| Invalid webhook signature | 401; no event or suppression mutation |
| Provider bounce or complaint | Address suppressed |
| Pause journey/campaign | Unclaimed future messages held |
| Calendar message | Correct date/time, title and meeting link in calendar client |
| Event attendee/no-show tags | Correct branch; no contradictory tags |
| Quiet-hour send | Deferred until 7 am WAT or later |
| Campaign exceeds ordinary frequency cap | Deferred; not silently exempted |
| Mobile Gmail and Outlook test | Readable content, visible CTA, working footer and images where permitted |

Record the date, responsible tester and outcome before customer use. When a test fails, keep real audiences out of the app or SEND_ENABLED=false until resolved.

## Inspecting an uncertain delivery

A job in `review` means the outcome cannot safely be retried automatically. Find its Firestore document ID, campaign and provider idempotency key (the same job ID). Check Resend logs/support before creating another email. If the provider shows acceptance, treat it as already sent and record the reconciliation through an administrator-controlled process. The UI intentionally does not offer an unconditional retry button.

## Remaining engineering work

Add cloud-backed integration tests and load tests, signed webhook fixture tests, pagination/aggregation, an operational reconciliation UI, indexed contacts and transactional cadence counters before moving beyond a controlled small-list rollout. See FEATURES.md for other product boundaries.
