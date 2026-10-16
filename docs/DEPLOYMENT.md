# Deploy Zicounsels Compass Mail

This guide takes you from the ZIP to a working staff website. Run terminal commands in **Google Cloud Shell**, not in Google Sheets, Apps Script or the Vercel environment-variable page. Keep the staff website private through its Google sign-in allowlist. No customer messages are sent until you explicitly enable delivery and approve a campaign or journey.

## 1. Understand the five pieces

| Piece | What it does | Where its settings live |
|---|---|---|
| Vercel | Hosts the HTML staff interface and logo | public/config.js and Vercel project settings |
| Google Sheets | Editable contact worksheet | SHEET_ID on Cloud Run |
| Cloud Run | Authenticated API, email processing, unsubscribe and webhook endpoints | Cloud Run environment variables and secret bindings |
| Firestore + Cloud Scheduler | Stores durable jobs; wakes the worker every minute | Your Google Cloud project |
| Resend | Delivers email from your verified domain; reports delivery events | Resend dashboard and Secret Manager |

Google Sheets is the contact source. Firestore stores campaign content, recipient jobs, suppressions, events and audit records. Do not put API keys into Sheets or frontend JavaScript. You do **not** need an Apps Script or a downloaded service-account key.

You need a Google Cloud project with billing enabled, an account allowed to create these resources, a GitHub account, Vercel and a domain whose DNS you can edit. Costs depend on Google Cloud usage, your delivery provider’s plan and Vercel’s applicable plan. Set billing alerts; this package does not assume free unlimited sending.

## 2. Put the files into GitHub

1. Extract the ZIP on your computer.
2. Create a **private** repository, for example `zicounsels-mail`.
3. Upload the contents of the extracted `zicounsels-mail` folder. `package.json`, `public`, `server`, `scripts` and `vercel.json` should be at repository root, not inside another nested folder.
4. Include `package-lock.json`. Do not upload `node_modules`, `.env`, `deploy.env.yaml`, secrets or service-account key files.
5. In Vercel, import this repository. Choose **Other** as the framework. Root directory: repository root. Build command: blank. Output directory: `public`. Deploy. The first page is an empty, unconnected workspace.
6. Record the production website origin, such as `https://your-project.vercel.app`. Use its actual value throughout this guide. Do not include a trailing slash.

## 3. Prepare Google Cloud

Open Google Cloud Console, choose or create a dedicated project, enable billing, then click **Activate Cloud Shell**. Clone the repository through your normal GitHub authentication, or upload and extract the ZIP into Cloud Shell. Enter the folder that contains `package.json`.

```bash
cd zicounsels-mail
export ZICO_PROJECT='YOUR_ACTUAL_PROJECT_ID'
export ZICO_REGION='europe-west1'
bash scripts/cloud-bootstrap.sh
```

The script enables the APIs; creates `zico-runtime`, `zico-builder` and `zico-scheduler`; grants the runtime Firestore access; prepares the default Firestore database; and creates three secrets. Use a project dedicated to this app because its collection names are not namespaced by tenant. If your organization requires another region, change the region before creating the database. Database location is a long-term decision.

The deployer needs permissions for service deployment, service-account use, IAM bindings and the named resource creations. If a command returns `PERMISSION_DENIED`, have the project administrator grant the specific permission reported. Do not substitute your Gmail address for a service-account address.

Firestore must use **Native mode / Standard edition**, with database ID `(default)`. Use locked/production rules. The included `firestore.rules` denies browser access; the backend uses IAM. Apply the included rules and index exclusions through the Firebase console/CLI if your project has Firebase configured. Do not enable public read/write rules. The Node backend never uses a Firebase client key.

Optional CLI deployment of the supplied Firestore configuration, after installing and authenticating the Firebase CLI:

```bash
firebase deploy --only firestore --project "$ZICO_PROJECT"
```

The exclusions prevent large HTML and payload fields from being indexed. They are recommended before importing a real campaign library. No compound indexes are required by the current queries.

## 4. Create the contact worksheet

