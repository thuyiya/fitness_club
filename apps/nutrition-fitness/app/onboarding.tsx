import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeOut, SlideInRight } from 'react-native-reanimated';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { PillButton, Text } from '@/components';
import { useTheme } from '@/theme';
import {
  ActivityLevel,
  DietType,
  Gender,
  Goal,
  MedicalCondition,
  StressLevel,
  TargetSpeed,
  UserProfile,
} from '@/types';
import { useUserStore } from '@/store/userStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Chip, NumberStepper, OptionCard, StepIndicator } from '@/features/onboarding/components';

interface Draft {
  name: string;
  goal: Goal;
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  activityLevel: ActivityLevel;
  bodyFatPct?: number;
  dailySteps: number;
  workoutDaysPerWeek: number;
  diet: DietType;
  allergies: string[];
  medicalConditions: MedicalCondition[];
  sleepHours: number;
  stressLevel: StressLevel;
  waterIntakeMl: number;
  targetSpeed: TargetSpeed;
}

const DEFAULT: Draft = {
  name: '',
  goal: 'lose',
  gender: 'male',
  age: 30,
  heightCm: 175,
  weightKg: 80,
  targetWeightKg: 72,
  activityLevel: 'moderate',
  bodyFatPct: undefined,
  dailySteps: 6000,
  workoutDaysPerWeek: 3,
  diet: 'balanced',
  allergies: [],
  medicalConditions: ['none'],
  sleepHours: 7,
  stressLevel: 'moderate',
  waterIntakeMl: 2000,
  targetSpeed: 'balanced',
};

const ALLERGENS = ['Peanut', 'Dairy', 'Egg', 'Gluten', 'Soy', 'Shellfish', 'Fish', 'Tree nut'];

export default function Onboarding() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const complete = useUserStore((s) => s.completeOnboarding);
  const units = useSettingsStore((s) => s.units);
  const [draft, setDraft] = useState<Draft>(DEFAULT);
  const [step, setStep] = useState(0);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const toggleArray = <K extends 'allergies' | 'medicalConditions'>(
    key: K,
    value: Draft[K][number],
  ) =>
    setDraft((d) => {
      const arr = d[key] as string[];
      const has = arr.includes(value as string);
      return { ...d, [key]: has ? arr.filter((v) => v !== value) : [...arr, value] } as Draft;
    });

  const steps = buildSteps(draft, set, toggleArray, units);
  const total = steps.length;
  const current = steps[step];

  const next = () => {
    if (step < total - 1) {
      setStep((s) => s + 1);
    } else {
      finish();
    }
  };

  const back = () => {
    if (step === 0) router.back();
    else setStep((s) => s - 1);
  };

  const finish = () => {
    const profile: UserProfile = {
      ...draft,
      name: draft.name.trim() || 'Champion',
      muscleMassKg: undefined,
      units,
      createdAt: Date.now(),
    };
    complete(profile);
    router.replace('/ai-loading');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.background]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={back} hitSlop={12} style={styles.backBtn}>
          <ArrowLeft size={22} color={theme.colors.text} />
        </Pressable>
        <StepIndicator step={step} total={total} />
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          key={step}
          entering={SlideInRight.duration(300)}
          exiting={FadeOut.duration(150)}
        >
          <Text variant="caption" color="primary" style={{ letterSpacing: 1 }}>
            STEP {step + 1} OF {total}
          </Text>
          <Text variant="title1" style={{ marginTop: 6, marginBottom: 4 }}>
            {current.title}
          </Text>
          {current.subtitle && (
            <Text variant="subhead" color="textSecondary" style={{ marginBottom: theme.spacing.lg }}>
              {current.subtitle}
            </Text>
          )}
          <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.sm }}>
            {current.content}
          </View>
        </Animated.View>
      </ScrollView>

      <Animated.View
        entering={FadeIn}
        style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}
      >
        <PillButton label={step === total - 1 ? 'Create My Plan' : 'Continue'} onPress={next} />
      </Animated.View>
    </View>
  );
}

interface StepDef {
  title: string;
  subtitle?: string;
  content: React.ReactNode;
}

