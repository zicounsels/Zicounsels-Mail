# Staff guide

Compass Mail is your email workspace. The developer configures the services once. Staff then work through the browser, using Google sign-in. The default display timezone is Africa/Lagos (WAT).

## Your permissions

| Role | Can do |
|---|---|
| Viewer | View audience, non-HR campaigns and available reports |
| Editor | Viewer actions plus contact import/updates and marketing campaign drafts |
| Admin | All actions, HR campaigns, approvals, staff test sends, automation setup and audit logs |

All roles can see the audience list. Store only outreach information here, never case notes, identification documents, safeguarding records or passwords. HR emails link to an approved secure system; the app does not create those accounts or manage confidential records.

## Add contacts

Open Audience → Import contacts → Download CSV format. Fill the headers without renaming them. An Excel workbook can be saved as CSV first.

| Field | What to put |
|---|---|
| email | One valid address per row |
| firstName | Name used in the greeting; blank becomes “friend” |
| segment | Teens, Parents, Undergraduates, Graduates, Professionals, Volunteers or Institutions |
| tags | Comma-separated exact tags, such as `clinic-nov,registered:clinic-nov` |
| consent | `yes` only with recorded marketing permission; otherwise `no` |
| consentAt | Actual permission date, preferably ISO format `2026-10-16T12:00:00Z` |
| consentSource | Where permission was obtained, such as a named signup form |
| minor | `yes` or `no`; collect this explicitly |
| parentalConsent | `yes` only where the applicable parent/guardian permission is recorded |
| hrConsent | `yes` only for authorized HR/volunteer communication |
| birthday | Month and day: `03-21`; no birth year needed |
| anniversary | Relevant joining or service anniversary: `04-01` |

Import up to 1,000 rows at a time. Invalid rows and existing email addresses are skipped with reasons. The same address will not be added twice. Imports do not restore unsubscribed contacts. Use Edit for tags, segment and dates, or pause a contact. Permission changes require the administrator to verify the evidence and update the controlled worksheet; do not manufacture consent to clear an error. Suppressions cannot be cleared through this staff interface.

## Create and schedule an email

1. In Email studio, choose a template. For your own AI-generated design, select Import HTML and upload an `.html` file or paste the markup.
2. Write an internal name and recipient-facing subject.
3. Choose marketing or HR, a segment and an optional exact tag. A blank segment means every eligible contact matching the other filters.
4. Fill each personalization field. Use real HTTPS links. Leave no invented testimonials, unfinished offers or unapproved policies in the content.
5. Set date/time and timezone. Use `Africa/Lagos` for Nigeria. The scheduler stores the corresponding UTC time. Review pages show WAT even when a different input timezone was used.
6. If the email needs a calendar attachment, enter title, start, end and meeting URL. ISO examples: `2026-11-21T16:00:00+01:00` and `2026-11-21T18:00:00+01:00`.
7. Update preview, then Save draft. The preview is a visual aid; the backend sanitizes content before sending.
8. Open Campaigns → Review → Check audience & values. An admin sends a real staff test to their own signed-in email, reviews it, then approves the draft.
9. Approval freezes the draft and recipient IDs. The scheduler expands it into individual jobs in chunks. Newly imported contacts are not silently added to an approved one-off campaign.
10. Watch Reports. “Accepted” means the provider accepted the request; “Delivered” comes from a delivery webhook, not from a successful API call alone.

Drafts can be edited. Approved campaigns cannot be edited in place; cancel and create a new draft for changes. Pausing holds future work, but a message already in flight may finish. Cancelling does not recall delivered messages. There is no automatic “send again” button for uncertain outcomes.

## Import email HTML from AI

Ask for an **email**, not a website. Suggested prompt:

> Create a responsive HTML email for Zicounsels using table-based layout, a 600-pixel content width, inline CSS, readable text and public HTTPS image URLs. Use {{first_name}} for the greeting, {{logo_url}} for the logo and {{booking_url}} for the single main CTA. Use blue-purple accents and a calm, empathetic voice. No JavaScript, forms, external stylesheets, tracking pixels or invented testimonials. Leave unsubscribe and company address to the sending platform. Return only the HTML.

