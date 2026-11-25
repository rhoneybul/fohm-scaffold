import { Redirect, router } from 'expo-router';

import { BackLink } from '@/components/back';
import { RouteThumb } from '@/components/route-map';
import { Body, Button, Display, Empty, Note, Row, Rows, Screen } from '@/components/ui';
import { hasRoutes } from '@/lib/brand';
import { routeLine } from '@/lib/routes';
import { useStore } from '@/lib/store';

/**
 * Your routes (docs/ROUTES.md): the routes the member planned, as rows on one
 * card, each with its line drawn small, newest first; Plan a route as the one
 * primary. Only while route planning is on (`APP.routes`); until maps are
 * switched on too, it says so plainly and offers no map.
 */
export default function Routes() {
  const { ready, me, db, integrations } = useStore();
  if (!ready) return null;
  if (!me) return <Redirect href="/" />;
  if (!hasRoutes()) return <Redirect href="/home" />;
  const mine = db.routes.filter((r) => r.memberId === me.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const maps = integrations.maps;
  const plan = () => router.push('/routes/new?from=routes');
  return (
    <Screen>
      <BackLink />
      <Display>Your routes</Display>
      {!maps ? (
        <Note icon="map" title="Maps aren’t switched on yet">
          The people who run the app switch them on. Once they have, you can plan a route here on a map of the roads and paths.
        </Note>
      ) : mine.length ? (
        <Body>Tap a route to change it.</Body>
      ) : null}
      {mine.length ? (
        <Rows>
          {mine.map((r) => (
            <Row key={r.id} thumb={<RouteThumb track={r.track} token={maps?.token} />} title={r.name} strong line={routeLine(r)} onPress={maps ? () => router.push(`/routes/new?id=${encodeURIComponent(r.id)}&from=edit`) : undefined} />
          ))}
        </Rows>
      ) : maps ? (
        <Empty icon="map" title="No routes yet" line="Tap points on a map and the route follows the roads and paths between them." />
      ) : null}
      {maps ? <Button label="Plan a route" icon="plus" onPress={plan} /> : null}
    </Screen>
  );
}
