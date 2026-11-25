# The logo round

After the name, before the brand assets: the logo is the app icon on someone's home screen, and a quick single SVG isn't refined enough.

## With the owner's artwork

- Trace it from `assets/brand/` into the mark's geometry in `src/lib/logo.ts`; never redraw it by hand.
- Pick the colours from it for `src/lib/theme.ts`, keeping the accent at 4.5:1 on white.
- Then render everything from it, as below.

## Without it: three or four concepts

- Use the `logo-designer` skill if it's available; its method, with these rules on top.
- Draw 3 or 4 concepts, each a different idea (a place, a motion, a letterform, an object), in the house palette: ink `#1C1F1D`, paper `#F7F5F0` and the app's one accent.
- Draw on a grid: a 512 viewBox, shapes on whole units, strokes of one or two weights, round or miter joins chosen once.
- Make it about the product, not the name, so it survives a rename.

## Compare them on one sheet

- Render every concept at 1024, 180, 58 and 29 px and as a 32 px favicon, on light and dark:
  `npx tsx scripts/brand-assets.ts --sheet concepts.png concepts/*.svg`.
- Judge legibility at 29 px first (the Settings icon size): a concept that turns to a smudge there is out, however good it looks at 1024.
- Then the favicon at 32 px on both grounds, then the home screen at 180.
- Check it on dark: a mark in ink disappears on a dark ground unless its icon carries its own ground.

## Show them on a decision page

Publish an Artifact with the sheet, each concept's idea in a line, and the one you'd pick.
The owner picks one or asks for another round.

## Refine the chosen one at least once more

- Simplify for 29 px: fewer, thicker strokes; no detail under about 1/24 of the width.
- Optical balance: centre by weight, not by the bounding box.
- Then put it in code: the mark lives in `src/lib/logo.ts` as one path on the 1024 grid (`MARK_PATH`, filled with the even-odd rule, so a hole is an outline inside another) and its square (`BOX`), replacing the template's placeholder ring and dot.
  Naz's (`app/src/logo.js`) and Strawberry Fields' (`app/src/lib/logo.ts`) are the models.
- Run `npm run brand` (`scripts/brand-assets.ts`): from `logo.ts` it writes the SVGs in `assets/brand/` and renders every PNG, so nothing is edited by hand:
  - `icon.png`: the full-bleed app icon, 1024 square, the mark in white at 60 % on the brand's ink, no transparency and no rounded corners (the stores round them).
  - Android's adaptive icon: the foreground (the mark at 40 % of the layer, inside the 72dp mask), the ink background and the monochrome layer.
  - `splash.png`: the mark in white, edge to edge, for the launch screen; `favicon.png` and `apple-touch-icon.png`.
  - The web page's splash in `public/index.html`, before the app's script runs.
- `app.json` already points at them: `expo.icon`, `android.adaptiveIcon`, `web.favicon`, and expo-splash-screen's image on the ink at `SPLASH.size` (`src/lib/splash.ts`; `tests/splash.test.ts` holds the two together).
- The launch screen then throbs the same mark (`LoadingSplash` and `LogoLoader` in `src/components/logo-loader.tsx`), so a new mark needs nothing else.
- A wordmark, if the app has one, is the one source added by hand: `wordmark.svg`, the mark and the name in Space Grotesk 600, the text converted to paths; `npm run brand` renders it too.
- The icons and the splash are native: they reach the apps only with a store build.

## Record it in DESIGN.md

Under The mark and the launch screen: what the mark is and why, its grid and box, its weights, the colours by token, the icon's safe zone and scale, and the sizes it was judged at.