1. Create a **new, empty Google Sheet** in your browser. Name it `Zicounsels Email Contacts`.
2. Click Share. Give **Editor** access to `zico-runtime@YOUR_ACTUAL_PROJECT_ID.iam.gserviceaccount.com`.
3. Copy the spreadsheet ID: the part between `/d/` and `/edit` in its browser URL. This is `SHEET_ID`; it is not the worksheet tab name.
4. Keep the Sheet restricted to the service account and necessary company administrators.
5. The app’s **Setup & help → Initialize worksheet** button creates the Contacts tab and exact headers after login. Do not rename those headers or sort only part of the table. Use app imports for new contacts so IDs and created dates are correct.

No existing company workbook needs to be replaced. The initializer refuses a Contacts tab with different headers.

## 5. Create the Google sign-in client

In Google Cloud Console, open **Google Auth Platform** (or APIs & Services → Credentials, depending on the console layout).

1. Configure the consent screen with the app name and support email. Use Internal only if every staff account belongs to your Google Workspace organization; otherwise use External and the appropriate testing/publishing configuration.
2. Create an OAuth client of type **Web application**.
3. Add your exact Vercel production origin under **Authorized JavaScript origins**. For local development, also add `http://localhost:8080`.
4. Copy the client ID ending in `.apps.googleusercontent.com`.
5. This app uses Google Identity Services ID tokens, not Drive OAuth scopes or the Gmail API. A client secret is not used in the frontend.
6. Only addresses in the backend `STAFF_ROLES` object can use protected API routes. Creating a Google account or signing in alone does not grant access.

## 6. Prepare email delivery

1. Create a Resend account and add a domain or sending subdomain you control, for example `mail.yourcompanydomain.com`.
2. Add the exact DNS records shown by Resend and wait for verification. Configure DKIM and SPF using those provider instructions; have your domain administrator configure DMARC appropriately for your organization.
3. Choose a From address on the verified domain and a monitored Reply-To address. Do not use an ordinary `@gmail.com` From address.
4. Create an API key permitted to send from the domain, then store it without echoing it:

```bash
bash scripts/set-secret.sh zico-resend
```

5. Create the unsubscribe signing secret once. Keep it for the lifetime of existing unsubscribe links. Do not regenerate it on each deployment.

```bash
openssl rand -hex 32 | tr -d '\n' | gcloud secrets versions add zico-unsubscribe --data-file=-
```

6. The webhook URL is not known until the first deployment. Add an initial placeholder secret version, then replace it with the real signing secret in step 9. Delivery stays disabled during setup.

```bash
printf '%s' 'pending-webhook-configuration' | gcloud secrets versions add zico-webhook --data-file=-
```

## 7. Configure and deploy the API

Create `deploy.env.yaml` in Cloud Shell, inside the app folder. Use the editor to paste the following and replace every example. This file is excluded from Git and the container. The true API URL is filled after the first deployment.

```yaml
NODE_ENV: "production"
GOOGLE_CLOUD_PROJECT: "YOUR_ACTUAL_PROJECT_ID"
SHEET_ID: "YOUR_SPREADSHEET_ID"
GOOGLE_CLIENT_ID: "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com"
APP_ORIGIN: "https://YOUR_ACTUAL_VERCEL_DOMAIN"
PUBLIC_APP_URL: "https://YOUR_ACTUAL_VERCEL_DOMAIN"
PUBLIC_API_URL: "https://setup.invalid"
SCHEDULER_EMAIL: "zico-scheduler@YOUR_ACTUAL_PROJECT_ID.iam.gserviceaccount.com"
STAFF_ROLES: '{"your.actual.admin@gmail.com":"admin","your.actual.editor@gmail.com":"editor"}'
FROM_EMAIL: "Zicounsels <hello@mail.yourcompanydomain.com>"
REPLY_TO: "your.monitored.address@yourcompanydomain.com"
POSTAL_ADDRESS: "YOUR ACTUAL COMPANY POSTAL ADDRESS"
SEND_ENABLED: "false"
```

