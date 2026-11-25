# The domain

Start early: it takes minutes, but names go quickly.

**Why.** The landing page, the web app, sign-in links and email all live on it, and the stores link to its privacy policy.
Names go quickly: buy it before announcing the name.

## What the agent does

- Proposes five to ten short, sayable names from the idea, and checks each before the person falls for one.
- Checks a name with RDAP, the registries' own lookup: `curl -s -o /dev/null -w '%{http_code}' https://rdap.org/domain/<name>.com` (404 means nobody has it; check `.com`, `.app` and `.co`).
- A name that comes back "couldn't check" (a cloud session's network often refuses rdap.org): checks it with Vercel's domain tools instead (`get_bulk_availability` through Claude's Vercel connector), or looks it up at a registrar.
- Checks the GitHub repository name too (the GitHub tools, or `gh repo view <owner>/<slug>`).
- Once it's bought, adds it to the Vercel project (Vercel connector: `add_project_domain`; see [vercel.md](vercel.md)).
- A domain other than the one the app was made for: changes `supportEmail` in `src/lib/brand.ts` (`hello@<domain>`?) and `extra.apiUrl` in `app.json` (`https://<domain>`) to match.

## What is the person's

- Already own it, or it will live on the business's own site (`app.their-domain.com`)? Then say which, and that's this step done.
- Buy `<domain>` from a registrar: Vercel (Domains → Buy, which sets up the DNS for you), Cloudflare, Namecheap, Porkbun or Squarespace.
- Buy it in the business's name, on an account the owner controls (not yours), so it stays theirs; turn on auto-renew and WHOIS privacy.
- Australia: a `.com.au` or `.au` needs the business's ABN or ACN, in a name that matches it: register the business first ([business.md](business.md)).
- Before announcing the name, search the trade mark register for apps or coaching already using it:
  - Australia: IP Australia, https://www.ipaustralia.gov.au
  - the UK: the UK IPO, https://www.gov.uk/search-for-trademark
  - the US: the USPTO, https://www.uspto.gov/trademarks/search
  - anywhere else: WIPO's Global Brand Database, https://branddb.wipo.int

## How to check it

- `curl -s -o /dev/null -w '%{http_code}' https://rdap.org/domain/<domain>` answers 200 once it's registered.
- `dig +short <domain>` (or DNS over HTTPS: `curl -s -H 'accept: application/dns-json' 'https://cloudflare-dns.com/dns-query?name=<domain>&type=A'`) shows an address once it points at Vercel.
