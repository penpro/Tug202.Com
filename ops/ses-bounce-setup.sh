#!/usr/bin/env bash
# One-shot SES bounce/complaint tracking + production-access request.
# Run in AWS CloudShell (console → terminal icon top-right), region us-east-1:
#   curl -fsSL https://raw.githubusercontent.com/penpro/Tug202.Com/main/ops/ses-bounce-setup.sh | bash
# Idempotent: safe to re-run. Nothing here touches the EC2 box; after it
# finishes, set SES_CONFIG_SET=tug202 in backend/.env (see email-setup.md §7).
set -euo pipefail
export AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION:-us-east-1}
export AWS_PAGER=""   # no "less" prompt in CloudShell
TOPIC=tug202-ses-events
SET=tug202
ENDPOINT=https://tug202.org/api/ses/events

echo "== SNS topic $TOPIC"
ARN=$(aws sns create-topic --name "$TOPIC" --query TopicArn --output text)
echo "   $ARN"

echo "== HTTPS subscription -> $ENDPOINT"
SUB=$(aws sns list-subscriptions-by-topic --topic-arn "$ARN" --query "Subscriptions[?Endpoint=='$ENDPOINT'].SubscriptionArn" --output text)
if [ -z "$SUB" ] || [ "$SUB" = "None" ]; then
  aws sns subscribe --topic-arn "$ARN" --protocol https --notification-endpoint "$ENDPOINT" >/dev/null
  echo "   created; the server confirms it automatically"
else
  echo "   exists ($SUB)"
fi

echo "== SES configuration set $SET"
aws sesv2 get-configuration-set --configuration-set-name "$SET" >/dev/null 2>&1 \
  || aws sesv2 create-configuration-set --configuration-set-name "$SET" >/dev/null
echo "   ok"

echo "== event destination (bounces + complaints -> SNS)"
if aws sesv2 get-configuration-set-event-destinations --configuration-set-name "$SET" --query "EventDestinations[?Name=='sns']" --output text | grep -q .; then
  echo "   exists"
else
  aws sesv2 create-configuration-set-event-destination --configuration-set-name "$SET" --event-destination-name sns \
    --event-destination "{\"Enabled\":true,\"MatchingEventTypes\":[\"BOUNCE\",\"COMPLAINT\"],\"SnsDestination\":{\"TopicArn\":\"$ARN\"}}" >/dev/null
  echo "   created"
fi

echo "== event destination config (should list BOUNCE, COMPLAINT and the topic ARN above)"
aws sesv2 get-configuration-set-event-destinations --configuration-set-name "$SET" \
  --query "EventDestinations[].{name:Name,enabled:Enabled,events:MatchingEventTypes,topic:SnsDestination.TopicArn}" --output json

echo "== instance role: allow reading the SES suppression list (belt-and-braces bounce sync)"
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
POLICY_ARN="arn:aws:iam::$ACCOUNT:policy/tug202-ses-send"
if aws iam get-policy --policy-arn "$POLICY_ARN" >/dev/null 2>&1; then
  CUR=$(aws iam get-policy --policy-arn "$POLICY_ARN" --query Policy.DefaultVersionId --output text)
  if aws iam get-policy-version --policy-arn "$POLICY_ARN" --version-id "$CUR" --query PolicyVersion.Document --output json | grep -q ListSuppressedDestinations; then
    echo "   already granted"
  else
    # IAM keeps at most 5 versions; drop the oldest non-default if we're full.
    for v in $(aws iam list-policy-versions --policy-arn "$POLICY_ARN" --query "Versions[?IsDefaultVersion==\`false\`].VersionId" --output text | tr '\t' '\n' | tail -n +4); do
      aws iam delete-policy-version --policy-arn "$POLICY_ARN" --version-id "$v"; done
    aws iam create-policy-version --policy-arn "$POLICY_ARN" --set-as-default --policy-document \
      '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["ses:SendEmail","ses:SendRawEmail","ses:ListSuppressedDestinations","ses:GetSuppressedDestination"],"Resource":"*"}]}' >/dev/null
    echo "   granted (takes effect on the server within a minute)"
  fi
else
  echo "   policy tug202-ses-send not found — was step 4 of email-setup.md done under a different name?"
fi

echo "== SES suppression list (addresses that hard-bounced or complained, last 30 days)"
aws sesv2 list-suppressed-destinations --start-date "$(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%SZ)" --page-size 1000 \
  --query "length(SuppressedDestinationSummaries)" --output text | sed 's/^/   /'

echo "== SES account status"
aws sesv2 get-account --query '{production:ProductionAccessEnabled,quota24h:SendQuota.Max24HourSend,perSecond:SendQuota.MaxSendRate,review:Details.ReviewDetails.Status}' --output table

if [ "$(aws sesv2 get-account --query ProductionAccessEnabled --output text)" = "False" ]; then
  echo "== requesting production access"
  aws sesv2 put-account-details --production-access-enabled --mail-type TRANSACTIONAL \
    --website-url https://tug202.org --contact-language EN \
    --additional-contact-email-addresses wesleyaweaverjr@gmail.com \
    --use-case-description "Tug Comanche Historical Rescue Foundation, a Washington 501(c)(3) (EIN 39-5018917) that preserves the WWII tug Comanche (ATA-202 / WMEC-202). Mail from our website tug202.org: board-portal invitations and password resets, contact/volunteer form notifications, and occasional newsletters to people who signed up on paper boarding sheets or the website (a few hundred addresses, a few sends per month). Every message carries a one-click List-Unsubscribe header and an unsubscribe link. Bounces and complaints are delivered to an SNS webhook that permanently suppresses the address." \
    && echo "   submitted — AWS usually answers within 24 h (email to the account owner)" \
    || echo "   request failed or already pending; check SES → Account dashboard"
fi

echo
echo "Done. On the EC2 box (once): make sure backend/.env has SES_CONFIG_SET=$SET, then"
echo "  cd ~/Tug202.Com/backend && node scripts/blast.js sync-bounces 30"
echo "to pull the suppression list into the portal right away (it also runs hourly on its own)."
