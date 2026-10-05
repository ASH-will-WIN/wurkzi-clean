# Notifications and email verification setup

## SMS

Set these server environment variables:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_MESSAGING_SERVICE_SID` (recommended), or `TWILIO_PHONE_NUMBER`
- `PUBLIC_API_URL` (the public API base URL, used for signed Twilio callbacks)
- `CLIENT_URL` (the public web app base URL used in notification links)

Set the Twilio Messaging Service inbound request URL to
`https://<your-api-host>/api/webhooks/twilio/inbound`. Outbound messages include
the delivery callback URL automatically when `PUBLIC_API_URL` is set. The
inbound handler records STOP and START requests and verifies Twilio signatures.

SMS is queued only for profiles with recorded opt-in consent. Users can turn
alerts off in the notification bell, or reply STOP to opt out. After a keyword
opt-out, reply START to a Wurkzi text before enabling alerts in the app again.

## Email confirmation

In Supabase Auth URL Configuration, allow `${CLIENT_URL}/verify-email` as a
redirect URL. Signup and resend links redirect there.

## Database

Apply the migration under `prisma/migrations/20261005000000_add_notifications_and_job_incentives`
before starting the updated server. The server starts the SMS outbox and
incentive retry workers automatically.
