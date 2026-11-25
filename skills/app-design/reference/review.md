# Capture, review, fix

Nothing goes to the owner until a fresh reviewer has looked at it: a new agent, not the one that built it.

## Capture

1. `npx expo export --platform web`, then `npm run screens`: the main member flow in demo mode at 393×852, scale 2, into `screens/`, failing on a page error or a screen that scrolls sideways. Add each new screen to its `WALK`.
2. For 412×915 (and the dashboard at laptop width), `npm run serve:local` and drive it with Playwright at that size, failing on any page error.
3. Look at every screenshot yourself before the review.

## Review

Spawn the `impeccable-finish-reviewer` agent (or run `/impeccable`'s finish review) with: the screenshots at 393 and 412, the references in `DESIGN.md`, the direction contract in `.impeccable/surfaces/`, the house style, and the checklist below.
Ask where the screens differ from the references, the house style and the contract, and what fails the checklist.
Without the agent or the skill, spawn a general reviewer agent with the same brief, and say so.

## The checklist, before every preview

- [ ] No eyebrows or kicker labels over a title, and nothing uppercase or letter-spaced.
- [ ] No accent on an unselected chip (or any chip: chosen is ink).
- [ ] No stacked stat tiles for long facts: a fact longer than a number or a word is a row.
- [ ] No blurred still under text.
- [ ] No burnt-in third-party lettering on a still or photo.
- [ ] No card in a card, and no list as a stack of cards.
- [ ] One primary action a screen.
- [ ] No coach shown or offered unless there's a real one.
- [ ] Tokens only: no colour, size, face or weight typed into a screen; only the kit's components.
- [ ] Photos in every slot ([photos.md](photos.md)): the member's own by the greeting and on Account, the goal as the hero, a thumbnail on every list row, a photo on every hub card, the landing led by a photo, empty states with a photo and a line, credits inside the card.
- [ ] No emoji, and no shadow but the tab bar's.
- [ ] Text at 4.5:1 on the canvas and on a card; 44pt targets.

## Fix and re-verify

Fix what the review finds, capture again, and run the checklist again.
Update `DESIGN.md` only for a real change to the system (a new kit component, a new token role, a reference adopted), never for a one-off.
Then the preview goes to the owner (the new-app skill, step 10).
