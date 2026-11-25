import { AStat, AStats, Counts, Funnel, PageHeader, Section, WeekBars } from '@/components/admin';
import { overview } from '@/lib/overview';
import { useStore } from '@/lib/store';

/** Overview (Naz's): who's signing up, who's coming back, what they're on, and how many go from signing up to paying. */
export default function Overview() {
  const { me, db } = useStore();
  const o = overview(db);
  const pct = (n: number) => (o.members ? `${Math.round((n / o.members) * 100)}% of members` : 'No members yet');
  return (
    <>
      <PageHeader title="Overview" subtitle={me?.role === 'coach' ? 'Your members: who joined, who came back, and what they’re on.' : 'Who’s signing up, who’s coming back, and what they’re on.'} />
      <AStats>
        <AStat label="Members" value={o.members} line={`${o.newThisMonth} in the last 30 days`} />
        <AStat label="New this week" value={o.newThisWeek} line="Joined in the last 7 days" />
        <AStat label="Active this week" value={o.activeThisWeek} line={pct(o.activeThisWeek)} />
        <AStat label="Pro" value={o.paying + o.given} line={`${o.paying} paying, ${o.given} given by you`} />
      </AStats>
      <Section title="Sign-ups by week" line="The last twelve weeks, this week on the right.">
        <WeekBars weeks={o.signUpsByWeek} />
      </Section>
      <Section title="From signing up to paying" line="How many go on to do something, and how many pay.">
        <Funnel steps={o.funnel} />
      </Section>
      <Section title="Where they are" line="The web, iPhone or Android, where each member was last.">
        <Counts rows={o.platforms} empty="No one seen since this was added." />
      </Section>
      <Section title="App versions" line="The iPhone and Android versions members were last on, newest first.">
        <Counts rows={o.versions} empty="No one on the iPhone or Android app yet." />
      </Section>
    </>
  );
}
