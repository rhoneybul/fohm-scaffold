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

- Background `C.bg`, cards `C.surface` with a 1px `C.border`, 18px corners.
- One accent (`C.accent`) for the primary action on a screen.
- Type: the system font until the brand's own is chosen. Titles 28/34 bold, headings 18/24 semibold, body 16/24.
- Touch-first: 44pt minimum targets, 48px buttons and inputs, safe areas, nothing hover-only.
- One column, at most 640px wide, centred on a laptop.

## Owner dashboard (dark)

- Dark surfaces (`A`), so it never gets mistaken for the member app.
- One colour for action, one only for what needs the owner.
- A sidebar on a laptop, a tab row on a phone; tables become cards under 768px.

## Do's and Don'ts

- **Do** draw the brand from the owner's own artwork in `assets/brand/`; trace it, never redraw it by hand.
- **Do** keep text at 4.5:1 contrast on its background.
- **Don't** use emoji, or glyphs standing in for icons.
- **Don't** use decorative gradients, glass or blur, eyebrow labels or uppercase kickers.
- **Don't** hard-code colours in screens: tokens only.
