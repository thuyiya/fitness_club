import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Redirect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Check, Clock, Flame, Plus, Signal } from 'lucide-react-native';
import {
  CoachPlans,
  ExpandableCard,
  FadeInView,
  GlassCard,
  Screen,
  SectionHeader,
  Text,
} from '@/components';
import { useTheme } from '@/theme';
import { useUserStore } from '@/store/userStore';
import { useLogStore } from '@/store/logStore';
import { WORKOUT_LIBRARY } from '@/data/workouts';
import { Workout, WorkoutCategory } from '@/types';

const CATEGORIES: { label: string; value: WorkoutCategory | 'all'; emoji: string }[] = [
  { label: 'All', value: 'all', emoji: '✨' },
  { label: 'Walking', value: 'walking', emoji: '🚶' },
  { label: 'Running', value: 'running', emoji: '🏃' },
  { label: 'Gym', value: 'gym', emoji: '🏋️' },
  { label: 'Home', value: 'home', emoji: '🏠' },
  { label: 'HIIT', value: 'hiit', emoji: '🔥' },
  { label: 'Yoga', value: 'yoga', emoji: '🧘' },
  { label: 'Stretch', value: 'stretching', emoji: '🤸' },
];

const DIFFICULTY_COLOR: Record<Workout['difficulty'], keyof typeof colorMap> = {
  beginner: 'success',
  intermediate: 'warning',
  advanced: 'danger',
};
const colorMap = { success: 1, warning: 1, danger: 1 };

export default function Workouts() {
  const theme = useTheme();
  const plan = useUserStore((s) => s.plan);
  const profile = useUserStore((s) => s.profile);
  const addWorkout = useLogStore((s) => s.addWorkout);
  const [cat, setCat] = useState<WorkoutCategory | 'all'>('all');
  const [done, setDone] = useState<Record<string, boolean>>({});

  const list = useMemo(
    () => (cat === 'all' ? WORKOUT_LIBRARY : WORKOUT_LIBRARY.filter((w) => w.category === cat)),
    [cat],
  );

  const logWorkout = (w: Workout) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    addWorkout(w.durationMinutes);
    setDone((d) => ({ ...d, [w.id]: true }));
  };

  // Workouts need a plan — if the user hasn't set up their health profile yet,
  // send them to the questionnaire (Home normally gates this entry point).
  if (!profile || !plan) return <Redirect href="/onboarding" />;

  return (
    <Screen>
      <View style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.md }}>
        <Text variant="largeTitle">Workouts</Text>
        <Text variant="subhead" color="textTertiary">
          {profile?.workoutDaysPerWeek}× / week · {plan?.targets.workoutMinutes}min today
        </Text>
      </View>

      <CoachPlans kind="workout" />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
      >
        {CATEGORIES.map((c) => {
          const active = c.value === cat;
          return (
            <Pressable
              key={c.value}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setCat(c.value);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.xs + 2,
                borderRadius: theme.radius.pill,
                backgroundColor: active ? theme.colors.primary : theme.colors.backgroundElevated,
                borderWidth: 1,
                borderColor: active ? theme.colors.primary : theme.colors.cardBorder,
              }}
            >
              <Text style={{ fontSize: 14 }}>{c.emoji}</Text>
              <Text variant="subhead" color={active ? 'textInverse' : 'textSecondary'}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
        {list.map((w, i) => (
          <FadeInView key={w.id} delay={i * 50}>
            <WorkoutCard workout={w} done={!!done[w.id]} onLog={() => logWorkout(w)} />
          </FadeInView>
        ))}
      </View>
    </Screen>
  );
}

function WorkoutCard({
  workout,
  done,
  onLog,
}: {
  workout: Workout;
  done: boolean;
  onLog: () => void;
}) {
  const theme = useTheme();
  const diffColor = theme.colors[DIFFICULTY_COLOR[workout.difficulty]];

  return (
    <ExpandableCard
      header={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.primary + '14',
            }}
          >
            <Text style={{ fontSize: 26 }}>{workout.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="headline">{workout.name}</Text>
            <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginTop: 3 }}>
              <Meta icon={<Clock size={13} color={theme.colors.textTertiary} />} text={`${workout.durationMinutes}m`} />
              <Meta icon={<Flame size={13} color={theme.colors.warning} />} text={`${workout.caloriesBurned}`} />
              <Meta
                icon={<Signal size={13} color={diffColor} />}
                text={workout.difficulty}
              />
            </View>
          </View>
        </View>
      }
    >
      <Text variant="footnote" color="textSecondary">{workout.description}</Text>
      <Text variant="subhead" style={{ fontWeight: '700', marginTop: 8 }}>Exercises</Text>
      {workout.exercises.map((ex, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: 6,
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: theme.colors.separator,
          }}
        >
          <Text variant="callout" style={{ flex: 1 }}>{ex.name}</Text>
          <Text variant="footnote" color="textTertiary">
            {ex.sets}×{ex.reps}
            {ex.restSeconds > 0 ? ` · ${ex.restSeconds}s rest` : ''}
          </Text>
        </View>
      ))}

      <Pressable
        onPress={onLog}
        disabled={done}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          height: 48,
          borderRadius: theme.radius.pill,
          marginTop: theme.spacing.md,
          backgroundColor: done ? theme.colors.success : theme.colors.primary,
        }}
      >
        {done ? <Check size={18} color="#fff" /> : <Plus size={18} color="#fff" />}
        <Text variant="headline" color="textInverse">
          {done ? 'Completed' : 'Start & Log'}
        </Text>
      </Pressable>
    </ExpandableCard>
  );
}

function Meta({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      {icon}
      <Text variant="caption" color="textTertiary" style={{ textTransform: 'capitalize' }}>
        {text}
      </Text>
    </View>
  );
}
