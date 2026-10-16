#!/usr/bin/env bash
set -euo pipefail
ZICO_SECRET="${1:?Supply zico-resend or zico-webhook}"
case "$ZICO_SECRET" in zico-resend|zico-webhook) ;; *) printf 'Unsupported secret name\n' >&2; exit 1;; esac
read -r -s -p "Paste the value for $ZICO_SECRET (hidden): " ZICO_VALUE
printf '\n'
printf '%s' "$ZICO_VALUE" | gcloud secrets versions add "$ZICO_SECRET" --data-file=-
unset ZICO_VALUE
