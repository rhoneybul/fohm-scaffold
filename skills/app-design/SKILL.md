---
name: app-design
description: Design an app made with fohm-scaffold in the house style shared with Naz and Etapa, from the owner's references, with lots of photos, and review it before the owner sees it. Use when designing, shaping or restyling screens, adding design references from Mobbin, choosing the accent or navigation, adding photos, or before sending the owner a preview.
---

# Design an app

The house style is the app's `DESIGN.md`: the Naz and Etapa family, with Space Grotesk 600 and DM Sans, grouped-row cards, the ink pill with an accent disc, neutral chips, the floating tab bar as the only shadow, and sentence case.
The owner's references from Mobbin are adopted **within** it, never instead of it.
Strong consistency comes from building only with the kit: every screen is the same components on the same tokens.

Summary of the style: [reference/house-style.md](reference/house-style.md).

## The steps

1. **Pull references.** With the Mobbin tools, find the screens of each app the owner likes (onboarding, home, progress, paywall, and the flows this app needs), and note concretely what to take from each within the house style. Add at least three to `DESIGN.md` → *References*. [reference/references.md](reference/references.md).
2. **Ask the owner three questions**, in one message, with the references open: the type of app, the navigation (tabs or a hub), and the colour (the one accent, from their brand).
3. **Write the direction contract** to `.impeccable/surfaces/<screen>.md` (THESIS, OWN-WORLD, STORY naming the references, FIRST VIEWPORT), with `/impeccable shape` for a new screen or `critique` for one that exists.
4. **The logo round**, after the name and before the brand assets: the owner's artwork traced, or 3 or 4 concepts on a grid in the house palette, compared on one sheet at 1024, 180, 58 and 29 px and a 32 px favicon on light and dark (legibility at 29 px first), shown on a decision page, the chosen one refined at least once more into the mark, the app icon, the wordmark and the favicon as SVG, its PNGs rendered by `npm run brand`, its geometry in `DESIGN.md`. [reference/logo.md](reference/logo.md).
5. **Plan the photos** for every screen: which slot, which source, which credit. [reference/photos.md](reference/photos.md).
6. **Build only with the kit** (`src/components/ui.tsx`, `board.tsx`, `choice.tsx`, `tab-bar.tsx`) and the tokens (`src/lib/theme.ts`: `C`, `F`, `T`, `S`, `R`). Never a one-off style. A component the kit lacks is added to the kit, then used.
   Before building a player, share cards or anything a sibling has, read theirs (the new-app skill's `reference/borrow.md`: Naz's `player.js`, `app/src/share/`, the kit in `ui.js`, Etapa's `src/theme/index.js`).
7. **Capture** with `npx expo export --platform web && npm run screens` at 393×852, and with Playwright at 412×915; fail on any page error.
8. **Get a fresh review** before the owner sees anything: the `impeccable-finish-reviewer` agent, or `/impeccable`'s finish review, against the references, the contract, the house style and the checklist. [reference/review.md](reference/review.md).
9. **Fix, re-capture, re-check.** Update `DESIGN.md` only for a real change to the system.

## The checklist before every preview

- No eyebrows or uppercase labels.
- No accent on unselected chips.
- No stacked stat tiles for long facts.
- No blurred stills under text.
- No burnt-in third-party lettering.
- No card in a card.
- One primary action a screen.
- No coach unless there's a real one.
- Tokens only.
- Photos in every slot: the member's own, the goal as the hero, a thumbnail on every row, a photo on every hub card, the landing led by a photo, empty states with a photo, credits inside the card.

## When it changes

- A copy tweak or a one-property style fix skips the `/impeccable` pass; the PR says why in a line.
- A new screen or flow gets `shape`; a real rework gets `critique` and `polish`.
- The brand comes from the owner's own artwork in `assets/brand/`: traced, never redrawn by hand; without artwork, from the logo round ([reference/logo.md](reference/logo.md)).