The app accepts custom merge fields such as `{{event_title}}` and asks you for their values. `first_name`, `email`, `logo_url`, `preferences_url` and `unsubscribe_url` are system-managed. Unknown/missing values block sending. HTML is sanitized; unsupported elements and style properties may disappear. Test your final email in the clients your audience uses.

## Automation recipes

| Recipe | When it starts | Messages |
|---|---|---|
| Welcome | Newly imported contacts after the journey is first enabled | Days 0, 2, 4, 7 and 10 |
| Webinar | Admin enrolls the matching current audience using the event start as anchor | T−14, T−7, T−3, T−1, T−3h, T−15m, T+1, T+3 branches, T+7 |
| Volunteer | Admin enrolls a current application cohort | Acknowledgment at anchor, info-session invitation two days later |
| Post-session | Admin enrolls a completed-session cohort with its session date | Days 1, 7 and 30 |
| Course | Admin enrolls a course cohort | Days 0, 7 and 14 |
| Birthday | Contact’s MM-DD matches today in Lagos | Annual message, nominally 9 am WAT |
| Anniversary | Contact’s MM-DD matches today in Lagos | Annual message, nominally 9 am WAT |
| Re-engagement | 90 days since recorded click, preference update, lastEngagedAt or creation | One email per inactivity period |

Open Automations → Build a journey. Select a recipe, fill every value, give it a segment/tag and save it paused. An admin must approve and enable it. Other than the four automatic recipes, click Enroll audience and supply the anchor date. Manual enrollments are capped at 100 contacts per request; use distinct cohort tags for larger groups. Repeating the same automation/contact/anchor does not duplicate jobs. A different anchor intentionally creates a new enrollment.

The runner scans up to 25 contacts per enabled automatic recipe on each tick, subject to a shared time budget. For a 1,000-contact audience, a full sweep is about 40 minutes under normal conditions; do not promise exact 9 am arrival. At higher volume use a proper indexed contact database and event triggers. There is no missed-day birthday catch-up, and February 29 anniversaries run on February 29 only.

The volunteer recipe does not automatically issue offers or advance screening. Use the individual HR templates at the appropriate approved stage. Link to your existing secure portal for identity checks, policy acknowledgment, credentials and account setup.

## Webinar audience tags

Use one stable event key, e.g. `clinic-nov-2026`. The webinar recipe needs a broad segment/tag to define the potential audience and a real event start/end.

- Invitation, proof and T−3: the enrolled audience.
- T−1, T−3h, T−15m: contact must have `registered:clinic-nov-2026` at sending time.
- T+1 replay, T+3 counselling offer and T+7 feedback: `attended:clinic-nov-2026`.
- T+3 missed-you branch: `no-show:clinic-nov-2026`.

Update tags from your registration and attendance records before each relevant send. Never assign both attended and no-show for the same event. The app does not import Google Meet attendance automatically. A recipient whose required tag is absent when a job runs is skipped; adding the tag later does not replay that skipped step. Late enrollment skips steps whose scheduled webinar times have already passed.

The replay email links to a resource page. It does not generate a video replay, certificate or QR verification record. Its links must come from your existing Academy/event system.

## Sending rhythm and list health

All messages observe 10 pm–7 am WAT quiet hours. Ordinary marketing is capped at two provider-accepted messages per contact in a rolling seven-day window. A deferred message is checked again the next day. Approved webinar journeys are explicitly exempt from this cap, but still respect quiet hours and consent. Do not use the event exemption to bypass your normal newsletter policy.

No email is sent to a suppressed contact. Marketing additionally requires consent evidence and parental consent where minor is marked yes. HR requires hrConsent=yes. An unsubscribe currently stops **all** future email from this app, including HR; use your normal internal communication channel for essential operational notices when necessary.

Re-engagement does not automatically move people to a cold list after 30 more days. Review responses and apply the paused status manually. Automated clicks are an imperfect signal; a security scanner can register a click. Do not infer a person’s wellbeing or career intentions from email metrics.

## Recovery

For a failed job, inspect the provider error and correct the cause before making a new campaign. For a review-state job, the provider may already have accepted it: ask the administrator to check the provider log and idempotency key. Do not blindly resend.

Pause a journey before changing its source material in code. Existing approved campaign snapshots remain unchanged. A deployment does not retroactively replace their content. If an approved journey must change, pause it and create a new journey with reviewed values; assess existing pending jobs before re-enrolling people.
