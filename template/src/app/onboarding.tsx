import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams, usePathname } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Choice, ChoiceGroup } from '@/components/choice';
import { PageLoader } from '@/components/logo-loader';
import { Sink } from '@/components/board';
import { Button, Card, Chip, ErrorText, IconButton, IconWell, Note, Photo, Row, Rows, TextLink, Thumb, fieldStyle, type IconName } from '@/components/ui';
import { track } from '@/lib/analytics';
import { isWeb } from '@/lib/config';
import {
  HELLO,
  answerProperties,
  dotsAt,
  offered,
  positionOf,
  skipProperties,
  stepAfter,
  stepBefore,
  stepById,
  toggled,
  typedDate,
  type Answer,
  type Answers,
  type OnboardingStep,
} from '@/lib/onboarding';
import { dropWaiting, keepWaiting, markDeviceSeen, readWaiting } from '@/lib/onboardingKept';
import { ONBOARDING, weekTime } from '@/lib/progression';
import { askToNotify, notifyStatus } from '@/lib/push';
import { useStore } from '@/lib/store';
import { C, F, GUTTER, MAX_W, R, S, T, alpha } from '@/lib/theme';

/**
 * A new member's first open (docs/ONBOARDING.md), after Naz's: the opening, a
 * line to a screen over a photo; then straight questions one to a screen,
 * Back, the dots and Skip at the top and the one button at the foot; what
 * they're here for as a grid, which shapes the rest; why it works; their
 * first number, taken there and then; the week they can give; and the end,
 * where they start (an app with programs: their program, built from the
 * answers). The steps are data (`ONBOARDING` in
 * src/lib/progression.ts) and each is its own address (?step=), so the
 * phone's back gesture steps back. Each answer is saved as it's given: to the
 * account signed in, on the device signed out, carried to the account at
 * sign-in (src/app/index.tsx). Opening it at all counts as asked. Each kind
 * of step is drawn here from the kit; an app adds a kind here only when its
 * steps need one the engine doesn't have.
 */
const FLOW = ONBOARDING;

/** What's been answered this visit, so a step gone back to shows its answer. */
const visit: { answers: Answers | null } = { answers: null };

/** Where this visit is, shared by every step's screen on the stack: so leaving is counted once. */
const flow = { step: HELLO, finished: false, left: false };
function leftFlow() {
  if (flow.finished || flow.left) return;
  flow.left = true;
  track('onboarding_left', { step: flow.step });
}

type How = 'build' | 'later' | 'account' | string;

