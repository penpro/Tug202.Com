#!/usr/bin/env bash
# Custom MAIL FROM for tug202.org: makes SPF align with the From: domain, so
# our mail passes both checks instead of leaning on DKIM alone. Strict
# providers (Outlook/Hotmail especially) weigh that.
#
# Run in AWS CloudShell, region us-east-1:
#   curl -fsSL https://raw.githubusercontent.com/penpro/Tug202.Com/main/ops/ses-mailfrom-setup.sh | bash
#
# Creates mail.tug202.org (MX + SPF TXT) in Route 53 and points SES at it.
# Idempotent. Verification takes a few minutes; re-run to see the status.
set -euo pipefail
export AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION:-us-east-1}
export AWS_PAGER=""
DOMAIN=tug202.org
SUB=mail.$DOMAIN
REGION=$AWS_DEFAULT_REGION

ZONE=$(aws route53 list-hosted-zones-by-name --dns-name "$DOMAIN." \
  --query "HostedZones[?Name=='$DOMAIN.'].Id | [0]" --output text | sed 's|/hostedzone/||')
[ -n "$ZONE" ] && [ "$ZONE" != "None" ] || { echo "No Route 53 hosted zone for $DOMAIN" >&2; exit 1; }
echo "== hosted zone $ZONE"

echo "== DNS for $SUB (MX + SPF)"
aws route53 change-resource-record-sets --hosted-zone-id "$ZONE" --change-batch "{
  \"Comment\": \"SES custom MAIL FROM\",
  \"Changes\": [
    {\"Action\":\"UPSERT\",\"ResourceRecordSet\":{\"Name\":\"$SUB\",\"Type\":\"MX\",\"TTL\":600,
      \"ResourceRecords\":[{\"Value\":\"10 feedback-smtp.$REGION.amazonses.com\"}]}},
    {\"Action\":\"UPSERT\",\"ResourceRecordSet\":{\"Name\":\"$SUB\",\"Type\":\"TXT\",\"TTL\":600,
      \"ResourceRecords\":[{\"Value\":\"\\\"v=spf1 include:amazonses.com ~all\\\"\"}]}}
  ]}" --query 'ChangeInfo.Status' --output text | sed 's/^/   /'

echo "== telling SES to use it"
aws sesv2 put-email-identity-mail-from-attributes --email-identity "$DOMAIN" \
  --mail-from-domain "$SUB" --behavior-on-mx-failure USE_DEFAULT_VALUE
echo "   set (SES verifies the MX within a few minutes)"

echo "== status"
aws sesv2 get-email-identity --email-identity "$DOMAIN" \
  --query '{mailFrom:MailFromAttributes.MailFromDomain,status:MailFromAttributes.MailFromDomainStatus,dkim:DkimAttributes.Status,verified:VerifiedForSendingStatus}' --output table

echo
echo "PENDING is normal; re-run this in ~10 minutes and it should say SUCCESS."
echo "Nothing on the server changes — SES rewrites the envelope sender itself."
