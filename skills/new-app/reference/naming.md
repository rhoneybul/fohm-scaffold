# Naming the app

The name is decided before anything that's hard to change carries it: the App Store record, the bundle id, the Expo slug and the domain.
On the first app, a dozen jargon names were offered once, all were rejected, and a placeholder stuck: a naming round is worth the effort.

## 1. Ask the direction first

Ask in one message, before proposing anything:

- Which kind of name: evocative, not literal (Strava, Runna, Whoop); place-led (Naz, from Nazaré); coined (a new word); or descriptive (says what it does).
- Names they like, in any category, and why.
- What they dislike: jargon, puns, a sound, a letter, a word a competitor owns.
- Where it will be sold, so the trade mark check is in the right country.

## 2. Generate 12 to 15 candidates

- Across at least three of the styles above, so one round tests the direction too.
- Each short (one or two syllables is best), sayable, and spellable after hearing it once.
- Roomy enough for the product to grow: not tied to one feature, one sport's jargon or one city unless that's the point.
- Not a word a competitor's name already sounds like.

## 3. Check each one

- **Domains**: the Vercel connector's `get_bulk_availability` for `.com`, `.app` and `.co` (RDAP is often blocked in cloud sessions), with prices from `get_bulk_price`.
  Where RDAP answers: `curl -s -o /dev/null -w '%{http_code}' https://rdap.org/domain/<name>.com` (404 is free).
- **The stores**: search the App Store and Google Play for a clash, or the iTunes Search API: `curl -s 'https://itunes.apple.com/search?term=<name>&entity=software&limit=10' | jq -r '.results[].trackName'`.
- **Trade marks**, in the owner's country:
  - UK: https://trademarks.ipo.gov.uk/ipo-tmtext
  - US: https://tmsearch.uspto.gov/
  - EU: https://www.tmdn.org/tmview/ (EUIPO's TMview, which covers the national registers too)
  - A live mark in the same class (9 for apps, 41 for coaching and training) rules a name out; it's a flag, not legal advice.
- **Social handles**, where they matter to the business (Instagram, TikTok): the bare name or `<name>app`.
- **GitHub**: the repository name is free under the owner's account or organisation.

## 4. Show them on a decision page

Publish an Artifact (the artifact tools' design guidance first), one card a name:

- The name set in the house type (Space Grotesk 600), large, on the app's paper.
- The free domains with their prices; the taken ones struck through.
- Any store or trade mark clash, linked.
- One line of why: what it evokes and how it grows.

Order the strongest first, and say which you'd pick and why in a line at the top.

## 5. The owner picks

- They pick one, or ask for another round in a different direction: run steps 2 to 4 again in that direction, never the same list reworded.
- Never settle on a placeholder silently.
  If one is used to keep building, it goes on the checklist page as **Name not final**, and it blocks the App Store record (the app-launch skill's `reference/testflight.md` waits for it).
- Once chosen: `new --name "<Name>"` (or a rename in `app.json`, `src/lib/brand.ts` and `api/_lib/app.ts` before the first build), the Expo slug from it (`tide-pool`), and the bundle id from it and the domain (`com.tidepool.app`).
- The domain goes on the checklist under *Start these now*.
