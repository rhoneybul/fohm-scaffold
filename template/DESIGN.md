# Design

The visual system, recorded as it's decided. **It starts as the house style
shared with Naz and Etapa**, the owner's two professional apps: every app made
with fohm-scaffold begins in it, so it looks like them from its first screen
and never like a generic AI build. Tokens live in `src/lib/theme.ts` and
`src/lib/fonts.ts`; the kit in `src/components/ui.tsx`, `board.tsx`,
`choice.tsx` and `tab-bar.tsx`. This file says why.

The house style is where an app starts, not a cage: the owner's references
below are adopted within it (which screens, which components, what each
takes), and the brand makes it the app's own (the accent, the photos, the
artwork in `assets/brand/`). A first build that ignored its references was
rejected, and so was one that dropped this family look for a heavier,
softer-shadowed one ("this one looks super vibe coded").

## References

The apps the owner likes the feel of, and the screens to learn from (from
Mobbin). fohm-scaffold's app-design skill fills this in; add to it as the
design grows. For each: the app, the screen, the link, and what to take,
within the house style (its layout, its flow, a component's idea), not in
place of it.

<!-- fohm:references -->

## North star

One line on the feel, in the owner's words. The family's own: a quiet,
native-feeling list app, a cool grey canvas, white borderless cards, hairline
rows, two faces in sentence case, and one accent. The photos carry the colour;
the chrome stays black, white and grey.

## Colour (`C`)

Etapa's light palette's structure, with the brand's accent.

- **Canvas** (`C.bg`, `#F2F2F6`): every screen's ground, a cool grouped-list grey, never pure white.
- **Surface** (`C.surface`): cards, rows, fields, stat tiles, notes, the tab bar, the pinned bar.
- **Raised** (`C.raised`): a step up on a card: an icon well, an undone day, a pressed row.
- **Track** (`C.track`): a segmented control's track, progress bars, a photo's ground before it loads.
- **Hairline** (`C.line`): row dividers, a field's edge, a day tile's edge, the pinned bar's top rule.
- **Ink ramp** (`C.ink` > `C.inkMid` > `C.inkFaint`): titles, body copy, then labels, a row's second line, chevrons and placeholders, each at 4.5:1 or better on the canvas and on a card. Ink is also the primary pill's fill and the active tab's.
- **Accent** (`C.accent`, the brand's one colour, written by the wizard; keep 4.5:1 on white): the primary pill's disc, today's ring in the week, a countdown, a live badge on a photo. Nothing chosen is the accent: a chosen chip is ink. `C.accentSoft` is its pale ground.
- **Danger** (`C.danger`): errors and the outlined destructive button.

**The One Accent Rule.** The accent marks what to press and what's live now; nothing else is coloured. Information that only needs emphasis takes weight in ink.

## Type (`F`, `T`)

**Space Grotesk 600** (500 for a quieter label) for what's read first: titles, headings, numbers, button labels. **DM Sans 300 to 700** for everything read at length or tapped. Loaded once in `src/app/_layout.tsx` from `@expo-google-fonts/space-grotesk` and `@expo-google-fonts/dm-sans`, drawing anyway after 2.5 s (`FONT_WAIT_MS`). React Native picks a face by family, so styles use `F.*` and the scale `T.*`, never `fontWeight`.

A closed scale, picked by name (`T`): `clock` (96, a timer), `statLarge` (64, the number a screen is about), `heroWide` (48, the landing page on a laptop), `hero` (32, a screen's title: `Display`), `display` (28, a question, an item on its own page), `h1` (24: `Title`), `h2` (22, a section: `Section`), `cardTitle` (22), `h3` (20), `heading` (18, inside a section or card: `Heading`), `statValue` (24), `title` (16, a thing's name in a row, a button), then DM Sans: `lead` (500, 15, a plain row's title), `bodyLarge` (16/24), `body` (15/22), `bodyStrong`, `small` (13, a row's second line), `label` (500, 13), `caption` (500, 11, a tab's label).

- **Two voices.** Space Grotesk names and counts; DM Sans speaks. Every number read as a number is Space Grotesk with tabular figures (`tabular`, built into `clock`, `statLarge` and `statValue`).
- **Closed scale.** A size not on `T` is a design decision: add the role, don't drop a number into a screen.
- **Sentence case** everywhere: headings, buttons, tabs, chips, badges and labels, at their natural tracking. No eyebrows, nothing uppercase, and no weight above 600: hierarchy comes from size.

## Layout and shape (`S`, `R`)

- One centred column, at most 640px (`MAX_W`), inside one 20pt gutter (`GUTTER`); sideways rails start at the gutter and run off the edge.
- Etapa's spacing scale (`S`: 4, 8, 12, 16, 20, 24, 32) and radius scale (`R`: xs 4, sm 8, md 12, lg 14, xl 18, xxl 22, pill).
- A screen's blocks sit 16pt apart (`Screen`'s gap); a `Section` adds 12pt above its heading and puts its content 12pt under it.
- Pills for buttons, chips, the tab bar and badges; 22pt for cards, photo cards and notes; 18pt for stat tiles; 12pt for fields and a row's square photo; circles for icon buttons, icon wells and day tiles.
- Flat: depth is tonal (canvas, the white card, raised on a card), with hairlines where tone alone won't do. **The one shadow is the floating tab bar's** (`shadowFloat`).
- Touch-first: 44pt minimum targets, safe areas, nothing hover-only. Screens pad their foot with `useFootRoom`.

## The kit

- **Buttons** (`Button`): the **primary** is an ink pill 56pt tall, its Space Grotesk label set left and a 44pt accent disc inset 6pt from its right end holding a white arrow (or its own icon: play on Start). One to a screen. **Secondary**: a transparent pill with a hairline at ink 0.28. **Ghost**: words only. **Danger**: the secondary's shape in red. **TextLink**: DM Sans semibold 14 in ink with an arrow, a 44pt target (`muted` for an undo; never the accent). **IconButton**: a 52pt hairline circle in a row of them; a 44pt white disc for Back (`BackLink`), white at 94% over a photo (`glass`). **PinnedPill** (`board.tsx`): the primary pinned at the foot on white over a hairline, on a screen with no tab bar.
- **Cards and rows** (`Card`, `Rows`, `Row`, `RowDivider`): a card is white, 22pt corners, borderless, no shadow, 20pt padding (`flush` for rows). **A list is rows on one card** (`Rows`), divided by hairlines inset 16pt; never a stack of cards, never a card in a card. A row: a 32pt icon well (`IconWell`) or a 56pt square photo (`Thumb`, ticked when done), a DM Sans 500 title (Space Grotesk where it names a thing: `strong`), a line in the faint tier, a chevron or its own right slot.
- **Choices** (`ChoiceGroup`, `Choice`): one question's answers as rows on one card, each with a ring that fills ink with a tick once chosen (a rounded box when several can be).
- **Chips** (`Chip`, `Chips`): 36pt pills, neutral until chosen (white, a hairline, an ink-mid label), then solid ink with a white label, the same everywhere. A number on a scale is Space Grotesk, tabular, 44pt tall.
- **Segmented control** (`Segmented`): a track-grey pill, the chosen one white with a Space Grotesk label. It is a screen's header: no title repeats it.
- **Photo card** (`PhotoCard`): for a single object (what's next, a goal). The photo full bleed under a gradient that sinks to the card's white (`Sink`), its Space Grotesk title, line and **credit inside the card** in ink where the photo has sunk, an optional badge top left (the accent with a dot when live). **Photo hero** (`PhotoHero`): a page's head, a light shade at its top for Back and Save, sinking into the canvas, the title in `display` under it.
- **Stat tile** (`StatTile`): a white tile at 18pt, a label over a Space Grotesk value, two to a row, for short values only (a number, a word). A longer fact is a row on one card, its label over the value.
- **The week** (`WeekCircles`, in a card): seven 36pt day tiles, undone raised with a hairline, done ink with a white tick, today ringed 2pt in the accent.
- **Numeral** (`Numeral`): Space Grotesk 600 with tabular figures at 64 (96 for a clock), a DM Sans label under it; the accent only when it counts down to something live.
- **Fields** (`Field`): white on the canvas, a 1pt hairline that turns ink on focus, 12pt corners, 52pt tall, DM Sans 500 at 16, the label above it. A number field types in Space Grotesk.
- **Note** (`Note`) and **Empty** (`Empty`): a card with an icon in its well; a note's line in ink mid, an empty state's heading, line and one action. No coloured edge.
- **Navigation**: a floating tab bar (`src/components/tab-bar.tsx`) on the member's main tabs only (`TAB_ROUTES` in `src/lib/tabs.ts`): a white 64pt pill with a hairline and the one shadow, 16pt above the safe area, each tab a Feather icon over an 11pt label, **the tab you're on a solid ink pill** with its icon and label in white. Never on sign-in, onboarding, a full-screen flow or the dashboard. Back is a 44pt white disc at the top left.
- **Home is a board, not a list of links**: the greeting and the account, a new member's first steps (rows on one card), the week, what's next as a photo card with Start, a few numbers, then what they wrote, and the rest as rows on one card.

## Imagery

- **A sharp photo of the member's own goal leads**: the place, the event, the thing they train for, and their own photo on their avatar. Photos carry the colour.
- **Every slot has a photo**: the member's own by the greeting and on Account, the goal as Home's hero and its page's, a thumbnail on every list row, a photo on every hub card, the landing page led by one (`APP.heroPhoto`), empty states with a photo and a line. Sources in order: the member's own, the owner's, open licence with a named author, and a clean stand-in only until one is found.
- **Demo and video stills are a frame from mid-video**, never YouTube's `hqdefault`, which is often the channel's title card with lettering baked in. YouTube keeps three frames of every video (`hq1.jpg` to `hq3.jpg`, the large cuts of `1.jpg` to `3.jpg`); `stillOf` and `videoStill` in `src/lib/stills.ts` take the middle (`hq2`), or the frame `STILL_FRAME_FOR` names where that one was checked by eye and carries a caption. Each is drawn cropped to its middle (`letterboxed` on `Photo`, `Thumb`, `PhotoCard`), so the letterbox and the picture's outer edges, where a channel's badge sits, fall outside. A large slot (a hero, a player, a photo card) passes `sources={videoStillsLarge(id)}` to `Photo`: the same frame at 1280x720 where the video is HD, else 640x480, else the 480x360 every video has, each tried only when the one before fails, so a big picture is never a soft thumbnail blown up.
- **Burnt-in third-party lettering never shows**: pick another frame or another photo.
- **Never a blurred still under text**: the kit has no blur. Type sits on the card where the photo has sunk to white, never on a dark scrim over a busy photo.
- Every photo has a fixed ratio and lays out on the track grey with a stand-in icon before it loads. Each carries its licence and credit (`src/lib/photos.ts`, `/credits`), shown inside its card or hero.

## Owner dashboard (dark)

- Dark graphite (`A` in `src/lib/theme.ts`, Nov 2026), so it never gets mistaken for the member app, built from the member app's colours: its ink `#111113` is the canvas, cards step up to `#1C1C20` and `#26262B`, the sidebar sits below at `#0B0B0D`, hairlines are `#34343B`, and its canvas `#F2F2F6` is the text (`#C9CCD1` and `#9C9CA6` quieter). No green, no tint in the greys.
- One colour for action: The brand's accent (`C.accent`), as in the member app, on the primary pill, the page you're on, a link and the bars of a chart. It's lifted toward white only as far as it takes to keep 3:1 on every surface as a fill and 4.5:1 as text (`liftedTo`), and its label is white where that keeps 4.5:1, else ink.
- One colour only for what needs the owner: "Needs you" blue `#6CB6FF` (7:1 on every surface, ink on it for a count), or amber `#F5C451` when the accent is itself a blue. Nothing else wears it.
- What's fine is outlined in the text colour, deleting is light red `#FF8A7A`, and chosen chips are solid in the text colour, as the member app's are on ink.
- Never a hex in a dashboard screen or the kit (`src/components/admin.tsx`): tokens only (`tests/dashboard-colours.test.ts` holds the contrast for any accent and the kit to tokens).
- A sidebar on a laptop, a tab row on a phone; tables become cards under 768px.

## Do's and Don'ts

- **Do** start from the house style and adopt the references within it: which reference each screen follows and what it takes is written in `.impeccable/surfaces/` before the screen is built.
- **Do** compose screens from the kit (`Screen`, `Section`, `Card`, `Rows`, `Row`, `Chip`, `Button`, `TextLink`, `PhotoCard`, `PhotoHero`, `PinnedPill`), and pick a `T` role by name and spacing and radius from `S` and `R`.
- **Do** draw the brand from the owner's own artwork in `assets/brand/`; trace it, never redraw it by hand.
- **Do** keep text at 4.5:1 on the canvas and on a card.
- **Do** set numbers in the heading face with tabular figures.
- **Don't** use a face other than Space Grotesk and DM Sans, or any weight above 600.
- **Don't** put a shadow on anything but the tab bar, a border on a card, a card in a card, or a list in a stack of cards.
- **Don't** stack stat tiles for long facts: a fact longer than a number or a word is a row on one card.
- **Don't** put the accent on an unselected chip, or on any chip: a chosen chip is ink.
- **Don't** float a photo's credit between blocks: it goes inside its photo card or hero.
- **Don't** put a blurred still under text, or show a still with a channel's lettering on it.
- **Don't** put eyebrow or kicker labels over a title (a small word naming the section, the kind, the step).
- **Don't** use uppercase, letter-spaced labels anywhere: labels are sentence case.
- **Don't** draw callouts with a coloured left border: a note is a card with an icon.
- **Don't** use emoji, or glyphs (`[x]`, `-`, arrows typed as text) standing in for icons: icons are Feather (`@expo/vector-icons`).
- **Don't** use decorative gradients or glass; a photo's sink and top shade are the only gradients, there for legibility.
- **Don't** paint buttons in the accent: it lives on the primary's disc.
- **Don't** hard-code colours or sizes in screens: tokens only.
