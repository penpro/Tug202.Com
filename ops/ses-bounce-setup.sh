#!/usr/bin/env bash
# One-shot SES bounce/complaint tracking + production-access request.
# Run in AWS CloudShell (console → terminal icon top-right), region us-east-1:
#   curl -fsSL https://raw.githubusercontent.com/penpro/Tug202.Com/main/ops/ses-bounce-setup.sh | bash
# Idempotent: safe to re-run. Nothing here touches the EC2 box; after it
# finishes, set SES_CONFIG_SET=tug202 in backend/.env (see email-setup.md §7).
set -euo pipefail
export AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION:-us-east-1}
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
echo "Done. Now on the EC2 box:"
echo "  echo SES_CONFIG_SET=$SET >> ~/Tug202.Com/backend/.env && pm2 restart tug202-backend --update-env"
