# Research, the product brief and the catalogues

## Market research (`docs/RESEARCH.md`)

**Why.** It decides what the skeleton is and isn't: the crowded categories next door, the incumbent to study, and who to sell to first.

- With web search, fill in `docs/RESEARCH.md` from `PRODUCT.md`'s thesis: the crowded categories next door (what this isn't), the incumbent to study, the strategic insight, and bottom-up sizing from the owner's own audience first.
- Cite a source for every number; never invent one.
- Answer its open questions with the owner: audience size, revenue, their time, ambition, budget and content rights.
- Delete the template line at the top of `docs/RESEARCH.md` (`fohm:template-research`) once it's real.

## The product brief (`PRODUCT.md`)

**Why.** Coding agents make dozens of small product decisions per feature; `PRODUCT.md` is what they decide from.

- Who uses it, the one job they come to do, who runs it, and how you'll know it works. Be concrete.
- Decide the two roles in the app's words. The kit calls them **member** and **owner** (Aluzam's were student and teacher); the words on screen matter more than the names in code (`--member-word`, `--owner-word`).
- Write down the rule that keeps the product honest. Aluzam's was "the teacher sees everything students do"; the template carries it as "the owner sees everything members do".
- Delete the "Fill this in before writing features" paragraph once it's done, then ask: "Read PRODUCT.md and AGENTS.md, then tell me what is unclear."

## The coach's method (coaching apps)

**Why.** The app productises what the business already sells: their levels, skills, drills and content, in their words.

- The person gathers the coach's method: their levels, the skills and drills at each, the questions that place someone, and links to the videos and posts they already publish.
- The agent writes it into `src/lib/progression.ts` (levels, skills, drills, the assessment questions, the library), from their notes, videos and course outlines; library links can point at what they already publish (YouTube, Instagram).
- Delete the `fohm:template-content` line, and run `npm test`.

## The catalogues: goals and courses, with photos

**Why.** People train for something: a place, a trip, an event.
Naz's surf spots and Strawberry Fields' ski tours made the training theirs, and the real courses that prepare for each gave them a next step.
Saving one, and seeing it on a to-do list, brings them back.

1. Research the catalogue of goals members train for (places, events, trips), and the real courses that prepare for them.
   For each: what it is, where, when, how hard, what it asks of the body, and the source for every fact; never invent one.
2. Find open-licence photos of each on Wikimedia Commons or Flickr (public domain, CC0, CC BY or CC BY-SA, with the author), reading each licence from its file page (the app-design skill's `reference/photos.md`).
3. Write them to `research/goals.json` and `research/courses.json` with their sources.
4. Generate the typed data the app and the API read: `npx tsx scripts/research.ts goals courses` writes `src/lib/<name>.data.ts`, and `tests/research.test.ts` fails while they drift.
5. Show them as photo cards and rows with their photos and credits (`src/lib/photos.ts`; each on `/credits` through `src/lib/credits.ts`).
6. Saves: the `saved` table (kind, item, status; `save` and `unsave` in `src/lib/store.tsx`) holds a member's hearts and bookmarks.
   Name each catalogue in `SAVED_NAMES` and its photo in `SAVED_PHOTOS` (`src/lib/saves.ts`) so Activity says what was saved and Home shows the goal.
7. A to-do list on Progress: what they've put on their list or are going to, from `toDo()` in `src/lib/saves.ts`, with a way to mark one done.

The check: `ls research/*.json src/lib/*.data.ts` shows each catalogue generated, and `npm test` passes.
