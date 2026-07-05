import React from 'react';
import { Pressable, View } from 'react-native';
import { Sparkles, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';
import { SectionHeader } from './SectionHeader';
import { ExpandableCard } from './ExpandableCard';
import { useCoachPlanStore } from '@/store/coachPlanStore';

/**
 * "From your coach" — plans the user saved from the Coach chat, shown on the
 * Workouts and Meals tabs. Nothing renders until at least one plan is saved.
 */
export function CoachPlans({ kind }: { kind: 'workout' | 'meal' }) {
  const theme = useTheme();
  const plans = useCoachPlanStore((s) => (kind === 'workout' ? s.workout : s.meal));
  const removePlan = useCoachPlanStore((s) => s.removePlan);

  if (plans.length === 0) return null;

  return (
    <View style={{ marginBottom: theme.spacing.md }}>
      <SectionHeader title="From your coach" subtitle="Plans you saved from the Coach chat" />
      <View style={{ gap: theme.spacing.sm }}>
        {plans.map((p) => (
          <ExpandableCard
            key={p.id}
            header={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.colors.primary + '18',
                  }}
                >
                  <Sparkles size={18} color={theme.colors.primary} />
                </View>
                <Text variant="headline" style={{ flex: 1 }} numberOfLines={1}>
                  {p.title}
                </Text>
              </View>
            }
          >
            <Text variant="footnote" color="textSecondary" style={{ lineHeight: 21 }}>
              {p.body}
            </Text>
            <Pressable onPress={() => removePlan(kind, p.id)} style={{ alignSelf: 'flex-start' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 }}>
                <Trash2 size={15} color={theme.colors.danger} />
                <Text variant="subhead" style={{ color: theme.colors.danger }}>
                  Remove
                </Text>
              </View>
            </Pressable>
          </ExpandableCard>
        ))}
      </View>
    </View>
  );
}
