# Continue with Google

Optional; off until Supabase's Google provider is on.

**Why.** One tap to sign up on the web.
The button shows on the web sign-in page; the apps use email for now.

## What the agent does

- Writes the exact values below into the checklist page with the domain and project ref filled in.

## What is the person's

- Google Cloud Console → Google Auth Platform: Branding (name, support email, home page, privacy `https://<domain>/privacy`, terms `https://<domain>/terms`, authorised domains `<domain>` and `supabase.co`); Audience: External; Data access: openid, email, profile only.
- Clients → Create client → Web application: JavaScript origin `https://<domain>`; redirect URI `https://<project ref>.supabase.co/auth/v1/callback`.
- Audience → Publish app.
- Supabase → Authentication → Sign In / Providers → Google: on, paste the client ID and secret.

## How to check it

- `curl -s https://<domain>/api/health | jq .integrations.google` is `true`.
