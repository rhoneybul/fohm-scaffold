import { Feather } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { C, F, R, S } from '@/lib/theme';

/**
 * One answer to pick: a big outlined rounded block, a bold label and an
 * optional grey line under it; ink with white type once chosen. `multi` makes
 * it a checkbox with a tick.
 */
export function Choice({ label, line, selected, onPress, multi }: { label: string; line?: string; selected: boolean; onPress: () => void; multi?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityLabel={line ? `${label}. ${line}` : label}
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => ({
        minHeight: line ? 76 : 60,
        flexDirection: 'row',
        alignItems: 'center',
        gap: S.md,
        paddingHorizontal: S.lg + 4,
        paddingVertical: S.md + 2,
        borderRadius: R.lg,
        borderWidth: 1.5,
        borderColor: selected ? C.ink : C.line,
        backgroundColor: selected ? C.ink : C.surface,
        opacity: pressed ? 0.85 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontFamily: F.bold, fontSize: 18, lineHeight: 22, letterSpacing: -0.3, color: selected ? C.onInk : C.ink }}>{label}</Text>
        {line ? <Text style={{ fontFamily: F.regular, fontSize: 14, lineHeight: 19, color: selected ? C.onInkMid : C.inkMid }}>{line}</Text> : null}
      </View>
      {multi ? (
        <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: selected ? C.onInk : C.line, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? C.onInk : 'transparent' }}>
          {selected ? <Feather name="check" size={15} color={C.ink} /> : null}
        </View>
      ) : null}
    </Pressable>
  );
}
