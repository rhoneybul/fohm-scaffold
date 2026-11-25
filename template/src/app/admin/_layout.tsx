import { Redirect, Slot, router } from 'expo-router';

import { AdminShell } from '@/components/admin';
import { PageLoader } from '@/components/logo-loader';
import { needsYou } from '@/lib/activity';
import { useStore } from '@/lib/store';
import { A } from '@/lib/theme';

/** The owner and coaches get in (a coach sees only their own members; the server decides). A few pages, kept simple on purpose (AGENTS.md): People with what needs you on top, the Overview's numbers, Activity, and the owner's Settings. */
export default function AdminLayout() {
  const { ready, me, db, signOut } = useStore();
  if (!ready) return <PageLoader ground={A.bg} color={A.text} />;
  if (!me || (me.role !== 'owner' && me.role !== 'coach')) return <Redirect href="/" />;
  const waiting = needsYou(db).length;
  return (
    <AdminShell
      user={me}
      onSignOut={() => signOut().then(() => router.replace('/'))}
      items={[
        { href: '/admin', label: 'People', icon: 'people-outline', badge: waiting, match: ['/admin/people'] },
        { href: '/admin/overview', label: 'Overview', icon: 'stats-chart-outline' },
        { href: '/admin/activity', label: 'Activity', icon: 'pulse-outline' },
        ...(me.role === 'owner' ? [{ href: '/admin/settings', label: 'Settings', icon: 'settings-outline' as const }] : []),
      ]}>
      <Slot />
    </AdminShell>
  );
}
