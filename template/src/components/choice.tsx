import { Feather } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';

import { Row, Rows } from '@/components/ui';
import { C, R } from '@/lib/theme';

/**
 * One answer to pick, as Etapa's pick-one rows: a Space Grotesk label and a
 * line under it, and at the right a ring that fills ink with a tick once
 * chosen (a rounded box when several can be: `multi`). Put the answers in a
 * `ChoiceGroup`: a list is rows on one card.
 */
export function Choice({ label, line, selected, onPress, multi }: { label: string; line?: string; selected: boolean; onPress: () => void; multi?: boolean }) {
  return (
    <Row
      strong
      title={label}
      line={line}
      lines={3}
      role={multi ? 'checkbox' : 'radio'}
      selected={selected}
      label={line ? `${label}. ${line}` : label}
      onPress={onPress}
      right={
        <View style={{ width: 24, height: 24, borderRadius: multi ? R.sm - 1 : R.pill, borderWidth: selected ? 0 : 1.5, borderColor: C.line, backgroundColor: selected ? C.ink : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
          {selected ? <Feather name="check" size={15} color={C.onInk} /> : null}
        </View>
      }
    />
  );
}

/** The answers to one question on one card, a hairline between each. */
export function ChoiceGroup({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Rows>{children}</Rows>
    </View>
  );
}