export default function Onboarding() {
  const { ready, me, saveOnboarding } = useStore();
  const params = useLocalSearchParams<{ step?: string }>();
  const step = stepById(FLOW, params.step) ?? FLOW.steps[0];
  const [answers, setAnswersState] = useState<Answers>(visit.answers ?? me?.onboarding?.answers ?? {});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();

  const setAnswers = (next: Answers) => {
    visit.answers = next;
    setAnswersState(next);
  };

  // Opening it counts as asked, on this device and the account. Signed out, answers kept from before come back.
  useEffect(() => {
    if (!ready) return;
    void markDeviceSeen();
    if (me && me.role === 'member' && !me.onboarding?.seenAt) void saveOnboarding({ seenAt: new Date().toISOString(), answers }).catch(() => {});
    if (!me && !visit.answers)
      void readWaiting().then((w) => {
        if (w && !visit.answers) setAnswers(w.answers);
      });
  }, [ready, me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Every step seen is counted, so the funnel shows where members leave.
  useEffect(() => {
    if (step.kind === 'hello') flow.finished = false;
    track('onboarding_step_seen', { step: step.id, position: positionOf(FLOW, step.id) });
  }, [step.id]);

  // The step in front, for leaving: going back brings an earlier one forward again.
  useFocusEffect(
    useCallback(() => {
      flow.step = step.id;
    }, [step.id]),
  );

  // Leaving without finishing (closing the tab or the app, or going anywhere else) is counted once, with where they were.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'background' && leftFlow());
    const page = isWeb && typeof window !== 'undefined' ? window : null;
    page?.addEventListener('pagehide', leftFlow);
    return () => {
      sub.remove();
      page?.removeEventListener('pagehide', leftFlow);
    };
  }, []);
  useEffect(() => {
    if (pathname === '/onboarding') flow.left = false;
    else leftFlow();
  }, [pathname]);

  if (!ready) return <PageLoader />;

  /** Saves the answers as they are now: to the account, or on the device to wait for one. */
  const persist = (next: Answers) => (me ? saveOnboarding({ answers: next }).catch(() => {}) : keepWaiting(next));

  const go = (now: Answers, replace = false) => {
    const after = stepAfter(FLOW, step.id, now);
    if (after) (replace ? router.replace : router.push)(`/onboarding?step=${after.id}` as any);
    else finish(FLOW.landing(now) ?? 'later', now);
  };

  const walk = {
    step,
    answers,
    answer(value: Answer | undefined) {
      const next = { ...answers };
      if (value === undefined) delete next[step.id];
      else next[step.id] = value;
      setAnswers(next);
      track('onboarding_step_answered', answerProperties(step, value));
      void persist(next);
      go(next);
    },
    skip(reason?: string) {
      track('onboarding_skipped', skipProperties(step.id, reason));
      const next = { ...answers };
      delete next[step.id];
      setAnswers(next);
      void persist(next);
      go(next);
    },
    /** A step this device has nothing for passes on in its own place, so Back never lands on it. */
    pass(reason: string) {
      track('onboarding_skipped', skipProperties(step.id, reason));
      go(answers, true);
    },
    back() {
      if (router.canGoBack()) return router.back();
      const before = stepBefore(FLOW, step.id, answers);
      router.replace(`/onboarding?step=${before?.id ?? HELLO}` as any);
    },
    finish: (how: How) => finish(how, answers),
  };

  async function finish(how: How, now: Answers) {
    if (busy) return;
    setError(null);
    flow.finished = true;
    track('onboarding_finished', { how: how.replace(/^\//, ''), step: step.id });
    const done = { answers: now, finishedAt: new Date().toISOString(), how };
    visit.answers = null;
    if (how !== 'build') {
      if (me) void saveOnboarding(done).catch(() => {});
      else void keepWaiting(now);
      if (how === 'account') return router.replace('/sign-in');
      if (how === 'later') return router.replace(me ? '/home' : isWeb ? '/' : '/sign-in');
      return router.replace(how as any);
    }
    // Signed out, the answers wait on the device and carry on once there's an account (src/app/index.tsx).
    if (!me) {
      await keepWaiting(now, true);
      return router.push('/sign-in?mode=up');
    }
    setBusy(true);
    try {
      // An app with programs starts one here from the answers, and opens it building (Strawberry Fields' startBuild).
      await saveOnboarding(done);
      await dropWaiting();
      router.replace((FLOW.end ?? '/home') as any);
    } catch (e: any) {
      flow.finished = false;
      setError(e?.message ?? 'That didn’t work. Try again.');
      setBusy(false);
    }
  }

  const props: StepProps = { walk, signedIn: !!me, busy, error };
  switch (step.kind) {
    case 'hello':
      return <HelloStep {...props} />;
    case 'choice':
      return <ChoiceStep {...props} />;
    case 'multi':
      return <MultiStep {...props} />;
    case 'grid':
      return <GridStep {...props} />;
    case 'why':
      return <WhyStep {...props} />;
    case 'date':
      return <DateStep {...props} />;
    case 'measure':
      return <MeasureStep {...props} />;
    case 'commit':
      return <CommitStep {...props} />;
    case 'notify':
      return <NotifyStep {...props} />;
    case 'text':
      return <TextStep {...props} />;
    default:
      return <ReadyStep {...props} />;
  }
}

interface Walk {
  step: OnboardingStep;
  answers: Answers;
  answer(value: Answer | undefined): void;
  skip(reason?: string): void;
  pass(reason: string): void;
  back(): void;
  finish(how: How): void;
}
interface StepProps {
  walk: Walk;
  signedIn: boolean;
  busy: boolean;
  error: string | null;
}

// ── The frame ──────────────────────────────────────────────────────────────

/** A question's screen: Back, the dots and Skip at the top, the question as its heading, and the button pinned at the foot. */
function StepScreen({ walk, children, foot, timing, title }: { walk: Walk; children: React.ReactNode; foot?: React.ReactNode; timing?: boolean; /** In place of the step's own title (the end's, from the answers). */ title?: string }) {
  const insets = useSafeAreaInsets();
  const { at, of } = dotsAt(FLOW, walk.step.id, walk.answers);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ width: '100%', maxWidth: MAX_W, alignSelf: 'center', paddingHorizontal: GUTTER, paddingTop: S.sm, flexDirection: 'row', alignItems: 'center', gap: S.md }}>
          <IconButton icon="chevron-left" label="Back" tone="surface" onPress={walk.back} />
          {of > 0 && at >= 0 ? <Dots at={at} of={of} /> : <View style={{ flex: 1 }} />}
          {walk.step.kind === 'ready' || timing ? <View style={{ width: 52 }} /> : <SkipButton onPress={() => walk.skip()} label="Skip this question" />}
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ width: '100%', maxWidth: MAX_W, alignSelf: 'center', paddingHorizontal: GUTTER, paddingTop: S.xl, paddingBottom: S.xxxl, gap: S.md }}>
          <Text accessibilityRole="header" style={T.display}>
            {title ?? walk.step.title}
          </Text>
          {walk.step.line ? <Text style={[T.body, { marginBottom: S.sm }]}>{walk.step.line}</Text> : null}
          {children}
        </ScrollView>
        {foot ? <View style={{ width: '100%', maxWidth: MAX_W, alignSelf: 'center', paddingHorizontal: GUTTER, paddingTop: S.md, paddingBottom: Math.max(insets.bottom, S.lg), gap: S.sm }}>{foot}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** The progress dots: the ones behind in ink, this one a longer orange bar, the rest the track's grey. */
function Dots({ at, of }: { at: number; of: number }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={`Step ${at + 1} of ${of}`} accessibilityValue={{ min: 1, max: of, now: at + 1 }} style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5 }}>
      {Array.from({ length: of }, (_, i) => (
        <View key={i} style={{ width: i === at ? 18 : 6, height: 6, borderRadius: R.pill, backgroundColor: i === at ? C.accent : i < at ? C.ink : C.track }} />
      ))}
    </View>
  );
}

