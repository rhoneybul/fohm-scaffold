/**
 * Every event the app and the API send to PostHog, and the question each
 * answers: one list with the code that sends them (`track` in
 * src/lib/analytics.ts, `capture` in api/_lib/analytics.ts) and
 * docs/ANALYTICS.md, held together by tests/events.test.ts. A new feature adds
 * its events here, with their why, in the same change (Naz's catalogue,
 * app/src/telemetry/events.js, is the model). Names are snake_case; never
 * anything a member typed.
 */
export const EVENTS: Record<string, string> = {
  signed_up: 'A new account, and its role: the top of every funnel.',
  assessed: 'A member placed themselves on a level: how many finish onboarding, and where they start.',
  checked_in: 'A member checked in after practice, and how it felt: the habit the app is for.',
  skill_done: 'A member marked a skill on the path done: how far people get.',
  entry_created: 'A member wrote to the owner or coach: how many ask, and how often.',
  media_sent: 'A member attached a video or photo for the coach: the feedback the business sells.',
  profile_photo_set: 'A member added their own photo: how many make the app theirs.',
  profile_photo_removed: 'A member took their photo off.',
  item_saved: 'A member saved a goal, course or session, or changed its status: what people train for.',
  item_unsaved: 'A member un-saved something.',
  game_finished: 'A round of the game finished, with its points.',
  ai_question: 'A Pro member asked the AI assistant a question.',
  checkout_started: 'A member opened Stripe Checkout for Pro: the top of the paid funnel.',
  billing_portal_opened: 'A Pro member opened the billing portal (often to cancel).',
  pro_started: 'Stripe says a Pro subscription started.',
  pro_ended: 'Stripe says a Pro subscription ended.',
  invite_link_shared: 'A member shared their invite link from Your account.',
  invite_link_created: 'The API made a member their invite link (Tapp).',
  invite_claimed: 'Someone who came through an invite link claimed it, and how it went.',
  link_clicked: 'A /go/<channel> link was opened: which places bring people, and whether through Tapp.',
  tapp_link_received: 'An app opened from an invite or channel link after its install.',
  landing_way_tapped: 'A visitor tapped a way in on the landing page (a store, the web app, signing in): which way people come in.',
  consent_chosen: 'A visitor answered the landing page’s cookie banner (counting only, or allow all): how many allow all.',
  onboarding_reset: 'The owner sent a member back through onboarding from the dashboard.',
  account_removed: 'The owner deleted a member’s or coach’s account from the dashboard.',
  route_builder_opened: 'A member opened Plan a route (and from where): how many start planning.',
  route_point_added: 'A member tapped a point onto the map, with how many the route has now (never where): how far people get planning.',
  route_saved: 'A member saved a route, with its profile, how many points, a band for its length and how many legs stayed straight: who finishes planning, and what kind.',
  route_snap_failed: 'A leg of a route found no road, or snapping failed, and why (an enum): how often the dashed line shows, and whether Mapbox or the token is failing.',
};
