import { Linking } from 'react-native';

import { ARow, ARows, AText, Badge, PageHeader, Section } from '@/components/admin';
import { Avatar } from '@/components/avatar';
import { APP, hasCoach } from '@/lib/brand';
import { storeButtons } from '@/lib/landing';
import { useStore } from '@/lib/store';

/** What the app is connected to: every integration, on or off, and what switches it on; the stores; who owns it. */
export default function Settings() {
  const { me, backend, integrations: i, db } = useStore();
  if (me?.role !== 'owner') return null;
  const owners = db.users.filter((u) => u.role === 'owner');
  const stores = storeButtons(APP.stores);
  const rows: [string, boolean, string, string][] = [
    ['Database and login (Supabase)', backend?.mode === 'api', 'Everything is kept on the server, and People and Activity show every member.', 'SUPABASE_DB_URL, SUPABASE_PUBLISHABLE_KEY. Until then the app runs in demo mode, on each device.'],
    ['Payments for Pro (Stripe)', !!i.billing, i.billing ? `Pro at ${(i.billing.priceCents / 100).toFixed(2)} ${i.billing.currency.toUpperCase()} a month; the landing page shows the price.` : '', 'STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET'],
    ['Product analytics (PostHog)', !!i.posthog, 'Screens and events, never what anyone writes; the landing page asks visitors about counting.', 'POSTHOG_KEY, POSTHOG_HOST'],
    ['Error reports (Sentry)', !!i.sentry, 'Every crash in the app and every server error.', 'SENTRY_DSN'],
    ['Email (Resend)', i.email, 'A welcome to each new member, and emails about replies.', 'RESEND_API_KEY, EMAIL_FROM'],
    ['AI assistant (Claude)', i.ai, 'Pro members can ask it; every question and answer is on the member’s page.', 'ANTHROPIC_API_KEY'],
    ['Continue with Google', i.google, 'A one-tap sign-in on the web.', 'Supabase → Authentication → Sign In / Providers → Google'],
    ['Share links that survive the install (Tapp)', !!i.tapp, 'Who invited whom, and which link people came through, on People.', 'TAPP_AUTH_TOKEN, TAPP_TOKEN; the iOS and Android apps need a store build with it'],
    ...(APP.routes ? [['Maps and route planning (Mapbox)', !!i.maps, 'Members plan routes on a map, on the roads and paths; each one shows on their page.', 'MAPBOX_TOKEN (a public pk. token, restricted to the site’s address in Mapbox)'] as [string, boolean, string, string]] : []),
    ['Push notifications (Expo)', i.push && backend?.mode === 'api', 'Replies reach members’ phones.', 'The iOS and Android apps, after npx eas-cli init'],
  ];
  return (
    <>
      <PageHeader title="Settings" subtitle="What the app is connected to. Each one switches on when its variable is set in Vercel, then a redeploy." />
      <Section title="Integrations" line={`${rows.filter((r) => r[1]).length} of ${rows.length} on.`}>
        <ARows>
          {rows.map(([name, on, what, how]) => (
            <ARow key={name} title={name} line={on ? what || 'On' : `Off. To switch on: ${how}`} right={<Badge label={on ? 'On' : 'Off'} tone={on ? 'good' : 'neutral'} />} />
          ))}
        </ARows>
      </Section>
      <Section title="The stores" line="The landing page leads with a pill to each store the apps are in (APP.stores in src/lib/brand.ts).">
        <ARows>
          {stores.length ? (
            stores.map((s) => <ARow key={s.store} title={s.name} line={s.url} right={<Badge label="Listed" tone="good" />} onPress={() => Linking.openURL(s.url)} />)
          ) : (
            <ARow title="Not in a store yet" line="Until then the landing page leads with the web app." right={<Badge label="Web only" />} />
          )}
        </ARows>
      </Section>
      {hasCoach() ? (
        <Section title="Coaches">
          <AText>Coaches sign up like anyone else, ticking “I coach here” and entering the coach code (COACH_CODE in Vercel). Then assign members to them from each member’s page; a coach sees only their own members.</AText>
        </Section>
      ) : null}
      <Section title={`Owners (${owners.length})`} line="Owners sign up with the owner code (OWNER_CODE in Vercel).">
        <ARows>
          {owners.map((o) => (
            <ARow key={o.id} lead={<Avatar name={o.name} photoPath={o.photoPath} size={32} dark />} title={o.name} line={o.email} />
          ))}
        </ARows>
      </Section>
    </>
  );
}
