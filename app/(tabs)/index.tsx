import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Href, router } from 'expo-router';
import {
  ArrowRight,
  Droplets,
  Flame,
  Footprints,
  Dumbbell,
  HeartPulse,
  Sparkles,
  Beef,
  UtensilsCrossed,
} from 'lucide-react-native';
import {
  Card,
  FadeInView,
  GlassCard,
  ProgressRing,
  Screen,
  SectionHeader,
  StatTile,
  Text,
  WeightChart,
} from '@/components';
import { useTheme } from '@/theme';
import { useUserStore } from '@/store/userStore';
import { useLogStore } from '@/store/logStore';
import { useSettingsStore } from '@/store/settingsStore';
import { coachHeadlines } from '@/lib/planEngine';
import { formatDate, formatWeight, greeting } from '@/lib/format';

export default function Dashboard() {
  const theme = useTheme();
  const profile = useUserStore((s) => s.profile);
  const plan = useUserStore((s) => s.plan);
  const log = useLogStore((s) => s.today());
  const units = useSettingsStore((s) => s.units);

  const headlines = useMemo(
    () => (profile && plan ? coachHeadlines(profile, plan) : []),
    [profile, plan],
  );
  const [headlineIdx] = useState(() => Math.floor(Date.now() / 86400000) % 4);

  // Before the health questionnaire, we don't invent numbers — the goal, rings
  // and plan sections stay hidden behind a gentle prompt to set up the profile.
  if (!profile || !plan) {
    return (
      <Screen>
        <FadeInView delay={0}>
          <View style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.lg }}>
            <Text variant="subhead" color="textTertiary">
              {greeting()}
            </Text>
            <Text variant="largeTitle">Welcome to Solace 👋</Text>
            <Text variant="footnote" color="textTertiary" style={{ marginTop: 2 }}>
              Nourish the body · calm the mind
            </Text>
          </View>
        </FadeInView>

        <FadeInView delay={80}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: theme.radius.xxl, padding: theme.spacing.xl, ...theme.shadows.glow }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: theme.spacing.md,
              }}
            >
              <HeartPulse size={26} color="#fff" />
            </View>
            <Text variant="title2" color="textInverse">
              Let’s complete your health profile
            </Text>
            <Text
              variant="body"
              color="textInverse"
              style={{ marginTop: 6, lineHeight: 24, color: 'rgba(255,255,255,0.9)' }}
            >
              Add your age, height and weight so we can shape your nutrition, workouts and progress
              around you.
            </Text>
            <Pressable
              onPress={() => router.push('/onboarding')}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                height: 50,
                borderRadius: theme.radius.pill,
                backgroundColor: '#fff',
                marginTop: theme.spacing.lg,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text variant="headline" color="primary">
                Get started
              </Text>
              <ArrowRight size={18} color={theme.colors.primary} />
            </Pressable>
          </LinearGradient>
        </FadeInView>

        <FadeInView delay={140}>
          <SectionHeader title="Meanwhile" subtitle="No setup needed" />
          <Pressable onPress={() => router.push('/calm' as Href)}>
            <GlassCard>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.colors.water + '1A',
                  }}
                >
                  <HeartPulse size={22} color={theme.colors.water} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="headline">Find your calm</Text>
                  <Text variant="caption" color="textTertiary">
                    Breathe and clear your mind
                  </Text>
                </View>
                <ArrowRight size={18} color={theme.colors.textTertiary} />
              </View>
            </GlassCard>
          </Pressable>
        </FadeInView>
      </Screen>
    );
  }

  const { targets, prediction, metrics } = plan;

  const rings = [
    {
      label: 'Calories',
      value: `${log.caloriesConsumed}`,
      progress: log.caloriesConsumed / targets.calories,
      color: theme.colors.warning,
      to: theme.colors.danger,
      icon: <Flame size={18} color={theme.colors.warning} />,
    },
    {
      label: 'Protein',
      value: `${log.proteinG}g`,
      progress: log.proteinG / targets.proteinG,
      color: theme.colors.protein,
      to: theme.colors.secondary,
      icon: <Beef size={18} color={theme.colors.protein} />,
    },
    {
      label: 'Water',
      value: `${(log.waterMl / 1000).toFixed(1)}L`,
      progress: log.waterMl / targets.waterMl,
      color: theme.colors.water,
      to: theme.colors.primary,
      icon: <Droplets size={18} color={theme.colors.water} />,
    },
    {
      label: 'Walking',
      value: `${log.walkingMinutes}m`,
      progress: log.walkingMinutes / targets.walkingMinutes,
      color: theme.colors.walking,
      to: theme.colors.success,
      icon: <Footprints size={18} color={theme.colors.walking} />,
    },
    {
      label: 'Workout',
      value: `${log.workoutMinutes}m`,
      progress: log.workoutMinutes / targets.workoutMinutes,
      color: theme.colors.success,
      to: theme.colors.walking,
      icon: <Dumbbell size={18} color={theme.colors.success} />,
    },
  ];

  const chartData = useMemo(() => {
    const start = { x: 0, y: profile.weightKg };
    const pts = prediction.milestones.map((m) => ({ x: m.week, y: m.expectedWeightKg }));
    return [start, ...pts];
  }, [prediction, profile.weightKg]);

  return (
    <Screen>
      {/* Greeting */}
      <FadeInView delay={0}>
        <View style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.md }}>
          <Text variant="subhead" color="textTertiary">
            {greeting()}
          </Text>
          <Text variant="largeTitle">{profile.name} 👋</Text>
          <Text variant="footnote" color="textTertiary" style={{ marginTop: 2 }}>
            Nourish the body · calm the mind
          </Text>
        </View>
      </FadeInView>

      {/* Goal card */}
      <FadeInView delay={80}>
        <GoalCard
          currentWeight={formatWeight(profile.weightKg, units)}
          targetWeight={formatWeight(profile.targetWeightKg, units)}
          finishDate={formatDate(prediction.finishDate)}
          daysRemaining={prediction.daysRemaining}
          weeklyRate={`${prediction.weeklyRateKg} ${units === 'imperial' ? 'lb' : 'kg'}/wk`}
        />
      </FadeInView>

      {/* Quick actions — Meals, Workouts & Calm now live here */}
      <FadeInView delay={130}>
        <SectionHeader title="Quick Actions" />
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <QuickAction
            label="Meals"
            hint="Log & plan"
            color={theme.colors.warning}
            icon={<UtensilsCrossed size={22} color={theme.colors.warning} />}
            onPress={() => router.push('/meals')}
          />
          <QuickAction
            label="Workouts"
            hint="Train & move"
            color={theme.colors.success}
            icon={<Dumbbell size={22} color={theme.colors.success} />}
            onPress={() => router.push('/workouts')}
          />
          <QuickAction
            label="Calm"
            hint="Breathe & relax"
            color={theme.colors.water}
            icon={<HeartPulse size={22} color={theme.colors.water} />}
            onPress={() => router.push('/calm' as Href)}
          />
        </View>
      </FadeInView>

      {/* Rings */}
      <FadeInView delay={160}>
        <SectionHeader title="Today's Rings" subtitle="Tap Meals & Workouts to log" />
        <GlassCard>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-around',
              rowGap: theme.spacing.md,
            }}
          >
            {rings.map((r) => (
              <ProgressRing
                key={r.label}
                size={96}
                strokeWidth={9}
                progress={r.progress}
                color={r.color}
                gradientTo={r.to}
                value={r.value}
                label={r.label}
                icon={r.icon}
              />
            ))}
          </View>
        </GlassCard>
      </FadeInView>

      {/* Daily targets */}
      <FadeInView delay={220}>
        <SectionHeader title="Daily Targets" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          <StatTile
            style={{ flexBasis: '48%', flexGrow: 1 }}
            label="Calories"
            value={`${targets.calories}`}
            unit="kcal"
            accent={theme.colors.warning}
            icon={<Flame size={18} color={theme.colors.warning} />}
          />
          <StatTile
            style={{ flexBasis: '48%', flexGrow: 1 }}
            label="Protein"
            value={`${targets.proteinG}`}
            unit="g"
            accent={theme.colors.protein}
            icon={<Beef size={18} color={theme.colors.protein} />}
          />
          <StatTile
            style={{ flexBasis: '48%', flexGrow: 1 }}
            label="Carbs"
            value={`${targets.carbsG}`}
            unit="g"
            accent={theme.colors.carbs}
            icon={<Text style={{ fontSize: 16 }}>🍞</Text>}
          />
          <StatTile
            style={{ flexBasis: '48%', flexGrow: 1 }}
            label="Fat"
            value={`${targets.fatG}`}
            unit="g"
            accent={theme.colors.fat}
            icon={<Text style={{ fontSize: 16 }}>🥑</Text>}
          />
        </View>
      </FadeInView>

      {/* Weight timeline */}
      <FadeInView delay={280}>
        <SectionHeader title="Weight Timeline" subtitle={`Projected finish ${formatDate(prediction.finishDate)}`} />
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm }}>
            <View>
              <Text variant="caption" color="textTertiary">CURRENT</Text>
              <Text variant="title3">{formatWeight(profile.weightKg, units)}</Text>
            </View>
            <ArrowRight size={20} color={theme.colors.textTertiary} style={{ alignSelf: 'center' }} />
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="caption" color="textTertiary">TARGET</Text>
              <Text variant="title3" color="success">{formatWeight(profile.targetWeightKg, units)}</Text>
            </View>
          </View>
          <WeightChart data={chartData} targetY={profile.targetWeightKg} width={300} height={180} />
        </Card>
      </FadeInView>

      {/* Coach card */}
      <FadeInView delay={340}>
        <SectionHeader title="Your Coach" actionLabel="Chat" onAction={() => router.push('/coach')} />
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: theme.radius.xl, padding: theme.spacing.lg, ...theme.shadows.glow }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Sparkles size={20} color="#fff" />
            <Text variant="headline" color="textInverse">Coach insight</Text>
          </View>
          <Text variant="body" color="textInverse" style={{ lineHeight: 24 }}>
            {headlines[headlineIdx]}
          </Text>
        </LinearGradient>
      </FadeInView>

      {/* Weekly milestones */}
      <FadeInView delay={400}>
        <SectionHeader title="Weekly Milestones" subtitle="Your predicted path" />
        <View style={{ gap: theme.spacing.sm }}>
          {prediction.milestones.slice(0, 4).map((m) => (
            <GlassCard key={m.week} padded={false}>
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, gap: theme.spacing.md }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.colors.primary + '18',
                  }}
                >
                  <Text variant="footnote" color="primary" style={{ fontWeight: '700' }}>
                    W{m.week}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="headline">{formatWeight(m.expectedWeightKg, units)}</Text>
                  <Text variant="caption" color="textTertiary">
                    {m.calories} kcal · {m.workoutMinutes}m workout · {m.walkingMinutes}m walk
                  </Text>
                </View>
                <Text variant="caption" color="textTertiary">{formatDate(m.date).replace(/,.*/, '')}</Text>
              </View>
            </GlassCard>
          ))}
        </View>
        <View style={{ height: theme.spacing.xl }} />
        <Text variant="caption" color="textTertiary" center>
          BMI {metrics.bmi} · TDEE {metrics.tdee} kcal · Body fat ~{metrics.bodyFatPct}%
        </Text>
      </FadeInView>
    </Screen>
  );
}

