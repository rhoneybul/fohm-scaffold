# The house style

Every app made with fohm-scaffold starts in the house style shared with Naz and Etapa, the owner's two professional apps, so it looks like them from its first screen and never like a generic AI build.
The app's `DESIGN.md` is the full record; its tokens are in `src/lib/theme.ts` and `src/lib/fonts.ts`, its kit in `src/components/ui.tsx`, `board.tsx`, `choice.tsx` and `tab-bar.tsx`.
This is the summary an agent holds in mind while building.

The house style is where an app starts, not a cage: the owner's references are adopted within it, and the brand makes it the app's own (the accent, the photos, the artwork in `assets/brand/`).
A first build that ignored its references was rejected, and so was one that dropped the family look for a heavier, softer-shadowed one ("this one looks super vibe coded").

## The feel

A quiet, native-feeling list app: a cool grey canvas, white borderless cards, hairline rows, two faces in sentence case, and one accent.
The photos carry the colour; the chrome stays black, white and grey.

## Colour (`C`)

- **Canvas** (`C.bg`, `#F2F2F6`): every screen's ground, never pure white.
- **Surface** (`C.surface`): cards, rows, fields, stat tiles, notes, the tab bar.
- **Raised** (`C.raised`) a step up on a card; **Track** (`C.track`) for a segmented control, progress and a photo before it loads; **Hairline** (`C.line`) for dividers and a field's edge.
- **Ink ramp** (`C.ink` > `C.inkMid` > `C.inkFaint`), each at 4.5:1 or better on the canvas and on a card. Ink fills the primary pill and the active tab.
- **The One Accent Rule**: the accent marks what to press and what's live now (the primary's disc, today's ring, a countdown, a live badge). Nothing chosen is the accent: a chosen chip is ink.

## Type (`F`, `T`)

- **Space Grotesk 600** (500 for a quieter label) for what's read first: titles, headings, numbers, button labels. **DM Sans** for everything read at length or tapped.
- A closed scale picked by name (`T.hero`, `T.h1`, `T.heading`, `T.body`, `T.small`...); a size not on `T` is a design decision, never a number dropped into a screen.
- Every number read as a number is Space Grotesk with tabular figures.
- **Sentence case** everywhere; nothing uppercase, no eyebrows, no weight above 600.

## Layout and shape (`S`, `R`)

- One centred column, at most 640px, inside a 20pt gutter.
- Spacing `S` (4, 8, 12, 16, 20, 24, 32) and radius `R` (4, 8, 12, 14, 18, 22, pill).
- Pills for buttons, chips, the tab bar and badges; 22pt for cards and photo cards; 18pt for stat tiles; 12pt for fields and a row's photo.
- Flat: depth is tonal. **The one shadow is the floating tab bar's.**
- Touch-first: 44pt targets, safe areas, nothing hover-only.

## The kit

- **The primary** (`Button`): an ink pill 56pt tall, its label left and a 44pt accent disc holding a white arrow. One to a screen. Secondary, ghost and danger beside it; `TextLink` in ink, never the accent.
- **A list is rows on one card** (`Card`, `Rows`, `Row`): a 56pt square photo (`Thumb`) or an icon well, a title, a faint line, a chevron. Never a stack of cards, never a card in a card.
- **Chips** (`Chip`): neutral until chosen, then solid ink.
- **Photo card** (`PhotoCard`) for one object (what's next, a goal), its credit inside; **Photo hero** (`PhotoHero`) for a page's head.
- **Stat tile** for short values only; a longer fact is a row.
- **The week**, **Numeral**, **Fields**, **Note**, **Empty** (with a photo where there is one), **Segmented**, **PinnedPill**.
- **Navigation**: the floating tab bar on the main tabs only, the tab you're on a solid ink pill; Back a 44pt white disc at the top left.
- **Home is a board**: the greeting with the member's photo, first steps, the goal they train for as a photo card, the week, what's next with Start, a few numbers, the rest as rows.

## Where the siblings go further

Read before building one of these (the new-app skill's `reference/borrow.md`): Naz's kit and tokens (`app/src/components/ui.js`) and Etapa's (`src/theme/index.js`); Naz's guided player (`app/src/components/player.js`); Naz's share cards (`app/src/share/`); Naz's keyboard rule (`app/src/components/keyboard.js`); Etapa's tab-bar clearance test (`tests/tabBarClearance.test.js`).
