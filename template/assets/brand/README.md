# The owner's brand artwork

Put the owner's own logo, wordmark and colour sheet here (PNG or SVG, the largest you have).
The mark is traced from these files into `src/lib/logo.ts` (its geometry as numbers), never redrawn by hand, and the colours in `src/lib/theme.ts` are picked from them.
Then `npm run brand` writes the other SVGs here (`mark.svg`, `icon.svg`, the adaptive icon's three layers, `favicon.svg`, `splash.svg`) and renders every PNG and the web page's splash from `logo.ts`: don't edit those by hand.
A wordmark (`wordmark.svg`: the mark and the name in Space Grotesk, the letters as paths) is the one source added by hand; `npm run brand` renders it too.
Ask your agent: "Trace the logo in assets/brand into src/lib/logo.ts, use its colours in theme.ts, run npm run brand, and record the system in DESIGN.md."
