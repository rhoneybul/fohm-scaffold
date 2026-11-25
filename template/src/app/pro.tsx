import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { PageLoader } from '@/components/logo-loader';
import { BackLink } from '@/components/back';
import { Body, Button, Card, Display, ErrorText, Heading, Small, Screen } from '@/components/ui';
import { APP } from '@/lib/brand';
import { isWeb } from '@/lib/config';
import { useStore } from '@/lib/store';
import { isPro } from '@/lib/types';

const money = (cents: number, currency: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);

/**
 * Pro: what it adds, and the way to buy or manage it. Buying happens on the
 * web through Stripe. In the iOS and Android apps this page only points to
 * the website: the app stores require their own in-app purchase for digital
 * subscriptions sold inside an app, so check their current rules before
 * adding a buy button there.
 */
export default function Pro() {
  const { ready, me, integrations, goToBilling } = useStore();
  const params = useLocalSearchParams<{ pro?: string }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A direct visit waits for the session to load before deciding the person is signed out.
  if (!ready) return <PageLoader />;
  if (!me) return <Redirect href="/" />;
  const pro = isPro(me);
  const go = (action: 'checkout' | 'portal') => {
    setBusy(true);
    setError(null);
    goToBilling(action).catch((e) => {
      setError(e?.message ?? 'That didn’t work. Try again.');
      setBusy(false);
    });
  };
  return (
    <Screen>
      <BackLink />
      <Display>{APP.name} Pro</Display>
      {params.pro === 'welcome' && <Body>Welcome to Pro. It can take a few seconds to switch on.</Body>}
      <Card>
        <Heading>What Pro adds</Heading>
        <Body>The AI assistant, answering questions any time.</Body>
        <Small>Add your own Pro features: check `isPro` in the app and `requirePro` on the server.</Small>
      </Card>
      {pro ? (
        <>
          <Body>{me.planSource === 'owner' ? `You have Pro, from the ${APP.ownerWord}.` : 'You have Pro.'}</Body>
          {me.planSource === 'stripe' && isWeb && <Button label="Manage or cancel" onPress={() => go('portal')} busy={busy} />}
        </>
      ) : !integrations.billing ? (
        <Body>Pro isn’t on sale yet. Ask the {APP.ownerWord} about it.</Body>
      ) : isWeb ? (
        <Button label={`Start Pro · ${money(integrations.billing.priceCents, integrations.billing.currency)} a month`} onPress={() => go('checkout')} busy={busy} />
      ) : (
        <Body>To start Pro, sign in on the {APP.name} website.</Body>
      )}
      <ErrorText text={error} />
    </Screen>
  );
}
