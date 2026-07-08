import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronDown, Moon, Star, Sunrise } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {
  Card,
  FadeInView,
  GlassCard,
  Screen,
  SectionHeader,
  SleepEntryEditor,
  SleepHistoryChart,
  Text,
} from '@/components';
import { useTheme } from '@/theme';
import { useLogStore } from '@/store/logStore';
import { useUserStore } from '@/store/userStore';

function fmtHours(h: number): string {
  return Number.isInteger(h) ? `${h}` : h.toFixed(1);
}

function fmtClock(t?: string): string {
  if (!t) return '—';
  const [hRaw, m] = t.split(':').map(Number);
  const period = hRaw >= 12 ? 'PM' : 'AM';
  const h12 = hRaw % 12 === 0 ? 12 : hRaw % 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

function relativeDay(dateKey: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yest = y.toISOString().slice(0, 10);
  if (dateKey === today) return 'Last night';
  if (dateKey === yest) return 'Two nights ago';
  const d = new Date(dateKey + 'T12:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function SleepScreen() {
  const theme = useTheme();
  const today = useLogStore((s) => s.today());
  const setSleepDetails = useLogStore((s) => s.setSleepDetails);
  const sleepHistory = useLogStore((s) => s.sleepHistory);
  const profile = useUserStore((s) => s.profile);

  const targetHours = profile?.sleepHours && profile.sleepHours > 0 ? profile.sleepHours : 8;
  const nights = useMemo(() => sleepHistory(7), [sleepHistory, today]);
  const recent = useMemo(() => [...nights].reverse().slice(0, 5), [nights]);

  const hasToday =
    today.sleepHours > 0 ||
    today.sleepQuality != null ||
    today.bedTime != null ||
    today.wakeTime != null;

  const close = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.back();
  };

  return (
    <Screen>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.spacing.md,
        }}
      >
        <View>
          <Text variant="largeTitle">Sleep</Text>
          <Text variant="subhead" color="textTertiary">
            Log last night and see your rest
          </Text>
        </View>
        <Pressable onPress={close} hitSlop={8}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.surfaceGlass,
              borderWidth: 1,
              borderColor: theme.colors.separator,
            }}
          >
            <ChevronDown size={22} color={theme.colors.text} />
          </View>
        </Pressable>
      </View>

      {/* Hero — last night */}
      <FadeInView delay={20}>
        <GlassCard>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.colors.secondary + '1F',
              }}
            >
              <Moon size={28} color={theme.colors.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              {hasToday ? (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                    <Text variant="numberMedium">{fmtHours(today.sleepHours)}</Text>
                    <Text variant="title3" color="textSecondary">h last night</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: 2 }}>
                    {today.bedTime && today.wakeTime && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Moon size={13} color={theme.colors.textTertiary} />
                        <Text variant="caption" color="textTertiary">
                          {fmtClock(today.bedTime)}
                        </Text>
                        <Sunrise size={13} color={theme.colors.textTertiary} />
                        <Text variant="caption" color="textTertiary">
                          {fmtClock(today.wakeTime)}
                        </Text>
                      </View>
                    )}
                    {today.sleepQuality != null && (
                      <View style={{ flexDirection: 'row', gap: 1 }}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            size={12}
                            color={theme.colors.warning}
                            fill={n <= (today.sleepQuality ?? 0) ? theme.colors.warning : 'transparent'}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                </>
              ) : (
                <>
                  <Text variant="title3">How did you sleep?</Text>
                  <Text variant="caption" color="textTertiary">
                    Log last night below to start your trend
                  </Text>
                </>
              )}
            </View>
          </View>
          {hasToday && today.sleepNote ? (
            <Text variant="footnote" color="textSecondary" style={{ marginTop: theme.spacing.md }}>
              “{today.sleepNote}”
            </Text>
          ) : null}
        </GlassCard>
      </FadeInView>

      {/* Editor */}
      <FadeInView delay={60}>
        <SectionHeader title="Log your sleep" subtitle="Update any time" />
        <SleepEntryEditor
          initial={{
            sleepHours: today.sleepHours,
            sleepQuality: today.sleepQuality,
            bedTime: today.bedTime,
            wakeTime: today.wakeTime,
            sleepNote: today.sleepNote,
          }}
          onSave={setSleepDetails}
        />
      </FadeInView>

      {/* Trend */}
      <FadeInView delay={120}>
        <SectionHeader title="Last 7 nights" subtitle="Your recent rest" />
        <Card>
          <SleepHistoryChart nights={nights} targetHours={targetHours} />
        </Card>
      </FadeInView>

      {/* Recent list */}
      {recent.length > 0 && (
        <FadeInView delay={180}>
          <SectionHeader title="History" />
          <View style={{ gap: theme.spacing.sm }}>
            {recent.map((n) => (
              <GlassCard key={n.date} padded={false}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing.md,
                    padding: theme.spacing.md,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: theme.colors.secondary + '18',
                    }}
                  >
                    <Text variant="headline" color="text">{fmtHours(n.sleepHours)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="subhead" style={{ fontWeight: '600' }}>{relativeDay(n.date)}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      {n.bedTime && n.wakeTime ? (
                        <Text variant="caption" color="textTertiary">
                          {fmtClock(n.bedTime)} → {fmtClock(n.wakeTime)}
                        </Text>
                      ) : (
                        <Text variant="caption" color="textTertiary">{fmtHours(n.sleepHours)} hours</Text>
                      )}
                    </View>
                  </View>
                  {n.sleepQuality != null && (
                    <View style={{ flexDirection: 'row', gap: 1 }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={12}
                          color={theme.colors.warning}
                          fill={s <= (n.sleepQuality ?? 0) ? theme.colors.warning : 'transparent'}
                        />
                      ))}
                    </View>
                  )}
                </View>
              </GlassCard>
            ))}
          </View>
        </FadeInView>
      )}

      <View style={{ height: theme.spacing.lg }} />
    </Screen>
  );
}