Use real authorized staff emails; the names here are examples. Available roles are `admin`, `editor`, `viewer`. Editors draft and manage contacts; admins approve, test and manage automations. All staff can see the audience list; only admins can see HR campaigns. This is not a clinical HR-record system.

```bash
bash scripts/deploy-api.sh
```

Deployment may take several minutes. Cloud Run must allow public network access because Google-signed staff tokens, Resend webhooks and public unsubscribe pages use different authentication methods. Protected routes validate credentials inside the app. `/tasks/tick` accepts only a Google ID token for the specified scheduler service account. Never remove those route checks.

Copy the actual Cloud Run service URL printed by deployment. Set `PUBLIC_API_URL` to that URL in `deploy.env.yaml`, without a trailing slash. Run the deploy script again.

If the source build reports missing builder permissions, confirm `zico-builder` has `roles/run.builder` and your deployer can act as that service account. The script uses a dedicated build identity rather than a default account. IAM changes can take a few minutes to propagate.

## 8. Connect Vercel to the API

Edit `public/config.js` in GitHub:

```javascript
window.ZICO_CONFIG = {
  apiUrl: "YOUR_ACTUAL_CLOUD_RUN_SERVICE_URL",
  googleClientId: "YOUR_ACTUAL_WEB_CLIENT_ID.apps.googleusercontent.com"
};
```

Commit. Vercel redeploys the frontend. These two values are public; no secrets belong in this file. Vercel environment variables are **not** automatically inserted into this plain HTML/JS app. Edit this file instead.

Open the production Vercel URL, sign in with an allowed admin address and open **Setup & help → Initialize worksheet**. On a brand-new Sheet, the first dashboard refresh may report missing headers; the setup button is available even before dashboard data loads. Click Refresh after initialization.

If sign-in is missing, check `config.js`, your browser’s network access to Google and the exact OAuth origin. If API calls fail, confirm APP_ORIGIN matches the frontend origin and GOOGLE_CLIENT_ID matches both places. Redeploy Cloud Run after changing its environment, and Vercel after editing frontend files.

## 9. Connect delivery events

In the Resend dashboard, create a webhook pointing to:

`YOUR_ACTUAL_CLOUD_RUN_SERVICE_URL/webhooks/resend`

Select `email.delivered`, `email.bounced`, `email.complained`, `email.clicked`, `email.sent`, and optionally `email.opened`, `email.failed`, `email.delivery_delayed`. Enable click tracking in Resend if you want click reports; tracking has privacy implications and should match your notices. The app does not treat open tracking as reliable evidence of reading.

Copy the webhook signing secret and save it:

```bash
bash scripts/set-secret.sh zico-webhook
bash scripts/deploy-api.sh
```

The redeploy refreshes environment-bound secret versions. An invalid signature is rejected. Provider delivery events update reports; bounces and complaints suppress future sends. Previously suppressed addresses cannot be reactivated by reimporting them.

## 10. Run a controlled first test

1. Import **only your own staff email** using Audience → Import contacts. Download the blank CSV format first.
2. Record truthful `consent=yes`, consent date and source for your own test. Add a unique tag such as `staff-test`.
3. Choose a simple welcome template. Fill all links with real HTTPS destinations, select tag `staff-test`, and save a draft for a future time during 7 am–10 pm WAT.
4. Keep every automation paused. Change `SEND_ENABLED` to `"true"` in `deploy.env.yaml` and redeploy. Merely enabling this switch does not approve a draft.
5. In Campaigns → Review, run **Check audience & values**. Confirm one recipient. Use **Send test to me**. This sends a real email only to the signed-in admin.
6. Check Gmail and another supported client if available. Open links, inspect mobile layout, verify From and Reply-To, confirm the footer, and inspect the Resend delivery record.
7. Approve the one-recipient campaign. Without a scheduler yet, its status is Queuing; no background delivery occurs until step 11.

## 11. Create the scheduler

```bash
bash scripts/create-scheduler.sh
```

