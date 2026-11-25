# The logo round

After the name, before the brand assets: the logo is the app icon on someone's home screen, and a quick single SVG isn't refined enough.

## With the owner's artwork

- Trace it from `assets/brand/` into SVG; never redraw it by hand.
- Pick the colours from it for `src/lib/theme.ts`, keeping the accent at 4.5:1 on white.
- Then make the four sources below from the trace.

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
- Then the four sources, all SVG, in `assets/brand/`:
  - `mark.svg`: the mark alone, on a transparent ground.
  - `icon.svg`: the full-bleed app icon, 1024 square, no transparency and no rounded corners (the stores round them), the mark inside iOS's safe zone (about the middle 80 %, so nothing important sits in the outer 10 % on any side).
  - `wordmark.svg`: the mark and the name in Space Grotesk 600, the text converted to paths.
  - `favicon.svg`: the mark simplified for 32 px, with its own ground.
- Render the PNGs with `npm run brand` (`scripts/brand-assets.ts`); never edit a PNG by hand.
- Point `app.json` at them: `expo.icon` to `./assets/icon/icon.png`, the splash image to `./assets/icon/mark.png`, `web.favicon` to `./public/favicon.png`.

## Record it in DESIGN.md

Under the brand: what the mark is and why, its viewBox and grid, the stroke weights and joins, the colours by token, the icon's safe zone and scale, and the sizes it was judged at.
