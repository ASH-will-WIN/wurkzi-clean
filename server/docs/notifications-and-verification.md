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

## One-time phone verification

Create a **Verify Service** in the Twilio Console and set its Service SID as
`TWILIO_VERIFY_SERVICE_SID` on the server. The existing `TWILIO_ACCOUNT_SID`
and `TWILIO_AUTH_TOKEN` credentials are reused. This is separate from the
Messaging Service SID used for notification texts. Configure Verify Service
rate limits and Fraud Guard in Twilio to reduce unwanted code requests.

New signups must request a code and submit the valid code with registration.
The server records the verified timestamp on the profile; users are not asked
for another code at each login. Verification codes expire after Twilio's
verification window. The signup SMS is a security code and is separate from
the optional job-notification SMS consent.

## Email confirmation

In Supabase Auth URL Configuration, allow `${CLIENT_URL}/verify-email` as a
redirect URL. Signup and resend links redirect there.

## Database

Apply all pending Prisma migrations before starting the updated server. The
phone-verification migration adds a nullable verification timestamp for each
profile; existing profiles are left unverified and are not required to enter a
code at every login.

The server starts the SMS outbox and incentive retry workers automatically.