function SkipButton({ onPress, label, over }: { onPress: () => void; label: string; over?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6} style={({ pressed }) => ({ minHeight: 44, minWidth: 52, paddingHorizontal: S.md, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: over ? alpha(C.ink, 0.45) : 'transparent', opacity: pressed ? 0.7 : 1 })}>
      <Text style={{ fontFamily: F.semibold, fontSize: 15, color: over ? C.onInk : C.ink }}>Skip</Text>
    </Pressable>
  );
}

// ── The opening ────────────────────────────────────────────────────────────

/** Once's opening: one line at a time under the photo, a tap moving on, Skip over the photo. */
function HelloStep({ walk, signedIn }: StepProps) {
  const [line, setLine] = useState(0);
  const insets = useSafeAreaInsets();
  const { lines, photo } = FLOW.hello;
  const last = line === lines.length - 1;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1, minHeight: 240 }}>
        {photo?.url || photo?.source ? <Image source={photo.source ?? { uri: photo.url }} resizeMode="cover" accessibilityIgnoresInvertColors style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }} /> : null}
        <Sink to={C.bg} from={0.55} />
        <View style={{ position: 'absolute', top: insets.top + S.sm, right: GUTTER }}>
          <SkipButton over onPress={() => walk.finish('later')} label="Skip setup and look around" />
        </View>
        {photo?.credit ? <Text style={[T.caption, { position: 'absolute', left: GUTTER, bottom: S.sm, color: C.inkFaint }]}>{photo.credit}</Text> : null}
      </View>
      <View style={{ width: '100%', maxWidth: MAX_W, alignSelf: 'center', paddingHorizontal: GUTTER, paddingTop: S.lg, paddingBottom: Math.max(insets.bottom, S.lg), gap: S.xl }}>
        <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={[T.hero, { minHeight: 36 * 4 }]}>
          {lines[line]}
        </Text>
        <View style={{ flexDirection: 'row', gap: 6 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {lines.map((_, i) => (
            <View key={i} style={{ width: i === line ? 18 : 6, height: 6, borderRadius: R.pill, backgroundColor: i === line ? C.ink : C.track }} />
          ))}
        </View>
        <View style={{ gap: S.xs }}>
          <Button label={last ? 'Get started' : 'Continue'} onPress={() => (last ? walk.answer(undefined) : setLine(line + 1))} />
          {signedIn ? null : <TextLink label="I already have an account" align="center" arrow={false} onPress={() => walk.finish('account')} />}
        </View>
      </View>
    </View>
  );
}

