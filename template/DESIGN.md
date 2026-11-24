# Design

The visual system, recorded as it's decided. Tokens live in `src/lib/theme.ts`;
this file says why. Start from the references below, not from a template:
the first look in Aluzam was rejected as "AI-generic", and the fix was
following the owner's reference apps directly.

## References

The apps the owner likes the feel of, and the screens to learn from (from
Mobbin). fohm-scaffold's "inspiration" step fills this in; add to it as the
design grows. For each: the app, the screen, the link, and what to take.

<!-- fohm:references -->

## North star

One line on the feel, in the owner's words, then the two or three colours
with fixed jobs (what you press; what's new or now).

## Member app (light)

The starting world: neutral, so the references and the brand make it the
app's own, and nothing in it reads as the AI-generic look (a cream ground, the
system font, a green accent on every button, eyebrow labels, Home as a list
of links), which owners have rejected on sight.

- **Ground and surfaces**: a white ground (`C.bg`), grey panels (`C.panel`)
  for notes, tiles and a photo before it loads, white cards lifted by a soft
  shadow (`shadow`) rather than a border, 20px corners.
- **Ink and colour**: ink (`C.ink`) for type and for the one thing to press;
  secondary text `C.inkMid` (6.3:1 on white). The accent (`C.accent`, the
  brand's one colour) only for what's live now: today, up next, a countdown.
  Never on every button.
- **Type**: real fonts, loaded once (`src/lib/fonts.ts`, the one place to
  change them; Archivo by default), a face per weight in `F`, the scale in
  `T`. Display sizes black or extra-bold, tracked about -0.02em (tighter ran
  words together); body 16/23 regular. Giant numerals (`T.numeral`) for the
  number that matters on a screen.
- **The kit** (`src/components/ui.tsx`, `board.tsx`, `choice.tsx`): 56px pill
  buttons (`Button`); choice blocks with a subline (`Choice`); segmented
  filter chips (`Chips`) and a segmented control (`Segmented`); a photo card
  with a scrim (`PhotoCard`: deeper, from higher up, or the photo blurred,
  when the image may carry its own lettering); a row with a square photo
  (`PhotoRow`); stat tiles (`StatTile`); the week as seven circles
  (`WeekCircles`); a numeral (`Numeral`); a first-steps checklist
  (`FirstSteps`); notes on a grey panel (`Note`); rows to other screens
  (`LinkRow`); a round Back (`BackLink`).
- **Navigation**: a floating pill tab bar on the member's main tabs only
  (`TAB_ROUTES` in `src/lib/tabs.ts`), never on sign-in, onboarding, a
  full-screen flow or the dashboard. Screens pad their foot with
  `useFootRoom`. Back is a round button at the top left.
- **Home is a board, not a list of links**: the greeting and the account,
  a new member's first steps, the week, what's next as a photo card with
  Start, a few numbers, then what they wrote.
- **Photos wherever they make it personal**: the member's own, the place or
  goal they train for, the content's own stills. Each with its licence and
  credit (`src/lib/photos.ts`, `/credits`).
- Touch-first: 44pt minimum targets, safe areas, nothing hover-only.
- One column, at most 640px wide, centred on a laptop.

## Owner dashboard (dark)

- Dark surfaces (`A`), so it never gets mistaken for the member app.
- One colour for action, one only for what needs the owner.
- A sidebar on a laptop, a tab row on a phone; tables become cards under 768px.

## Do's and Don'ts

- **Do** follow the references screen by screen: which reference each screen follows and what it takes from it is written in `.impeccable/surfaces/` before the screen is built.
- **Do** draw the brand from the owner's own artwork in `assets/brand/`; trace it, never redraw it by hand.
- **Do** keep text at 4.5:1 contrast on its background.
- **Don't** put eyebrow or kicker labels over a title (a small word naming the section, the kind, the step).
- **Don't** use uppercase, letter-spaced labels anywhere: labels are sentence case.
- **Don't** draw callouts with a coloured left border: a note is a grey panel with an icon.
- **Don't** use emoji, or glyphs (`[x]`, `-`, arrows typed as text) standing in for icons: icons are Feather (`@expo/vector-icons`).
- **Don't** use decorative gradients or glass; a scrim under type on a photo is the one gradient.
- **Don't** paint every button in the accent, or use the system font in the member app.
- **Don't** hard-code colours in screens: tokens only.
