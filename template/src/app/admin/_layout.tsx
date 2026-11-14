import { Redirect, Slot, router } from 'expo-router';

import { AdminShell } from '@/components/admin';
import { needsYou } from '@/lib/activity';
import { useStore } from '@/lib/store';

/** The owner and coaches get in (a coach sees only their own members; the server decides). Three pages, kept simple on purpose (AGENTS.md). */
export default function AdminLayout() {
  const { ready, me, db, signOut } = useStore();
  if (!ready) return null;
  if (!me || (me.role !== 'owner' && me.role !== 'coach')) return <Redirect href="/" />;
  const waiting = needsYou(db).length;
  return (
    <AdminShell
      user={me}
      onSignOut={() => signOut().then(() => router.replace('/'))}
      items={[
        { href: '/admin', label: 'People', icon: 'people-outline', badge: waiting, match: ['/admin/people'] },
        { href: '/admin/activity', label: 'Activity', icon: 'pulse-outline' },
        ...(me.role === 'owner' ? [{ href: '/admin/settings', label: 'Settings', icon: 'settings-outline' as const }] : []),
      ]}>
      <Slot />
    </AdminShell>
  );
}
