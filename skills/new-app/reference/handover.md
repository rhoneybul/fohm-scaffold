# The proposal, the deck and the handover

## The proposal (`docs/PROPOSAL.md`)

**Why.** The basis for the conversation with the owner: thesis, skeleton, roadmap, open questions, and how you work together.

- Write it from `PRODUCT.md` and `docs/RESEARCH.md`: thesis, market, skeleton, roadmap (skeleton → monetise the existing audience → deepen the coaching → scale with AI and more coaches), open questions.
- The person settles with the owner how they work together: IP, their time, the handover and (if revenue is shared) how it's defined.
- Delete the template line at the top (`fohm:template-proposal`).

## The pitch deck

**Why.** One deck to walk the owner through it, in their brand.

- Make it from `docs/PROPOSAL.md`, in the brand from `DESIGN.md`, with screenshots of the app (`npm run screens`): a Slides Artifact, or a `.pptx` if asked.

## The handover (`docs/HANDOVER.md`)

**Why.** The owner builds on it with Claude Code; the handover is what makes that work without you being their engineer.

- Walk the owner through `docs/HANDOVER.md`: how to ask Claude Code for changes, what's safe to change, what to ask about first.
- Record a short walkthrough and link it at the end of `docs/HANDOVER.md`.
- Check the owner holds the accounts in their own name (the domain, Stripe, the Apple and Google developer accounts), and give them access to the GitHub repository, Vercel, Supabase and Expo.
- The skeleton is a springboard, not the finished app: be honest about who brings the build capacity.
