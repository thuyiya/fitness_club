import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Activity, Heart, Lock } from 'lucide-react-native';
import {
  BarChart,
  Card,
  FadeInView,
  Gauge,
  GlassCard,
  ProgressRing,
  Screen,
  SectionHeader,
  SegmentedControl,
  Text,
  WeightChart,
} from '@/components';
import { useTheme } from '@/theme';
import { useUserStore } from '@/store/userStore';
import { computeAchievements } from '@/data/achievements';
import { buildInsights } from '@/lib/planEngine';
import { clamp } from '@/lib/calculations';
import { formatWeight } from '@/lib/format';
import { useSettingsStore } from '@/store/settingsStore';

type Horizon = '1m' | '3m' | '6m' | '1y';
const HORIZON_WEEKS: Record<Horizon, number> = { '1m': 4, '3m': 13, '6m': 26, '1y': 52 };

export default function Progress() {
  const theme = useTheme();
  const profile = useUserStore((s) => s.profile);
  const plan = useUserStore((s) => s.plan);
  const history = useUserStore((s) => s.weightHistory);
  const units = useSettingsStore((s) => s.units);
  const [horizon, setHorizon] = useState<Horizon>('3m');

  const insights = useMemo(
    () => (profile && plan ? buildInsights(profile, plan) : []),
    [profile, plan],
  );

  const achievements = useMemo(
    () =>
      computeAchievements({
        weightHistory: history,
        totalWalkingKm: 42,
        streakDays: 12,
        proteinDaysHit: 8,
        waterDaysHit: 11,
        workoutsCompleted: 6,
      }),
    [history],
  );

  if (!profile || !plan) {
    return (
      <Screen>
        <Text>Loading…</Text>
      </Screen>
    );
  }

  const { metrics, prediction } = plan;

  const predictionData = useMemo(() => {
    const weeks = HORIZON_WEEKS[horizon];
    const pts = prediction.milestones
      .filter((m) => m.week <= weeks)
      .map((m) => ({ x: m.week, y: m.expectedWeightKg }));
    // If plan finishes before horizon, extend flat at target.
    const last = pts[pts.length - 1];
    if (last && last.x < weeks) {
      pts.push({ x: weeks, y: last.y });
    }
    return [{ x: 0, y: profile.weightKg }, ...pts];
  }, [horizon, prediction, profile.weightKg]);

  const predictedWeight =
    predictionData[predictionData.length - 1]?.y ?? profile.weightKg;

  const leanMass = profile.weightKg * (1 - metrics.bodyFatPct / 100);

  const weeklyBars = [
    { label: 'Mon', value: 320 },
    { label: 'Tue', value: 480 },
    { label: 'Wed', value: 250 },
    { label: 'Thu', value: 540 },
    { label: 'Fri', value: 410 },
    { label: 'Sat', value: 600 },
    { label: 'Sun', value: 380 },
  ];

  return (
    <Screen>
      <View style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.md }}>
        <Text variant="largeTitle">Progress</Text>
        <Text variant="subhead" color="textTertiary">Your journey, measured</Text>
      </View>

      {/* Weight prediction */}
      <FadeInView delay={40}>
        <SectionHeader title="Weight Prediction" />
        <Card>
          <SegmentedControl<Horizon>
            value={horizon}
            onChange={setHorizon}
            options={[
              { label: '1M', value: '1m' },
              { label: '3M', value: '3m' },
              { label: '6M', value: '6m' },
              { label: '1Y', value: '1y' },
            ]}
          />
          <View style={{ marginTop: theme.spacing.md, alignItems: 'center' }}>
            <Text variant="caption" color="textTertiary">PROJECTED WEIGHT</Text>
            <Text variant="numberMedium" color="primary">
              {formatWeight(predictedWeight, units)}
            </Text>
          </View>
          <WeightChart
            data={predictionData}
            targetY={profile.targetWeightKg}
            width={300}
            height={180}
          />
        </Card>
      </FadeInView>

      {/* Health dashboard gauges */}
      <FadeInView delay={100}>
        <SectionHeader title="Health Dashboard" subtitle="Your body composition" />
        <GlassCard>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', rowGap: theme.spacing.md }}>
            <Gauge
              value={clamp((metrics.bmi - 15) / 20, 0, 1)}
              label="BMI"
              displayValue={`${metrics.bmi}`}
              color={theme.colors.primary}
            />
            <Gauge
              value={clamp(metrics.bodyFatPct / 45, 0, 1)}
              label="Body Fat"
              displayValue={`${metrics.bodyFatPct}%`}
              color={theme.colors.fat}
              gradientTo={theme.colors.danger}
            />
            <Gauge
              value={clamp(metrics.bmr / 2500, 0, 1)}
              label="BMR"
              displayValue={`${metrics.bmr}`}
              color={theme.colors.warning}
              gradientTo={theme.colors.danger}
            />
            <Gauge
              value={clamp(metrics.tdee / 3500, 0, 1)}
              label="TDEE"
              displayValue={`${metrics.tdee}`}
              color={theme.colors.success}
              gradientTo={theme.colors.walking}
            />
          </View>
        </GlassCard>
      </FadeInView>

      {/* Composition rings */}
      <FadeInView delay={160}>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
          <GlassCard style={{ flex: 1 }}>
            <View style={{ alignItems: 'center' }}>
              <ProgressRing
                size={90}
                strokeWidth={9}
                progress={clamp(leanMass / profile.weightKg, 0, 1)}
                color={theme.colors.success}
                value={`${Math.round(leanMass)}`}
                label="kg lean"
              />
              <Text variant="footnote" color="textSecondary" style={{ marginTop: 8 }}>Lean Mass</Text>
            </View>
          </GlassCard>
          <GlassCard style={{ flex: 1 }}>
            <View style={{ alignItems: 'center' }}>
              <ProgressRing
                size={90}
                strokeWidth={9}
                progress={clamp((metrics.visceralFat ?? 5) / 20, 0, 1)}
                color={theme.colors.warning}
                gradientTo={theme.colors.danger}
                value={`${metrics.visceralFat}`}
                label="level"
              />
              <Text variant="footnote" color="textSecondary" style={{ marginTop: 8 }}>Visceral Fat</Text>
            </View>
          </GlassCard>
        </View>
      </FadeInView>

      {/* Weekly activity */}
      <FadeInView delay={220}>
        <SectionHeader title="This Week" subtitle="Calories burned per day" />
        <Card>
          <BarChart data={weeklyBars} color={theme.colors.primary} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing.md }}>
            <Avg label="Weekly avg" value="426 kcal" />
            <Avg label="Monthly avg" value="398 kcal" />
            <Avg label="Best day" value="600 kcal" />
          </View>
        </Card>
      </FadeInView>

      {/* Insights */}
      <FadeInView delay={280}>
        <SectionHeader title="Insights" subtitle="Personalized observations" />
        <View style={{ gap: theme.spacing.sm }}>
          {insights.map((ins) => {
            const tone =
              ins.tone === 'positive'
                ? theme.colors.success
                : ins.tone === 'warning'
                  ? theme.colors.warning
                  : theme.colors.primary;
            return (
              <GlassCard key={ins.id} padded={false}>
                <View style={{ flexDirection: 'row', gap: theme.spacing.md, padding: theme.spacing.md }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: tone + '1A',
                    }}
                  >
                    <Text style={{ fontSize: 22 }}>{ins.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="headline">{ins.title}</Text>
                    <Text variant="footnote" color="textSecondary" style={{ marginTop: 2 }}>
                      {ins.detail}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            );
          })}
        </View>
      </FadeInView>

      {/* Achievements */}
      <FadeInView delay={340}>
        <SectionHeader title="Achievements" subtitle={`${achievements.filter((a) => a.unlocked).length} unlocked`} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {achievements.map((a) => (
            <GlassCard key={a.id} style={{ flexBasis: '48%', flexGrow: 1 }} padded={false}>
              <View style={{ padding: theme.spacing.md, alignItems: 'center', gap: 4 }}>
                <View style={{ opacity: a.unlocked ? 1 : 0.35 }}>
                  <Text style={{ fontSize: 34 }}>{a.emoji}</Text>
                  {!a.unlocked && (
                    <View style={{ position: 'absolute', right: -4, bottom: -4 }}>
                      <Lock size={14} color={theme.colors.textTertiary} />
                    </View>
                  )}
                </View>
                <Text variant="subhead" style={{ fontWeight: '700' }} center>{a.title}</Text>
                <Text variant="caption" color="textTertiary" center>{a.description}</Text>
                <View
                  style={{
                    height: 5,
                    width: '100%',
                    borderRadius: 3,
                    backgroundColor: theme.colors.separator,
                    overflow: 'hidden',
                    marginTop: 4,
                  }}
                >
                  <View
                    style={{
                      height: 5,
                      width: `${Math.round(a.progress * 100)}%`,
                      borderRadius: 3,
                      backgroundColor: a.unlocked ? theme.colors.success : theme.colors.primary,
                    }}
                  />
                </View>
              </View>
            </GlassCard>
          ))}
        </View>
      </FadeInView>

      <View style={{ height: theme.spacing.lg }} />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, alignItems: 'center' }}>
        <Heart size={14} color={theme.colors.danger} />
        <Text variant="caption" color="textTertiary">Keep going — every day counts</Text>
        <Activity size={14} color={theme.colors.primary} />
      </View>
    </Screen>
  );
}

function Avg({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text variant="headline">{value}</Text>
      <Text variant="caption" color="textTertiary">{label}</Text>
    </View>
  );
}
