import { Pressable, Text } from 'react-native';

import { C, R, S, sans } from '@/lib/theme';

/** One answer to pick from a list: a full-width row, 48pt tall, selected in the accent. */
export function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={{ minHeight: 52, justifyContent: 'center', paddingHorizontal: S.lg, borderRadius: R.md, borderWidth: selected ? 2 : 1, borderColor: selected ? C.accent : C.border, backgroundColor: selected ? C.accentSoft : C.surface }}>
      <Text style={{ fontFamily: sans, fontSize: 16, color: C.ink, fontWeight: selected ? '600' : '400' }}>{label}</Text>
    </Pressable>
  );
}
