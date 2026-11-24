import { AMuted, AText, Badge, PageHeader, Panel, Section } from '@/components/admin';
import { useStore } from '@/lib/store';

/** What the app is connected to: each integration, on or off, and the variable that switches it on. */
export default function Settings() {
  const { me, backend, integrations: i, db } = useStore();
  if (me?.role !== 'owner') return null;
  const owners = db.users.filter((u) => u.role === 'owner');
  const rows: [string, boolean, string][] = [
    ['Database and login (Supabase)', backend?.mode === 'api', 'SUPABASE_DB_URL, SUPABASE_PUBLISHABLE_KEY'],
    ['Payments for Pro (Stripe)', !!i.billing, 'STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET'],
    ['Product analytics (PostHog)', !!i.posthog, 'POSTHOG_KEY, POSTHOG_HOST'],
    ['Error reports (Sentry)', !!i.sentry, 'SENTRY_DSN'],
    ['Email (Resend)', i.email, 'RESEND_API_KEY, EMAIL_FROM'],
    ['AI assistant (Claude)', i.ai, 'ANTHROPIC_API_KEY'],
    ['Continue with Google', i.google, 'Supabase → Authentication → Sign In / Providers → Google'],
    ['Share links that survive the install (Tapp)', !!i.tapp, 'TAPP_AUTH_TOKEN, TAPP_TOKEN; the iOS and Android apps need a store build with it'],
    ['Push notifications (Expo)', i.push && backend?.mode === 'api', 'The iOS and Android apps, after npx eas-cli init'],
  ];
  return (
    <>
      <PageHeader title="Settings" subtitle="What the app is connected to. Each one switches on when its variable is set in Vercel, then a redeploy." />
      <Section title="Integrations">
        {rows.map(([name, on, how]) => (
          <Panel key={name}>
            <Badge label={on ? 'On' : 'Off'} tone={on ? 'good' : 'neutral'} />
            <AText>{name}</AText>
            {!on && <AMuted>{how}</AMuted>}
          </Panel>
        ))}
      </Section>
      <Section title="Coaches">
        <AText>
          Coaches sign up like anyone else, ticking “I coach here” and entering the coach code (COACH_CODE in Vercel). Then assign members to them from each member’s page; a coach sees only their own members.
        </AText>
      </Section>
      <Section title={`Owners (${owners.length})`}>
        {owners.map((o) => (
          <AText key={o.id}>
            {o.name} · {o.email}
          </AText>
        ))}
      </Section>
    </>
  );
}
