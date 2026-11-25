# Email (Resend)

Optional; off until its key is set.

**Why.** New members get a welcome, owners hear when someone writes, members hear when they get a reply, and sign-up and password emails come from the app's own domain instead of Supabase's, which sends only a few an hour.
Each is HTML in the app's colours with a plain-text twin (`api/_lib/emails.ts`).

## What the agent does

- Writes the DNS records into the checklist page from what Resend shows, and adds them itself where the domain is on Vercel (the Vercel connector's `create_record`).
- Sets `EMAIL_FROM` in Vercel: `"<App> <<support email>>"`.
- Checks DMARC and delivery (below).

## What is the person's

- resend.com → Domains → Add domain: `<domain>`.
  At the registrar, add the records Resend shows: the DKIM TXT record (`resend._domainkey`), and the MX and SPF TXT records on its send subdomain.
  Resend verifies the domain once they're in (minutes to an hour).
- Add a DMARC record too, so Gmail and Yahoo deliver it: TXT at `_dmarc.<domain>` with `v=DMARC1; p=none; rua=mailto:<support email>` (tighten to `p=quarantine` once mail has gone out cleanly for a few weeks).
  Keep one SPF record per name: if the domain already has one (a mailbox provider's), merge them.
- API Keys → create one (Sending access); in Vercel: `RESEND_API_KEY` (Sensitive).
- Sign-up and password emails: Supabase → Authentication → Emails → SMTP Settings → on, host `smtp.resend.com`, port 465, username `resend`, password: a Resend API key, sender `<support email>`, sender name `<App>`.
  Then Rate Limits: raise the emails an hour (Supabase's own mail allows only a few).
- Supabase → Authentication → Emails → Templates: for Confirm sign up, Reset password, Magic link, Change email address and Invite user, paste the matching file from `supabase/templates/` (confirmation, recovery, magic_link, email_change, invite), with subjects like "Confirm your <App> account" and "Choose a new <App> password".
- Supabase → Authentication → URL Configuration: Site URL `https://<domain>`, so the links in those emails come back to the app.
- Redeploy.

## How to check it

- `curl -s https://<domain>/api/health | jq .integrations.email` is `true`; otherwise set `RESEND_API_KEY` and `EMAIL_FROM`.
- `dig +short TXT _dmarc.<domain>` shows a record starting `v=DMARC1`; without one, Gmail and Yahoo may junk it.
- `dig +short TXT resend._domainkey.<domain>` shows the DKIM key.