The scheduler calls `/tasks/tick` every minute with an OIDC token whose audience is the exact Cloud Run URL. The job creator must have permission to act as `zico-scheduler`. The Cloud Scheduler service agent must retain its normal service-agent role to mint tokens. Do not use an API key or a staff Google token for this job.

If the named job already exists, edit that exact job in Cloud Scheduler instead of creating another. Confirm URI, OIDC service account and audience. Use **Force run** for the one-recipient test. Allow one to several ticks for campaign expansion and delivery.

Verify the scheduled email is accepted once, then appears as delivered through the webhook. Test unsubscribe, schedule another message to the same contact, and verify it is suppressed. Check a non-admin account cannot approve campaigns. Complete [VERIFICATION.md](VERIFICATION.md) before importing a real list.

The worker sends sequentially with a small delay; it is not a guarantee of an exact-second send. Quiet hours, frequency caps, provider throttling, backlog and Cloud Scheduler retries can defer delivery.

## 12. Daily operation and updates

Use [STAFF-GUIDE.md](STAFF-GUIDE.md). Keep campaign content in the app and contacts in the worksheet; direct Firestore edits are an administrator recovery task. New frontend commits redeploy Vercel. Backend source changes also require rerunning `scripts/deploy-api.sh` from the updated Cloud Shell checkout.

To stop all sending quickly, set SEND_ENABLED to false and redeploy; also pause the Scheduler job. Messages already accepted by the provider cannot be recalled. Keep the API online so unsubscribe links and webhooks still work.

Back up Sheets and Firestore before upgrades. Enable Firestore backup/PITR if it matches your budget and retention policy. Decide how long to keep content, delivery events and contact data. Do not delete suppression records as a routine cleanup: doing so can allow opted-out addresses to receive mail again. Deletion requests should remove contact details and job payloads while preserving an appropriate minimal suppression mechanism under your approved retention policy.

## Troubleshooting

| What you see | Check or action |
|---|---|
| No Google sign-in button | config.js client ID, Google script loading, exact authorized origin |
| API 401 | Token expired or wrong client ID; sign in again |
| API 403 | Staff email is absent from STAFF_ROLES, role is insufficient, or email is unverified |
| Sheet permission denied | Share with zico-runtime, not builder, scheduler or your Gmail address |
| Sheet headers mismatch | Use a new empty Sheet or restore exact headers; do not overwrite unrelated data |
| Queuing stays unchanged | SEND_ENABLED, Scheduler job history and Cloud Run logs |
| Scheduled but not sent | WAT quiet hours, two-per-seven-day cap, permission, suppression, audience tag and backlog |
| Delivery shows accepted but not delivered | Provider acceptance differs from delivery; check signed webhook and provider log |
| Job is review | Outcome became uncertain beyond the safe retry window; inspect provider logs by the job ID/idempotency key before resending |
| Webhook 401 | Use the webhook signing secret, not API key; redeploy after secret version update |
| Scheduler 401 | Exact PUBLIC_API_URL and OIDC audience; scheduler service-account email; no trailing slash mismatch |
| Cloud deployment says NOT_FOUND | Confirm project, created accounts, enabled APIs and secret versions |
| logo missing in inbox | Public Vercel image URL must load without authentication; some clients block images by default |

## Official references checked during preparation

- Cloud Run source deployment: https://docs.cloud.google.com/run/docs/deploying-source-code
- Build service accounts: https://docs.cloud.google.com/run/docs/configuring/services/build-service-account
- Scheduler OIDC: https://docs.cloud.google.com/scheduler/docs/http-target-auth
- Google ID-token verification: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
- Firestore transactions: https://firebase.google.com/docs/firestore/manage-data/transactions
- Resend idempotency retention: https://resend.com/changelog/idempotency-keys
- Resend webhook setup: https://resend.com/docs/dashboard/webhooks/introduction
- Vercel project configuration: https://vercel.com/docs/project-configuration

Console wording and provider limits can change. Use the provider’s current dashboard for account quotas and DNS values rather than copying fixed values from another account.
