# The colour scheme

**Why.** One accent picked from a hex field gave every app the same grey around a different colour, and nobody chose it from seeing it.
An app's colour is a whole scheme: the accent and the neutrals that belong with it, so a surf app sits on a misty blue-grey with an ocean accent and a running app on warm sand with an ember one.
The scheme is picked from what the app is about and the apps the owner likes, and the owner chooses the one they like most from seeing it on their own screens.

## What a scheme is

Each is the house style's structure, coloured as a set (`lib/schemes.mjs` in fohm-scaffold, written into the app's `src/lib/theme.ts`):

- **The accent** (`C.accent`), at 4.5:1 on white, and its pale ground (`C.accentSoft`).
- **The neutrals**, one family that leans with the accent: cool grey, warm sand, sage grey or misty blue-grey (`C.bg`, `C.raised`, `C.track`, `C.line`, and the text greys `C.inkMid` and `C.inkFaint`, each at 4.5:1 on the canvas and on white).
- **The ink stays the house's** (`#111113`): the primary pill, titles, the splash and the icon's ground, so every app is still family.

The One Accent Rule holds: the accent marks what to press and what's live now, and the neutrals only set the temperature.
The photos still carry most of the colour.

## Suggest three or four

1. **The owner's own brand comes first.** With a logo or artwork in `assets/brand/`, or a colour on their site, one option is built around it: `--accent "#hex"` gives it the neutrals that suit it, darkened just enough to read if it's pale.
2. **Then what the app is about and the apps they like**, from the discovery answers:

   ```bash
   npx github:rhoneybul/fohm-scaffold schemes --idea "<idea>" --business "<business>" --inspiration "<apps>" --json
   ```

   It returns the schemes that suit it best, each with its tokens and why (the words in the idea it matched, the liked apps whose colours it's close to).
3. **Then look**: on the Mobbin references (the step before this one), note the colours the liked apps actually use and what they mark, and move a scheme up or down for it.
   Never copy another app's exact colour; take the temperature and the weight.
4. Keep three or four that differ from each other: not two greens.

## Show them on a decision page

Publish an Artifact (the artifact tools' design guidance first), one card a scheme, strongest first, with which you'd pick and why in a line at the top:

- The scheme's name and its mood in a line.
- Its swatches, labelled: the accent, its pale ground, the canvas, the card, the text greys.
- The same two screens in each scheme, drawn from the kit at phone width: Home (the greeting, the goal as a photo card, the week with today's ring, the ink pill with its accent disc) and one list of rows, with the app's real photos.
- Why it suits this app, in the owner's terms: what it's about, which of their apps it's close to.

The owner taps the one they like most, or asks for another round ("warmer", "less corporate"): run the suggestion again in that direction, never the same cards reworded.
A colour they bring ("our green is #1E6B3A") becomes a card of its own.

## Once they pick

- On the prototype: its brief names the scheme, and every screen is drawn in it.
- On create: `new --scheme <id>`, or `--accent "#hex"` for their own colour (with `--scheme <id>` too to keep that scheme's neutrals).
  It writes the scheme into `src/lib/theme.ts`, the accent into `api/_lib/app.ts` and the emails, and the scheme's name and canvas into `DESIGN.md`.
- After create, a change is the same tokens in `src/lib/theme.ts`, recorded in `DESIGN.md`, and `npm run og` again for the share card.