function GoalCard({
  currentWeight,
  targetWeight,
  finishDate,
  daysRemaining,
  weeklyRate,
}: {
  currentWeight: string;
  targetWeight: string;
  finishDate: string;
  daysRemaining: number;
  weeklyRate: string;
}) {
  const theme = useTheme();
  return (
    <LinearGradient
      colors={[theme.colors.primary, theme.colors.secondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: theme.radius.xxl, padding: theme.spacing.xl, ...theme.shadows.glow }}
    >
      <Text variant="footnote" style={{ color: 'rgba(255,255,255,0.8)' }}>YOUR GOAL</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.md, marginTop: 6 }}>
        <View>
          <Text variant="caption" style={{ color: 'rgba(255,255,255,0.7)' }}>Current</Text>
          <Text variant="numberMedium" color="textInverse">{currentWeight}</Text>
        </View>
        <ArrowRight size={24} color="rgba(255,255,255,0.8)" style={{ marginBottom: 6 }} />
        <View>
          <Text variant="caption" style={{ color: 'rgba(255,255,255,0.7)' }}>Target</Text>
          <Text variant="numberMedium" color="textInverse">{targetWeight}</Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          marginTop: theme.spacing.lg,
          borderTopWidth: StyleSheetHairline(),
          borderTopColor: 'rgba(255,255,255,0.2)',
          paddingTop: theme.spacing.md,
        }}
      >
        <GoalStat label="Finish" value={finishDate} />
        <GoalStat label="Days left" value={`${daysRemaining}`} />
        <GoalStat label="Weekly" value={weeklyRate} />
      </View>
    </LinearGradient>
  );
}

function GoalStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text variant="caption" style={{ color: 'rgba(255,255,255,0.7)' }}>{label}</Text>
      <Text variant="subhead" color="textInverse" style={{ fontWeight: '700', marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}

function QuickAction({
  label,
  hint,
  color,
  icon,
  onPress,
}: {
  label: string;
  hint: string;
  color: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        opacity: pressed ? 0.7 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <GlassCard>
        <View style={{ alignItems: 'center', gap: 8, paddingVertical: theme.spacing.xs }}>
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: color + '1A',
            }}
          >
            {icon}
          </View>
          <Text variant="footnote" style={{ fontWeight: '700' }}>
            {label}
          </Text>
          <Text variant="caption" color="textTertiary">
            {hint}
          </Text>
        </View>
      </GlassCard>
    </Pressable>
  );
}

function StyleSheetHairline() {
  return 1;
}
