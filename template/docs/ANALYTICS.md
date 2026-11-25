# Analytics

Every event the app and the API send to PostHog (off until `POSTHOG_KEY` is set), with the question it answers.
The catalogue is `src/lib/events.ts`; `tests/events.test.ts` fails when the code sends an event it doesn't list, when it lists one nothing sends, or when this page misses one.
A new feature adds its events in the same change: here, in the catalogue, and in the code.
Events carry what people did, never what they wrote: no names, emails, notes or anything typed.
PostHog's own `$pageview` and `$identify` are sent too.

| Event | Sent from | Why |
| -- | -- | -- |
| `signed_up` | API, `api/accounts.ts` | A new account, and its role (`role`) |
| `onboarding_step_seen` | App, `src/app/onboarding.tsx` | A step of onboarding showed (`step`, `position`: 1 the opening to the end; a step the answers leave out keeps its number) |
| `onboarding_step_answered` | App, `src/app/onboarding.tsx` | A step answered: `step`, and for a choice, grid, multi or commit step its ids and enums (`answer`, `count`, `days`, `minutes`, or the step's own `count`); a date, a number measured or words typed send only `step` |
| `onboarding_skipped` | App, `src/app/onboarding.tsx` | Skip, or a step passed by itself (`step`, `reason`: for `notify`, `on`, `blocked` or `unsupported`, or `refused` after Notify me) |
| `onboarding_finished` | App, `src/app/onboarding.tsx` | A way out of onboarding (`how`: `build` for the end's action, `later`, `account`, or the place they're here for; `step`) |
| `onboarding_left` | App, `src/app/onboarding.tsx` | Left without finishing: the app or tab closed, or gone elsewhere (`step`) |
| `checked_in` | App, the store | A check-in after practice, and how it felt (`feel`) |
| `skill_done` | App, the store | A skill on the path done (`skillId`) |
| `entry_created` | App, the store | A member wrote to the owner or coach |
| `media_sent` | App, the store | A video or photo for the coach (`type`) |
| `profile_photo_set` | App, the store | A member added their own photo |
| `profile_photo_removed` | App, the store | A member took their photo off |
| `item_saved` | App, the store | A goal, course or session saved, or its status changed (`kind`, `status`) |
| `item_unsaved` | App, the store | Something un-saved (`kind`) |
| `game_finished` | App, the store | A round of the game (`game`, `points`) |
| `ai_question` | API, `api/ai.ts` | A question to the AI assistant |
| `checkout_started` | App, the store | Stripe Checkout opened for Pro |
| `billing_portal_opened` | App, the store | The billing portal opened |
| `pro_started` | API, `api/stripe-webhook.ts` | A Pro subscription started |
| `pro_ended` | API, `api/stripe-webhook.ts` | A Pro subscription ended |
| `invite_link_shared` | App, Your account | An invite link shared |
| `invite_link_created` | API, `api/accounts.ts` | An invite link made (Tapp) |
| `invite_claimed` | API, `api/accounts.ts` | An invite claimed (`outcome`) |
| `link_clicked` | API, `api/go.ts` | A `/go/<channel>` link opened (`channel`, `platform`, `via`) |
| `tapp_link_received` | App, `src/lib/tapp.native.ts` | An app opened from a link after its install (`source`, `kind`) |
| `landing_way_tapped` | App, `src/components/landing.tsx` | A way in tapped on the landing page (`way`: `app-store`, `google-play`, `web` or `sign-in`) |
| `consent_chosen` | App, `src/components/consent.tsx` | The cookie banner answered (`choice`: `counting` or `all`) |
| `onboarding_reset` | API, `api/accounts.ts` | The owner sent a member back through onboarding |
| `account_removed` | API, `api/accounts.ts` | The owner deleted an account (`role`) |
| `route_builder_opened` | App, `src/app/routes/new.tsx` | Plan a route opened (`from`: `routes`, `edit` or `link`) |
| `route_point_added` | App, `src/app/routes/new.tsx` | A point tapped onto the map (`points`: how many now; never where) |
| `route_saved` | App, the store | A route saved (`profile`, `points`, `distance`: a band such as `5_to_10km`, `straightLegs`) |
| `route_snap_failed` | App, `src/app/routes/new.tsx` | A leg found no road, or snapping failed (`reason`: `no_road`, `unreachable`, `rate_limited`, `off` or `error`) |

## Onboarding's funnel

`onboarding_step_seen` by `position`, then `onboarding_finished` with `how` = `build`: where new members leave on the way in (docs/ONBOARDING.md).
Beside it, `onboarding_finished` by `how`, `onboarding_skipped` by `step` and `reason`, `onboarding_left` by `step`, and `onboarding_step_answered` by its properties.
An app that ends onboarding on something it starts (a program) adds that event after it in the funnel.
