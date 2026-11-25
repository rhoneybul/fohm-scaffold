# Slack pings

The team hears about the app in Slack, the way Naz's and Etapa's teams do: the whole funnel, from the app downloaded to signing up, a program and a payment.
Off until `SLACK_WEBHOOK_URL` is set.

## One channel for every app

Every app the business runs posts to one channel (a single "fohm" channel for all of them), so every line starts with the app's name in bold.
The webhook is set once, as a Vercel **team** shared variable, `SLACK_WEBHOOK_URL` (Sensitive), and Set up app links it to each app's project as it does `ANTHROPIC_API_KEY` (`SHARED_ENV`'s default in `scripts/setup-app.mjs`).
A kind of ping can have a channel of its own: `SLACK_SIGNUPS_WEBHOOK_URL` (downloads and sign-ups), `SLACK_PROGRAMS_WEBHOOK_URL` (programs started and built) and `SLACK_PAYMENTS_WEBHOOK_URL` (Pro), each falling back to `SLACK_WEBHOOK_URL`.

| Ping | Channel | Reads |
| -- | -- | -- |
| A phone app's first launch | signups | *Trail* · New download — iPhone app (1.2.0, build 34) |
| A new account | signups | *Trail* · New sign-up — kai@example.com (Google) |
| A program started | programs | *Trail* · Program started — kai@example.com — Haute Route — 8 weeks, 3 a week |
| A program built | programs | *Trail* · Program ready — kai@example.com — Haute Route — 24 sessions / 8 wks — 41s · `haiku-5-5` |
| A program that didn't build | programs | *Trail* · Program FAILED — kai@example.com — `the reason` — after 52s |
| Pro started | payments | *Trail* · Pro started — kai@example.com |
| Pro renewed | payments | *Trail* · Pro renewed — kai@example.com — until 2027-01-31 |
| Pro cancelled | payments | *Trail* · Pro cancelled — kai@example.com — ends 2027-01-31 |
| Pro ended | payments | *Trail* · Pro ended — kai@example.com |

## How it works

- **The lines** are `api/_lib/pings.ts`: pure, and tested line by line in `tests/slack.test.ts`.
  Every value a member or a store sent is escaped and cut to one line, so nothing can mention @channel, dress up a link or add a line.
  Nothing a member typed goes in beyond their email: never a name, a note or an answer.
- **Sending** is `api/_lib/slack.ts`, from Naz's `server/slack.js`.
  A ping is sent after the request is answered (`ping()`, through Vercel's `waitUntil`), and never fails it.
  A 5xx or a dropped connection is tried once more; the same ping twice in five minutes is sent once; nothing throws.
  With no webhook the logs say `[slack] signups ping not sent: no webhook` once for each channel.
- **Sign-ups**: `api/accounts.ts`, as the account is made, with how (email, Google or Apple, from Supabase's provider).
- **Downloads**: the iOS and Android apps call `POST /api/downloads` once, on their first launch (`src/lib/downloaded.native.ts`), with the platform, version and build: nothing about the person.
  An app used before this shipped has keys in its storage already, so it's marked without a ping; one that couldn't be sent is sent on the next launch.
  Anyone could call it, so the API takes one an hour from an address and 60 an hour in all, held in memory only.
  The web app has no download.
- **Pro**: `api/stripe-webhook.ts`, from the subscription as Stripe has it: started; renewed when its period moves on by a day or more; cancelled the moment it's set to end (Stripe's `previous_attributes` say it wasn't before); ended.
- **Programs**: an app that builds programs (`docs/PROGRAMS.md`) pings from its builder with `programStartedPing` when a member asks for one, and `programBuiltPing` when it's ready or failed, with the reason and how many seconds it took (Strawberry Fields' `api/programs.ts`).

`GET /api/health` says `"slack": true` once a webhook is set, never its URL, and the dashboard's Settings lists it.

## Privacy

The pings are the business talking to itself about its own members: the email and what they did go to the business's own Slack, which is internal, so `privacy()` in `src/lib/legal.ts` needs no change.
If the business would rather say so, Slack goes in the list of services it uses.

## Switching it on

The person, once for every app (the app-launch skill's `reference/slack.md`):

1. Make the channel in the business's Slack.
2. In the business's Slack app (api.slack.com/apps), turn on Incoming Webhooks and add one for that channel.
3. Paste its URL into Vercel as the team's shared variable `SLACK_WEBHOOK_URL`, Sensitive, linked to the app's project: never in the repo or a chat.
4. Run Set up app (it links it), redeploy, and check that `curl -s https://<domain>/api/health | jq .integrations.slack` is `true`.