// ── The questions ──────────────────────────────────────────────────────────

/** One answer from rows: a tap answers and moves on. A long list (a catalogue) narrows with a search, its pinned rows above it. */
function ChoiceStep({ walk }: StepProps) {
  const { step, answers } = walk;
  const [query, setQuery] = useState('');
  const chosen = answers[step.id];
  const options = offered(step.options, answers);
  const found = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? options.filter((o) => `${o.label} ${o.line ?? ''}`.toLowerCase().includes(q)) : options;
    return step.search ? list.slice(0, q ? 20 : 8) : list;
  }, [query, options, step.search]);
  const pick = (id: string) => walk.answer(id);
  return (
    <StepScreen walk={walk} foot={chosen !== undefined ? <Button label="Continue" kind="secondary" onPress={() => walk.answer(chosen)} /> : null}>
      {step.pinned ? (
        <ChoiceGroup label={step.title}>
          {offered(step.pinned, answers).map((o) => (
            <Choice key={o.id} label={o.label} line={o.line} selected={chosen === o.id} onPress={() => pick(o.id)} />
          ))}
        </ChoiceGroup>
      ) : null}
      {step.search ? (
        <TextInput value={query} onChangeText={setQuery} placeholder={step.search.placeholder} placeholderTextColor={C.inkFaint} accessibilityLabel={step.search.label} autoCorrect={false} style={[fieldStyle(), { borderRadius: R.pill, paddingHorizontal: S.xl, marginTop: S.sm }]} />
      ) : null}
      {found.length ? (
        <ChoiceGroup label={step.search ? 'Matches' : step.title}>
          {found.map((o) => (
            <Choice key={o.id} label={o.label} line={o.line} selected={chosen === o.id} onPress={() => pick(o.id)} thumb={step.search ? <Thumb uri={o.photo?.url} icon="map" size={48} /> : undefined} />
          ))}
        </ChoiceGroup>
      ) : (
        <Text style={T.body}>Nothing by that name. Pick one above instead.</Text>
      )}
      {step.note ? <Note icon="alert-triangle">{step.note}</Note> : null}
    </StepScreen>
  );
}

/** Any answers from rows; the none row clears the rest. */
function MultiStep({ walk }: StepProps) {
  const { step, answers } = walk;
  const options = offered(step.options, answers);
  const start = Array.isArray(answers[step.id]) ? (answers[step.id] as string[]) : [];
  const [chosen, setChosen] = useState<string[]>(start);
  const all = step.none ? [step.none, ...options] : options;
  const toggle = (id: string) => setChosen((c) => toggled(all, c, id, step.none?.id));
  return (
    <StepScreen walk={walk} foot={<Button label="Continue" onPress={() => walk.answer(chosen.filter((c) => c !== step.none?.id))} />}>
      <ChoiceGroup label={step.title}>
        {step.none ? <Choice multi label={step.none.label} line={step.none.line} selected={!chosen.some((c) => c !== step.none!.id)} onPress={() => toggle(step.none!.id)} /> : null}
        {options.map((o) => (
          <Choice key={o.id} multi label={o.label} line={o.line} selected={chosen.includes(o.id)} onPress={() => toggle(o.id)} />
        ))}
      </ChoiceGroup>
    </StepScreen>
  );
}

