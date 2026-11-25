# An inbox for the support address

**Why.** The support address is on the landing page, the privacy policy and the store listings, and members, Apple and Google write to it: mail to it has to reach someone.

## What the agent does

- Sets `supportEmail` in `src/lib/brand.ts` (`new --support-email`; `hello@<domain>` by default once there's a domain).
- Says where the mail goes now, with the check below.

## What is the person's

- Forward `<support email>` to an inbox someone reads: registrars forward mail for free (Cloudflare Email Routing, Namecheap, Porkbun, Squarespace), or give it a mailbox (Google Workspace, Microsoft 365, Fastmail).
- Send it a test email from another account and check it arrives.

## How to check it

- `dig +short MX <domain>` lists where mail goes (or `curl -s -H 'accept: application/dns-json' 'https://cloudflare-dns.com/dns-query?name=<domain>&type=MX'`).
- No MX records (or a null MX, `0 .`): mail to it bounces. Set up forwarding or a mailbox, then check again.
- The domain doesn't exist yet: buy it ([domain.md](domain.md)), or correct `supportEmail`.
