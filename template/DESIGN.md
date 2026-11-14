# Design

The visual system, recorded as it's decided. Tokens live in `src/lib/theme.ts`;
this file says why.

## Member app (light)

- Background `C.bg`, cards `C.surface` with a 1px `C.border`, 18px corners.
- One accent (`C.accent`) for the primary action on a screen; everything else is secondary.
- Type: the system font. Titles 28/34 bold, headings 18/24 semibold, body 16/24.
- Touch-first: 44pt minimum targets, 48px buttons and inputs, safe areas, nothing hover-only.
- One column, at most 640px wide, centred on a laptop.

## Owner dashboard (dark)

- Dark green surfaces (`A`), so it never gets mistaken for the member app.
- Butter (`A.primary`) for action, pink (`A.highlight`) only for what needs the owner.
- A sidebar on a laptop, a tab row on a phone; tables become cards under 768px.

## Rules

- Text keeps 4.5:1 contrast on its background.
- Plain English, no emoji.
- Replace these tokens with your brand once, in `theme.ts`; never hard-code colours in screens.
