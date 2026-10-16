#!/usr/bin/env bash
set -euo pipefail
: "${ZICO_PROJECT:?Set ZICO_PROJECT to your project ID}"
ZICO_REGION="${ZICO_REGION:-europe-west1}"
gcloud config set project "$ZICO_PROJECT"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com firestore.googleapis.com sheets.googleapis.com secretmanager.googleapis.com cloudscheduler.googleapis.com iam.googleapis.com
for ZICO_SA in zico-runtime zico-builder zico-scheduler; do
  if ! gcloud iam service-accounts describe "$ZICO_SA@$ZICO_PROJECT.iam.gserviceaccount.com" >/dev/null 2>&1; then
    gcloud iam service-accounts create "$ZICO_SA" --display-name="$ZICO_SA"
  fi
done
gcloud projects add-iam-policy-binding "$ZICO_PROJECT" --member="serviceAccount:zico-runtime@$ZICO_PROJECT.iam.gserviceaccount.com" --role=roles/datastore.user --condition=None >/dev/null
gcloud projects add-iam-policy-binding "$ZICO_PROJECT" --member="serviceAccount:zico-builder@$ZICO_PROJECT.iam.gserviceaccount.com" --role=roles/run.builder --condition=None >/dev/null
if ! gcloud firestore databases describe --database='(default)' >/dev/null 2>&1; then
  gcloud firestore databases create --database='(default)' --location="$ZICO_REGION" --type=firestore-native
fi
for ZICO_SECRET in zico-resend zico-webhook zico-unsubscribe; do
  if ! gcloud secrets describe "$ZICO_SECRET" >/dev/null 2>&1; then
    gcloud secrets create "$ZICO_SECRET" --replication-policy=automatic
  fi
  gcloud secrets add-iam-policy-binding "$ZICO_SECRET" --member="serviceAccount:zico-runtime@$ZICO_PROJECT.iam.gserviceaccount.com" --role=roles/secretmanager.secretAccessor >/dev/null
done
printf '\nCloud resources prepared. Next: share your Sheet with zico-runtime@%s.iam.gserviceaccount.com and follow docs/DEPLOYMENT.md.\n' "$ZICO_PROJECT"
