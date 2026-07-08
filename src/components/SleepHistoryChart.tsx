import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme';
import { SleepNight } from '@/types';
import { Text } from './Text';
import { BarChart, Bar } from './BarChart';

interface SleepHistoryChartProps {
  nights: SleepNight[];
  /** Target hours to show as a reference in the summary. */
  targetHours?: number;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function weekdayLabel(dateKey: string): string {
  // dateKey is YYYY-MM-DD; parse as local noon to avoid TZ off-by-one.
  const d = new Date(dateKey + 'T12:00:00');
  return WEEKDAYS[d.getDay()] ?? '';
}

/**
 * Recent-nights sleep trend. Reuses the shared BarChart for the bars and adds
 * an average / best summary row underneath.
 */
export function SleepHistoryChart({ nights, targetHours }: SleepHistoryChartProps) {
  const theme = useTheme();

  const { bars, avg, best } = useMemo(() => {
    const withSleep = nights.filter((n) => n.sleepHours > 0);
    const data: Bar[] = withSleep.map((n) => ({
      label: weekdayLabel(n.date),
      value: n.sleepHours,
    }));
    const total = withSleep.reduce((s, n) => s + n.sleepHours, 0);
    return {
      bars: data,
      avg: withSleep.length ? total / withSleep.length : 0,
      best: withSleep.reduce((m, n) => Math.max(m, n.sleepHours), 0),
    };
  }, [nights]);

  if (bars.length === 0) {
    return (
      <View style={{ paddingVertical: theme.spacing.xl, alignItems: 'center' }}>
        <Text color="textTertiary">No nights logged yet</Text>
      </View>
    );
  }

  const fmt = (h: number) => (Number.isInteger(h) ? `${h}` : h.toFixed(1));

  return (
    <View>
      <BarChart data={bars} color={theme.colors.secondary} height={140} />
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: theme.spacing.md,
        }}
      >
        <Summary label="Average" value={`${fmt(avg)} h`} />
        <Summary label="Best" value={`${fmt(best)} h`} />
        {targetHours != null && <Summary label="Target" value={`${fmt(targetHours)} h`} />}
      </View>
    </View>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text variant="headline">{value}</Text>
      <Text variant="caption" color="textTertiary">{label}</Text>
    </View>
  );
}