function buildSteps(
  draft: Draft,
  set: <K extends keyof Draft>(key: K, value: Draft[K]) => void,
  toggle: <K extends 'allergies' | 'medicalConditions'>(key: K, value: Draft[K][number]) => void,
  units: 'metric' | 'imperial',
): StepDef[] {
  const wUnit = units === 'imperial' ? 'lb' : 'kg';
  return [
    {
      title: "What's your goal?",
      subtitle: 'This shapes your entire plan.',
      content: (
        <>
          <OptionCard title="Lose Weight" emoji="📉" selected={draft.goal === 'lose'} onPress={() => set('goal', 'lose')} />
          <OptionCard title="Gain Weight" emoji="📈" selected={draft.goal === 'gain'} onPress={() => set('goal', 'gain')} />
          <OptionCard title="Maintain" emoji="⚖️" selected={draft.goal === 'maintain'} onPress={() => set('goal', 'maintain')} />
        </>
      ),
    },
    {
      title: 'Your gender',
      subtitle: 'Used to estimate your metabolism.',
      content: (
        <>
          <OptionCard title="Male" emoji="👨" selected={draft.gender === 'male'} onPress={() => set('gender', 'male')} />
          <OptionCard title="Female" emoji="👩" selected={draft.gender === 'female'} onPress={() => set('gender', 'female')} />
          <OptionCard title="Other" emoji="🧑" selected={draft.gender === 'other'} onPress={() => set('gender', 'other')} />
        </>
      ),
    },
    {
      title: 'How old are you?',
      content: <NumberStepper value={draft.age} onChange={(v) => set('age', v)} min={13} max={100} unit="yrs" />,
    },
    {
      title: 'Your height',
      content: <NumberStepper value={draft.heightCm} onChange={(v) => set('heightCm', v)} min={120} max={220} unit="cm" />,
    },
    {
      title: 'Current weight',
      content: <NumberStepper value={draft.weightKg} onChange={(v) => set('weightKg', v)} min={35} max={250} step={0.5} unit={wUnit} />,
    },
    {
      title: 'Target weight',
      subtitle: 'Where do you want to be?',
      content: <NumberStepper value={draft.targetWeightKg} onChange={(v) => set('targetWeightKg', v)} min={35} max={250} step={0.5} unit={wUnit} />,
    },
    {
      title: 'Activity level',
      subtitle: 'Outside of planned workouts.',
      content: (
        <>
          <OptionCard title="Sedentary" subtitle="Little to no exercise" selected={draft.activityLevel === 'sedentary'} onPress={() => set('activityLevel', 'sedentary')} />
          <OptionCard title="Light" subtitle="1-2 days/week" selected={draft.activityLevel === 'light'} onPress={() => set('activityLevel', 'light')} />
          <OptionCard title="Moderate" subtitle="3-4 days/week" selected={draft.activityLevel === 'moderate'} onPress={() => set('activityLevel', 'moderate')} />
          <OptionCard title="Active" subtitle="5-6 days/week" selected={draft.activityLevel === 'active'} onPress={() => set('activityLevel', 'active')} />
          <OptionCard title="Very Active" subtitle="Athlete / physical job" selected={draft.activityLevel === 'very_active'} onPress={() => set('activityLevel', 'very_active')} />
        </>
      ),
    },
    {
      title: 'Body fat %',
      subtitle: 'Optional — improves accuracy. Skip if unsure.',
      content: (
        <NumberStepper
          value={draft.bodyFatPct ?? 20}
          onChange={(v) => set('bodyFatPct', v)}
          min={5}
          max={55}
          unit="%"
        />
      ),
    },
    {
      title: 'Daily steps',
      subtitle: 'Your typical day.',
      content: <NumberStepper value={draft.dailySteps} onChange={(v) => set('dailySteps', v)} min={1000} max={25000} step={500} unit="steps" />,
    },
    {
      title: 'Workout days per week',
      content: <NumberStepper value={draft.workoutDaysPerWeek} onChange={(v) => set('workoutDaysPerWeek', v)} min={0} max={7} unit="days" />,
    },
    {
      title: 'Preferred diet',
      content: (
        <>
          <OptionCard title="Balanced" emoji="🍽️" selected={draft.diet === 'balanced'} onPress={() => set('diet', 'balanced')} />
          <OptionCard title="High Protein" emoji="🍗" selected={draft.diet === 'high_protein'} onPress={() => set('diet', 'high_protein')} />
          <OptionCard title="Keto" emoji="🥑" selected={draft.diet === 'keto'} onPress={() => set('diet', 'keto')} />
          <OptionCard title="Low Carb" emoji="🥦" selected={draft.diet === 'low_carb'} onPress={() => set('diet', 'low_carb')} />
          <OptionCard title="Mediterranean" emoji="🫒" selected={draft.diet === 'mediterranean'} onPress={() => set('diet', 'mediterranean')} />
          <OptionCard title="Vegetarian" emoji="🥗" selected={draft.diet === 'vegetarian'} onPress={() => set('diet', 'vegetarian')} />
          <OptionCard title="Vegan" emoji="🌱" selected={draft.diet === 'vegan'} onPress={() => set('diet', 'vegan')} />
        </>
      ),
    },
    {
      title: 'Any food allergies?',
      subtitle: 'Select all that apply.',
      content: (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {ALLERGENS.map((a) => (
            <Chip key={a} label={a} selected={draft.allergies.includes(a)} onPress={() => toggle('allergies', a)} />
          ))}
        </View>
      ),
    },
    {
      title: 'Medical conditions',
      subtitle: 'We tailor advice around these.',
      content: (
        <>
          {(
            [
              ['thyroid', 'Thyroid'],
              ['diabetes', 'Diabetes'],
              ['high_cholesterol', 'High Cholesterol'],
              ['high_blood_pressure', 'High Blood Pressure'],
              ['none', 'None'],
            ] as [MedicalCondition, string][]
          ).map(([value, label]) => (
            <OptionCard
              key={value}
              title={label}
              selected={draft.medicalConditions.includes(value)}
              onPress={() => {
                if (value === 'none') {
                  set('medicalConditions', ['none']);
                } else {
                  const without = draft.medicalConditions.filter((c) => c !== 'none');
                  const has = without.includes(value);
                  set(
                    'medicalConditions',
                    has ? without.filter((c) => c !== value) : [...without, value],
                  );
                }
              }}
            />
          ))}
        </>
      ),
    },
    {
      title: 'Sleep per night',
      content: <NumberStepper value={draft.sleepHours} onChange={(v) => set('sleepHours', v)} min={3} max={12} step={0.5} unit="hrs" />,
    },
    {
      title: 'Stress level',
      content: (
        <>
          <OptionCard title="Low" emoji="😌" selected={draft.stressLevel === 'low'} onPress={() => set('stressLevel', 'low')} />
          <OptionCard title="Moderate" emoji="😐" selected={draft.stressLevel === 'moderate'} onPress={() => set('stressLevel', 'moderate')} />
          <OptionCard title="High" emoji="😰" selected={draft.stressLevel === 'high'} onPress={() => set('stressLevel', 'high')} />
        </>
      ),
    },
    {
      title: 'Daily water intake',
      content: <NumberStepper value={draft.waterIntakeMl} onChange={(v) => set('waterIntakeMl', v)} min={500} max={5000} step={250} unit="ml" />,
    },
    {
      title: 'Target speed',
      subtitle: 'How fast do you want to progress?',
      content: (
        <>
          <OptionCard title="Safe" subtitle="0.5% body weight / week" emoji="🐢" selected={draft.targetSpeed === 'safe'} onPress={() => set('targetSpeed', 'safe')} />
          <OptionCard title="Balanced" subtitle="0.75% body weight / week" emoji="⚡" selected={draft.targetSpeed === 'balanced'} onPress={() => set('targetSpeed', 'balanced')} />
          <OptionCard title="Aggressive" subtitle="1% body weight / week" emoji="🔥" selected={draft.targetSpeed === 'aggressive'} onPress={() => set('targetSpeed', 'aggressive')} />
        </>
      ),
    },
  ];
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: { width: 22 },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
});
