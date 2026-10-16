#!/usr/bin/env bash
set -euo pipefail
: "${ZICO_PROJECT:?Set ZICO_PROJECT first}"
ZICO_REGION="${ZICO_REGION:-europe-west1}"
if [[ ! -f deploy.env.yaml ]]; then printf 'Create deploy.env.yaml from the guide first.\n' >&2; exit 1; fi
gcloud run deploy zicounsels-mail --project="$ZICO_PROJECT" --region="$ZICO_REGION" --source=. --service-account="zico-runtime@$ZICO_PROJECT.iam.gserviceaccount.com" --build-service-account="projects/$ZICO_PROJECT/serviceAccounts/zico-builder@$ZICO_PROJECT.iam.gserviceaccount.com" --allow-unauthenticated --concurrency=20 --max-instances=2 --timeout=300 --memory=512Mi --env-vars-file=deploy.env.yaml --set-secrets='RESEND_API_KEY=zico-resend:latest,RESEND_WEBHOOK_SECRET=zico-webhook:latest,UNSUBSCRIBE_SECRET=zico-unsubscribe:latest'
