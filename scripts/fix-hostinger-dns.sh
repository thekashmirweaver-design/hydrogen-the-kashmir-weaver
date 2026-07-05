#!/usr/bin/env bash
# Fix thekashmirweaver.shop DNS at Hostinger via API (third-party DNS; Shopify CLI cannot change this).
# Requires: HOSTINGER_API_TOKEN from hPanel → Profile → API (https://hpanel.hostinger.com/profile/api)
# Usage:
#   export HOSTINGER_API_TOKEN='...'
#   ./scripts/fix-hostinger-dns.sh list
#   ./scripts/fix-hostinger-dns.sh apply-shopify
set -euo pipefail

DOMAIN="${DOMAIN:-thekashmirweaver.shop}"
API_BASE="${HOSTINGER_API_BASE:-https://developers.hostinger.com}"
TOKEN="${HOSTINGER_API_TOKEN:-}"

if [[ -z "${TOKEN}" ]]; then
  echo "Missing HOSTINGER_API_TOKEN. Create a token in Hostinger hPanel → Profile → API." >&2
  exit 1
fi

auth_header=(-H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json")

cmd="${1:-}"
case "${cmd}" in
  list)
    curl -sS "${API_BASE}/api/dns/v1/zones/${DOMAIN}" "${auth_header[@]}" | (command -v jq >/dev/null && jq . || cat)
    ;;
  apply-shopify)
    # Shopify Hydrogen/Oxygen apex + www for third-party DNS (see Admin → Domains for your store's exact targets).
    body=$(cat <<EOF
{
  "overwrite": true,
  "zone": [
    {
      "name": "@",
      "type": "A",
      "ttl": 14400,
      "records": [{ "content": "23.227.38.65" }]
    },
    {
      "name": "www",
      "type": "CNAME",
      "ttl": 14400,
      "records": [{ "content": "shops.myshopify.com" }]
    }
  ]
}
EOF
)
    curl -sS -X PUT "${API_BASE}/api/dns/v1/zones/${DOMAIN}" "${auth_header[@]}" -d "${body}" | (command -v jq >/dev/null && jq . || cat)
    echo ""
    echo "After apply, verify authoritative DNS (may take a few minutes):"
    echo "  dig @helios.dns-parking.com ${DOMAIN} A +short"
    echo "  dig @helios.dns-parking.com www.${DOMAIN} CNAME +short"
    ;;
  *)
    echo "Usage: $0 list|apply-shopify" >&2
    exit 1
    ;;
esac
