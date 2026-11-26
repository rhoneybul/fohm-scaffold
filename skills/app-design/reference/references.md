# References and the direction contract

**Why.** The apps the owner likes say what to adopt within the house style, screen by screen.
References that are only listed get ignored: one first build had "none of the UI/UX of the Mobbin references".

## Pull references with Mobbin

With the Mobbin tools (`search_screens`, `search_flows`):

1. For each app the owner likes, find its onboarding, home, progress and paywall screens, and any flow the app needs (a player, a booking, a check-in). Discovery has already shown the owner most of them (the new-app skill's `reference/discovery.md`): start from those.
2. Look at each screen, then write down concretely what to take within the house style, led by what the owner said they like about it, not just the app's name: the layout and flow of a screen, the navigation (tab bar, hub, back), what the one accent marks, and the components (photo cards, lists as rows, stat tiles, chips).
   The faces, cards and buttons stay the house style's unless the owner asks otherwise.
3. Add at least three to `DESIGN.md` under *References*, one line each: `- **App, Screen** ([Mobbin](https://mobbin.com/...)): what to take.`
4. Without Mobbin's tools, the person browses mobbin.com and sends links.

## Ask the owner three questions

The approved prototype (the new-app skill's `reference/prototype.md`) has answered these: the owner chose them by tapping through it. Ask only what it left open.

In one message, with the references open beside the house style (Space Grotesk and DM Sans, a grey canvas with white cards, the ink pill with an accent disc):

1. **Type**: what kind of app is it to them: a coach, a program to follow, a catalogue to browse, a game? Which reference is closest?
2. **Navigation**: a tab bar (which three to five tabs), or one hub screen with everything off it?
3. **Colour scheme**: three or four whole palettes (the accent and the neutrals with it), suggested from their brand, what the app is about and the apps they like, shown on a decision page; they pick the one they like most ([colour.md](colour.md)).

## Write the direction contract

Before building screens, run `/impeccable` (`shape` for a new app or screen, `critique` for screens that exist) against the house style and the references, with the owner's answers.
Write the contract to `.impeccable/surfaces/<screen>.md`:

```markdown
## Direction contract

THESIS: the look in a line: the house style, the references it follows and what it refuses.
OWN-WORLD: what is the app's own within the house style: the accent and what it marks, the photos, the artwork.
STORY: each screen, the prototype's screen it builds and the reference it follows, and what it takes, built from the kit.
FIRST VIEWPORT: Home at 393 wide, top to bottom.
```

Every block is required, and STORY names the prototype's screens and the references by app.
Without `/impeccable` in the session, say so and write the contract by hand.