/** What they're here for: a word each, two to a row, any of them. */
function GridStep({ walk }: StepProps) {
  const { step, answers } = walk;
  const [chosen, setChosen] = useState<string[]>(Array.isArray(answers[step.id]) ? (answers[step.id] as string[]) : []);
  const options = offered(step.options, answers);
  return (
    <StepScreen walk={walk} foot={<Button label="Continue" disabled={!chosen.length} onPress={() => walk.answer(chosen)} />}>
      <View accessibilityRole="list" accessibilityLabel={step.title} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
        {options.map((o) => {
          const on = chosen.includes(o.id);
          return (
            <Pressable
              key={o.id}
              onPress={() => setChosen((c) => toggled(options, c, o.id))}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={o.label}
              style={({ pressed }) => ({ flexBasis: '47%', flexGrow: 1, minHeight: 112, padding: S.lg, borderRadius: R.xl, backgroundColor: on ? C.ink : C.surface, justifyContent: 'space-between', opacity: pressed ? 0.85 : 1 })}>
              <Feather name={(o.icon ?? 'circle') as IconName} size={24} color={on ? C.onInk : C.ink} />
              <Text style={[T.title, { color: on ? C.onInk : C.ink }]}>{o.label}</Text>
              {on ? (
                <View style={{ position: 'absolute', top: S.md, right: S.md, width: 24, height: 24, borderRadius: R.pill, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="check" size={15} color={C.onAccent} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </StepScreen>
  );
}

/** Why it works: what the training does, from the research, for what they chose. */
function WhyStep({ walk }: StepProps) {
  const why = FLOW.why(walk.answers);
  return (
    <StepScreen walk={walk} foot={<Button label="Continue" onPress={() => walk.answer(undefined)} />}>
      <Rows>
        {why.rows.map((r) => (
          <Row key={r.id} icon={r.icon as IconName} strong title={r.title} line={r.line} lines={4} chevron={false} role="button" />
        ))}
      </Rows>
      <Text style={T.small}>{why.footnote}</Text>
      {why.note ? <Note>{why.note}</Note> : null}
    </StepScreen>
  );
}

/** A date as day, month and year, or the row that says there isn't one yet. */
function DateStep({ walk }: StepProps) {
  const { step, answers } = walk;
  const was = typeof answers[step.id] === 'string' && /^\d{4}-\d\d-\d\d$/.test(answers[step.id] as string) ? (answers[step.id] as string).split('-') : null;
  const [date, setDate] = useState({ day: was ? String(Number(was[2])) : '', month: was ? String(Number(was[1])) : '', year: was?.[0] ?? '' });
  const typed = typedDate(date.day, date.month, date.year);
  const iso = 'iso' in typed ? typed.iso : null;
  const notBooked = offered(step.notBooked ? [step.notBooked] : [], answers)[0];
  const set = (key: 'day' | 'month' | 'year', max: number) => (v: string) => setDate((d) => ({ ...d, [key]: v.replace(/\D/g, '').slice(0, max) }));
  return (
    <StepScreen walk={walk} foot={<Button label="Continue" disabled={!iso} onPress={() => walk.answer(iso!)} />}>
      <View style={{ flexDirection: 'row', gap: S.sm }}>
        <DateField label="Day" value={date.day} onChange={set('day', 2)} max={2} />
        <DateField label="Month" value={date.month} onChange={set('month', 2)} max={2} />
        <DateField label="Year" value={date.year} onChange={set('year', 4)} max={4} wide />
      </View>
      {iso && step.describe ? <Text style={T.bodyStrong}>{step.describe(iso)}</Text> : null}
      {!iso && date.year.length === 4 && 'problem' in typed ? <ErrorText text={typed.problem} /> : null}
      {notBooked ? (
        <ChoiceGroup>
          <Choice label={notBooked.label} line={notBooked.line} selected={answers[step.id] === notBooked.id} onPress={() => walk.answer(notBooked.id)} />
        </ChoiceGroup>
      ) : null}
    </StepScreen>
  );
}

function DateField({ label, value, max, wide, onChange }: { label: string; value: string; max: number; wide?: boolean; onChange: (v: string) => void }) {
  return (
    <View style={{ gap: S.xs, flex: wide ? 1.4 : 1 }}>
      <Text style={T.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} keyboardType="number-pad" inputMode="numeric" maxLength={max} accessibilityLabel={label} style={[fieldStyle(), { fontFamily: F.display, fontSize: 22, minHeight: 56, fontVariant: ['tabular-nums'] }]} />
    </View>
  );
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Their first number, there and then: how to do it, the clock, then the count typed in. */
function MeasureStep({ walk }: StepProps) {
  const m = walk.step.measure!;
  const [phase, setPhase] = useState<'intro' | 'timing' | 'count'>('intro');
  const [left, setLeft] = useState(m.seconds);
  const [count, setCount] = useState(typeof walk.answers[walk.step.id] === 'number' ? String(walk.answers[walk.step.id]) : '');
  useEffect(() => {
    if (phase !== 'timing') return;
    const t = setInterval(() => setLeft((s) => (s <= 1 ? (clearInterval(t), setPhase('count'), 0) : s - 1)), 1000);
    return () => clearInterval(t);
  }, [phase]);
  const n = Number(count);
  const valid = count !== '' && Number.isInteger(n) && n >= 0 && n <= m.max;
  const foot =
    phase === 'intro' ? (
      <>
        <Button label="Start the clock" icon="play" onPress={() => (setLeft(m.seconds), setPhase('timing'))} />
        <TextLink label="I know my number" align="center" arrow={false} onPress={() => setPhase('count')} />
      </>
    ) : phase === 'timing' ? (
      <Button label="Stop" kind="secondary" onPress={() => setPhase('count')} />
    ) : (
      <Button label={valid ? `Save ${n} ${m.unit}` : 'Save'} disabled={!valid} onPress={() => walk.answer(n)} />
    );
  return (
    <StepScreen walk={walk} foot={foot} timing={phase === 'timing'}>
      {phase === 'intro' ? (
        <Note icon="info" title="How to do it">
          {m.how}
        </Note>
      ) : null}
      {phase === 'timing' ? (
        <View style={{ alignItems: 'center', paddingVertical: S.xxxl, gap: S.sm }}>
          <Text style={[T.clock, { color: C.accent }]} accessibilityLabel={`${left} seconds left`} accessibilityLiveRegion="polite">
            {mmss(left)}
          </Text>
          <Text style={T.lead}>Count every one. The clock stops by itself.</Text>
        </View>
      ) : null}
      {phase === 'count' ? (
        <View style={{ gap: S.sm }}>
          <Text style={T.label}>How many {m.unit}?</Text>
          <TextInput value={count} onChangeText={(v) => setCount(v.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" inputMode="numeric" maxLength={3} accessibilityLabel={`How many ${m.unit}`} autoFocus style={[fieldStyle(), { fontFamily: F.display, fontSize: 40, minHeight: 80, textAlign: 'center', fontVariant: ['tabular-nums'] }]} />
          <TextLink label="Do it again" align="center" arrow={false} onPress={() => (setLeft(m.seconds), setPhase('intro'))} />
        </View>
      ) : null}
    </StepScreen>
  );
}


/** The commitment: days a week and minutes a session, and the time they come to. */
function CommitStep({ walk }: StepProps) {
  const c = walk.step.commit!;
  const was = walk.answers[walk.step.id];
  const start = was && typeof was === 'object' && !Array.isArray(was) ? was : {};
  const [days, setDays] = useState<number>(start.days ?? c.firstDays);
  const [minutes, setMinutes] = useState<number>(start.minutes ?? c.firstMinutes);
  return (
    <StepScreen walk={walk} foot={<Button label="Commit to it" onPress={() => walk.answer({ days, minutes })} />}>
      <Text style={[T.label, { marginTop: S.sm }]}>Days a week</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="Days a week" style={{ flexDirection: 'row', gap: S.sm }}>
        {c.days.map((d) => (
          <Chip key={d} numeric grow label={String(d)} accessibilityLabel={`${d} days a week`} active={d === days} onPress={() => setDays(d)} />
        ))}
      </View>
      <Text style={[T.label, { marginTop: S.md }]}>Minutes a session</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="Minutes a session" style={{ flexDirection: 'row', gap: S.sm }}>
        {c.minutes.map((m) => (
          <Chip key={m} numeric grow label={String(m)} accessibilityLabel={`${m} minutes`} active={m === minutes} onPress={() => setMinutes(m)} />
        ))}
      </View>
      <Text style={[T.h2, { marginTop: S.xl }]} accessibilityLiveRegion="polite">
        {weekTime(days * minutes)}
      </Text>
      {walk.step.after ? <Text style={T.body}>{walk.step.after}</Text> : null}
    </StepScreen>
  );
}

/** Ladder's "Get notified": only where this device can be asked now; elsewhere it passes on by itself. */
function NotifyStep({ walk }: StepProps) {
  const [status, setStatus] = useState<'ask' | 'on' | 'blocked' | 'unsupported' | null>(null);
  const [asking, setAsking] = useState(false);
  const passed = useRef(false);
  useEffect(() => {
    notifyStatus().then((s) => {
      setStatus(s);
      if (s !== 'ask' && !passed.current) {
        passed.current = true;
        walk.pass(s);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (status !== 'ask') return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const turnOn = async () => {
    setAsking(true);
    const on = await askToNotify();
    setAsking(false);
    if (on) walk.answer('on');
    else walk.skip('refused');
  };
  return (
    <StepScreen walk={walk} foot={<Button label="Notify me" icon="bell" busy={asking} onPress={turnOn} />}>
      {walk.step.preview ? (
        <Rows>
          <Row icon="bell" strong title={walk.step.preview.title} line={walk.step.preview.line} chevron={false} />
        </Rows>
      ) : null}
    </StepScreen>
  );
}

/** Words typed, optional: they never reach analytics. */
function TextStep({ walk }: StepProps) {
  const was = walk.answers[walk.step.id];
  const [text, setText] = useState(typeof was === 'string' ? was : '');
  return (
    <StepScreen walk={walk} foot={<Button label="Continue" onPress={() => (text.trim() ? walk.answer(text.trim()) : walk.skip())} />}>
      <TextInput value={text} onChangeText={setText} multiline maxLength={1000} placeholder={walk.step.placeholder} placeholderTextColor={C.inkFaint} accessibilityLabel={walk.step.title} style={[fieldStyle(), { minHeight: 140, textAlignVertical: 'top' }]} />
      {walk.step.note ? <Text style={T.small}>{walk.step.note}</Text> : null}
    </StepScreen>
  );
}

// ── The end ────────────────────────────────────────────────────────────────

/** Their program, from their answers: its photo, what it is, what it builds up to, and the way in. */
function ReadyStep({ walk, signedIn, busy, error }: StepProps) {
  const card = FLOW.ready(walk.answers);
  return (
    <StepScreen
      walk={walk}
      title={card.title}
      foot={
        <>
          <ErrorText text={error} />
          <Button label={signedIn ? card.action : card.actionSignedOut} busy={busy} onPress={() => walk.finish('build')} />
          <TextLink label="Look around first" align="center" arrow={false} tone="muted" onPress={() => walk.finish('later')} />
        </>
      }>
      {card.photo?.url ? <Photo uri={card.photo.url} ratio={16 / 10} radius={R.xxl} icon="image" label={card.title} /> : null}
      {card.photo?.credit ? <Text style={[T.caption, { color: C.inkFaint, marginTop: -S.xs }]}>{card.photo.credit}</Text> : null}
      <Text style={T.body}>{card.line}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
        {card.facts.map((f) => (
          <View key={f} style={{ paddingHorizontal: S.md, minHeight: 32, justifyContent: 'center', borderRadius: R.pill, backgroundColor: C.surface }}>
            <Text style={[T.label, { color: C.ink }]}>{f}</Text>
          </View>
        ))}
      </View>
      <Text style={[T.heading, { marginTop: S.md }]}>What it builds up to</Text>
      <Card style={{ gap: S.lg }}>
        {card.upTo.map((line) => (
          <View key={line} style={{ flexDirection: 'row', gap: S.md, alignItems: 'flex-start' }}>
            <IconWell icon="check" />
            <Text style={[T.body, { flex: 1, color: C.ink, paddingTop: 5 }]}>{line}</Text>
          </View>
        ))}
      </Card>
      {card.note ? <Note>{card.note}</Note> : null}
    </StepScreen>
  );
}

