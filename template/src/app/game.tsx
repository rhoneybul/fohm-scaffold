import { Redirect } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { BackLink } from '@/components/back';
import { Body, Button, Display, ErrorText, Heading, Small, Screen } from '@/components/ui';
import { DOT_SIZE, GAME_ID, GAME_NAME, ROUND_SECONDS, bestScore, caught, dotMillis, missed, newGame, place } from '@/lib/game';
import { useStore } from '@/lib/store';
import { C, R, S, T } from '@/lib/theme';

/** The example game. A finished round is saved to the server, so the owner sees it in Activity. */
export default function Game() {
  const { ready, me, db, saveScore } = useStore();
  const [phase, setPhase] = useState<'ready' | 'playing' | 'over'>('ready');
  const [state, setState] = useState(newGame());
  const [left, setLeft] = useState(ROUND_SECONDS);
  const [dot, setDot] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const board = useRef({ width: 300, height: 360 });
  const stateRef = useRef(state);
  stateRef.current = state;

  // The clock.
  useEffect(() => {
    if (phase !== 'playing') return;
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // The round ends: save it.
  useEffect(() => {
    if (phase !== 'playing' || left > 0) return;
    setPhase('over');
    saveScore(GAME_ID, stateRef.current.points, ROUND_SECONDS).catch((e) => setError(e?.message ?? 'Your score didn’t save.'));
  }, [left, phase, saveScore]);

  // The dot moves on by itself if it isn't caught in time.
  useEffect(() => {
    if (phase !== 'playing') return;
    const t = setTimeout(() => {
      setState((s) => missed(s));
      setDot(place(board.current.width, board.current.height));
    }, dotMillis(state.streak));
    return () => clearTimeout(t);
  }, [phase, dot, state.streak]);

  // A direct visit waits for the session to load before deciding the person is signed out.
  if (!ready) return null;
  if (!me) return <Redirect href="/" />;
  const best = bestScore(db.scores.filter((s) => s.memberId === me.id && s.game === GAME_ID));

  function start() {
    setState(newGame());
    setLeft(ROUND_SECONDS);
    setError(null);
    setDot(place(board.current.width, board.current.height));
    setPhase('playing');
  }

  return (
    <Screen scroll={false}>
      <BackLink />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Display>{GAME_NAME}</Display>
        <Small>Best {best}</Small>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Heading style={T.statValue}>{state.points} points</Heading>
        <Heading style={T.statValue}>{phase === 'playing' ? `${left}s` : ''}</Heading>
      </View>
      <Pressable
        onLayout={(e) => (board.current = e.nativeEvent.layout)}
        onPress={() => phase === 'playing' && setState((s) => missed(s))}
        accessibilityLabel="Game board"
        style={{ height: 360, borderRadius: R.xxl, backgroundColor: C.surface, overflow: 'hidden' }}>
        {phase === 'playing' ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              setState((s) => caught(s));
              setDot(place(board.current.width, board.current.height));
            }}
            accessibilityRole="button"
            accessibilityLabel="The dot"
            style={{ position: 'absolute', left: dot.x, top: dot.y, width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2, backgroundColor: C.accent }}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: S.xxl, gap: S.sm }}>
            {phase === 'over' ? (
              <>
                <Heading>{state.points} points</Heading>
                <Body>
                  {state.catches} caught, longest streak {state.best}.
                </Body>
              </>
            ) : (
              <Body style={{ textAlign: 'center' }}>Tap the dot before it moves. Each catch in a row is worth one more point.</Body>
            )}
          </View>
        )}
      </Pressable>
      <ErrorText text={error} />
      {phase !== 'playing' && <Button label={phase === 'over' ? 'Play again' : 'Play'} onPress={start} />}
    </Screen>
  );
}
