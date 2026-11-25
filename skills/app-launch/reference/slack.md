# Slack pings for the team

Optional; off until its webhook is set.

**Why.** The team hears each step of the funnel as it happens, the way Naz's and Etapa's do: a phone app downloaded, a sign-up, a program started and built (or failed, and why), and Pro started, renewed, cancelled or ended.
Every app the business runs posts to one channel, each line starting with the app's name, so one webhook set once covers every app.

## What the agent does

- Knows what's built (the template's `docs/SLACK.md`): the lines in `api/_lib/pings.ts`, sent by `api/_lib/slack.ts` after the answer, one retry, the same ping in five minutes once, never failing a request; downloads from `src/lib/downloaded.native.ts`.
- With Doppler ([doppler.md](doppler.md)): the webhook lives once in `shared/prd`, and Set up app references it from the app's project (`${shared.prd.SLACK_WEBHOOK_URL}`) and syncs it to Vercel; the launch check names the reference.
- Without Doppler, with the **Vercel** connector, checks the team has the shared variable `SLACK_WEBHOOK_URL` and that it's linked to the app's project (`filter_project_envs` lists it by name, never its value); Set up app links it, as `SHARED_ENV`'s default.
- An app that builds programs pings from its builder (`docs/PROGRAMS.md`, *Telling the team*).
- Says in the app's `docs/SLACK.md` that the pings are internal, so the privacy policy needs no change.
- Never asks for the webhook's URL: anyone holding it can post to the channel.

## What is the person's

Once for the business, not once an app:

1. **The channel**: in the business's Slack, a channel for every app (for example `#fohm`). Set its message retention to a year if the privacy policy says how long such things are kept.
2. **The webhook**: api.slack.com/apps → the business's Slack app (or Create New App → From scratch) → Incoming Webhooks → on → Add New Webhook to Workspace → the channel → Allow. Copy the URL it shows.
3. **Doppler**: the `shared` project → `prd` → `SLACK_WEBHOOK_URL`, pasted there and nowhere else: never in a chat, an issue or the repository ([doppler.md](doppler.md)).
   Without Doppler: the Vercel team → Settings → Environment Variables → shared → `SLACK_WEBHOOK_URL`, Sensitive, Production (and Preview only if previews should ping too).
4. Run Set up app (it references the key from the app's Doppler project and syncs it, or without Doppler links the shared variable to the app's project), then redeploy.

A kind of ping can go to a channel of its own with a webhook in the app's own project: `SLACK_SIGNUPS_WEBHOOK_URL`, `SLACK_PROGRAMS_WEBHOOK_URL` or `SLACK_PAYMENTS_WEBHOOK_URL`.

## How to check it

- `npm run launch:check` shows *Reference to shared SLACK_WEBHOOK_URL* done in Doppler (or *Shared SLACK_WEBHOOK_URL* linked from the team) and *The team's Slack pings* on.
- `curl -s https://<domain>/api/health | jq .integrations.slack` is `true` after the redeploy.
- Sign up a test account on the live site: `*<App>* · New sign-up — … (email)` lands in the channel within seconds. When it doesn't, Vercel's logs for `/api/accounts` say `[slack]` and why.
