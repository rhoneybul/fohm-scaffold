# The owner's account

**Why.** The dashboard is how the owner sees everything people do.

## What the agent does

- Tells the person the `OWNER_CODE` goes in Vercel, never in the chat ([vercel.md](vercel.md)).
- In demo mode, shows the dashboard: a second account ticking "I run ..." with the code `change-me`.

## What is the person's

- On the live site: Get started, choose "I run ...", enter the `OWNER_CODE`, then open `/admin`.
- Other coaches? Give them `COACH_CODE`: they sign up as "A coach here", and the owner assigns members to them from each member's page (each coach sees only their own).
- The dashboard's People shows when each person was last in the app and on what (the web, iPhone or Android, and the app's version); Settings shows which integrations are on.
- Sign up as a member on a phone and walk the whole path once before real people use it.

## How to check it

- The person can open `https://<domain>/admin`; Settings lists the integrations `/api/health` reports.
