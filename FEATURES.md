# Scope and next milestones

This is a working source package for a controlled first release. It is not a claim that a new app equals or surpasses every Mailchimp feature. Its immediate advantage is Zicounsels-specific copy, audiences, staff approval and programme workflows under your control.

## Coverage

| Request | Included behavior | Boundary |
|---|---|---|
| AI-created email pages | HTML import, preview, merge values, server sanitization | Email-compatible HTML; no arbitrary website JavaScript |
| Prebuilt messages | 36 templates covering every message family in the request | Staff must supply approved links, offers and proof |
| Birthdays and anniversaries | Annual MM-DD recipes | Lagos timezone; no missed-day catch-up; Feb 29 only in leap years |
| Welcome sequence | Five messages over ten days | New contacts after first enabling; based on import date |
| Webinar ladder | Ten scheduled step definitions, including two conditional T+3 branches and T+7 feedback | Attendance/registration tags are maintained by staff |
| Course and post-session follow-up | Weekly course and days 1/7/30 follow-up recipes | Manual cohort enrollment; no LMS or booking API integration |
| Re-engagement | 90-day inactivity message | No automatic cold-list transition or reliable open-based targeting |
| Volunteer HR | All requested stage templates plus two-step intake recipe | Screening decisions, provisioning, credentialing and policy acknowledgment occur elsewhere |
| Contact management | CSV import/export, exact segmentation/tagging, duplicate protection, pause/suppress | CSV only; no direct XLSX parsing; no arbitrary custom contact columns |
| Scheduling | Cloud Scheduler, durable Firestore jobs, time-zone conversion, pause/resume/cancel | Not real-time or exact-second; rate limits and backlog can defer |
| Approval | Admin-only approval, immutable scheduled content | No two-distinct-person requirement or legal sign-off workflow |
| Delivery reports | Accepted, delivered, clicks, bounced, complained, failed/review jobs | Loaded-record summary; not revenue attribution or a full historical BI system |
| Consent | Evidence fields, parental flag, suppression and signed unsubscribe | Does not independently verify the truth of consent evidence |
| Staff access | Google ID-token verification and role allowlist | Single organization; audience contacts visible to all staff |
| Calendar invites | ICS attachment with start/end and meeting URL | No attendee RSVP sync or Google Calendar API mutation |
| Security | Server-only secrets, token checks, raw-body signed webhook, HTML sanitization, stable retry payload | Requires configuration, monitoring and production acceptance tests |

## Not included in this release

A drag-and-drop block editor; A/B or multivariate testing; automatic winning variants; send-time optimization; contact scoring; full custom journey branching; website signup forms with double opt-in; public landing-page builder; e-commerce/catalogue/abandoned-cart integrations; advertising; SMS or WhatsApp delivery; inbound inbox/reply synchronization; CRM sales pipelines; social publishing; multilingual template variants; per-recipient local timezone sends; arbitrary attachments; revenue attribution; a live certificate generator; QR verification; LMS hosting; password provisioning; automated case management; automatic source-system events; Gmail API sending; marketing preference subcategories; a self-service staff invitation screen; complete contact erasure UI; or disaster recovery orchestration.

The app uses Resend rather than Gmail as its sending transport. Gmail is one of the inboxes your recipients can use; it is not the bulk-delivery engine. Your existing Google workspace remains useful for contact data and staff identity.

## Limits and architecture decisions

- Designed for the plan’s initial roughly 1,000-person audience and low-volume controlled rollout. Contact reads hard-stop over 10,000, but that is a protective ceiling, not a tested capacity claim.
- Campaign expansion uses chunks of 100 jobs. A single worker lock and per-job transaction claims protect overlapping scheduler calls. Provider requests are sequential with a 600 ms gap.
- A job body is frozen before its first provider request. Retries reuse the same provider idempotency key and exact body. Once an uncertain send is 23 hours old, it enters review rather than risk a fresh send after the provider’s 24-hour key-retention window. This reduces duplicate risk; it is not a universal exactly-once guarantee.
- Automation scans have cursors and a bounded budget. Manual cohort enrollment is capped at 100 contacts. Keep the number of active recipes small; migrate before heavy use.
- Scheduled audiences are frozen for one-off campaigns; permission, suppression and filter checks run again immediately before provider submission. A tiny race remains if a contact unsubscribes after that check while a request is already in flight.
- Sheets imports are serialized by a Firestore lease. Do not edit the worksheet while an app import is in progress. Sheets is not a transactional multi-user contact database.
- Suppression state lives in Firestore and remains authoritative even if a Sheet status still reads active. Deleting Firestore suppression records removes that protection.
- Reports are capped at 5,000 job/event records, 2,000 campaigns and 1,000 automations/audit records per load. They are explicitly labelled as loaded-record counts. Older records are not necessarily included because these reads do not guarantee chronological pagination.
- Campaigns remain labelled scheduled after their jobs finish; accepted/delivered job reports show outcomes. Automatic “completed” roll-up is a next milestone.
- Source HTML is limited to 200 KB, API bodies to 1 MB. Template styles are intentionally conservative. The logo is the original extracted image and may be blocked by email client image settings.
- No production SLA, throughput benchmark or live-cloud end-to-end certification is claimed. Credentials and cloud resources must be configured and tested in your environment.

## Suggested next milestones

1. Complete first-recipient cloud acceptance, launch a small opted-in cohort, review deliverability and staff feedback.
2. Add persistent pagination and exact aggregate analytics, contact-specific custom fields, and automatic completed-campaign status.
3. Integrate website signup, booking, LMS and registration events with authenticated, idempotent endpoints and double opt-in where appropriate.
4. Move the contact source and sending cadence counters into a transactional database; keep Sheets as a synchronized reporting/export view. Use managed task queues for higher throughput.
5. Add a reviewed block editor, branching journeys, A/B experiments, per-recipient timezone handling and regional preference/retention workflows.
