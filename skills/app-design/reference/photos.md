# Personal, with lots of photos

The owner's rule (Nov 2026): every app has a personal feel, with lots of photos.
Photos carry the colour in the house style, and the member's own photo and their own goal make the app theirs.
A screen of icons and plain lists reads as generic; a screen of the member's face, their goal and real places reads as their app.

## The slots: every app ships with photos in these

| Slot | What goes there | In the template |
| -- | -- | -- |
| The member's own photo, prominent | By the greeting on Home, large on Account, on the dashboard's People | `Avatar` (`src/components/avatar.tsx`), the profile photo picked and squared on the device (`src/lib/photo.ts`) |
| The goal they train for, as the hero | A photo card on Home, the head of the program, a goal's page with a gallery | `GoalCard` on Home from `currentGoal` and `SAVED_PHOTOS` (`src/lib/saves.ts`); `PhotoCard`, `PhotoHero` |
| Every list row | A 56pt square photo (`Thumb`) on each row of a catalogue, a library, a log | `Row`'s `thumb` |
| Every hub or category card | A photo card, not an icon tile | `PhotoCard` |
| The landing page | Led by a real photo of the goal or the people, its credit under it | `APP.heroPhoto` (`src/lib/brand.ts`), drawn by `src/components/landing.tsx` |
| Empty states | A photo and a line, not a bare icon | `Empty`'s `photo` |
| Share cards | The member's photo or their goal | Borrow Naz's (`app/src/share/`) |
| Demo and video stills | A frame from mid-video, at the sharpest size in large slots | `stillOf`, `videoStillsLarge` (`src/lib/stills.ts`) |

## Sources, in this order

1. **The member's own**: their profile photo, photos they attach.
2. **The owner's**: the business's own photos and artwork, with their written permission recorded (`permission` on the photo).
3. **Open licence**: public domain, CC0, CC BY or CC BY-SA with a named author, never NC or ND (the app may be sold, and crops photos).
   Find them on Wikimedia Commons and Flickr, read each licence from its file page, and record it in the research (`research/<name>.json`) with the URL, the file page, a caption, the credit and the licence.
4. **A clean placeholder**, only until one is found: the track grey with the kit's stand-in icon (`Photo` with no `uri`), never a stock photo of something else and never a generated one presented as real.

## Rules

- Only what `canShow` (`src/lib/photos.ts`) allows is shown; `tests/photos.test.ts` holds it.
- **Credits go inside the photo card or hero** (`CreditLink`), never floating between blocks, and every photo shown is listed on `/credits` (a section in `src/lib/credits.ts` for each kind of photo).
- **Stills**: a frame from mid-video (YouTube's `hq1.jpg` to `hq3.jpg`, the middle first), never `hqdefault`'s title card, cropped to its middle (`letterboxed`); a large slot passes `sources={videoStillsLarge(id)}`, sharpest first.
  Check each by eye; name a clean frame in `STILL_FRAME_FOR`, or pick another photo.
- **Never a blurred still under text**, and burnt-in third-party lettering never shows.
- **On a Claude Design canvas** (the prototype), a photo shows only once it's downloaded and uploaded to the canvas as an asset (its `/_blob/` url); a linked URL draws blank. A host the session can't reach is the person's to allow, said to them, never a silent placeholder (the new-app skill's `reference/prototype.md`).
- Every photo has a fixed ratio and lays out on the track grey before it loads.
- The member's photo is theirs: stored in their own folder, shown to them, the owner and their coach only, and never in analytics or a share card without them choosing it.

## Where it's enforced

- `tests/photos.test.ts`: only open licences or permission are shown, and the credits list every photo the app shows.
- `tests/photoSlots.test.ts`: Home shows the member's photo by the greeting and the goal's photo card, Account shows the photo large, the landing page has its hero slot, `Empty` takes a photo.
- The review checklist ([review.md](review.md)): photos in every slot, on every screen a feature adds. A list row or hub card without a photo is a finding.
