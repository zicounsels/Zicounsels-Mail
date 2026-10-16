#!/usr/bin/env bash
set -euo pipefail
: "${ZICO_PROJECT:?Set ZICO_PROJECT first}"
ZICO_REGION="${ZICO_REGION:-europe-west1}"
ZICO_API_URL="$(gcloud run services describe zicounsels-mail --project="$ZICO_PROJECT" --region="$ZICO_REGION" --format='value(status.url)')"
gcloud scheduler jobs create http zicounsels-mail-tick --project="$ZICO_PROJECT" --location="$ZICO_REGION" --schedule='* * * * *' --time-zone='Africa/Lagos' --uri="$ZICO_API_URL/tasks/tick" --http-method=POST --oidc-service-account-email="zico-scheduler@$ZICO_PROJECT.iam.gserviceaccount.com" --oidc-token-audience="$ZICO_API_URL" --attempt-deadline=300s
