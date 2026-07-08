import React, { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { ChevronDown, ChevronUp, Minus, Moon, Plus, Star, Sunrise } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { SleepDetails } from '@/types';
import { Text } from './Text';
import { Card } from './Card';
import { SegmentedControl } from './SegmentedControl';
import { PillButton } from './PillButton';

/** Compute hours between "HH:MM" bed and wake times, wrapping past midnight. */
function hoursBetween(bed: string, wake: string): number {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const diff = (toMin(wake) - toMin(bed) + 1440) % 1440;
  return Math.round((diff / 60) * 10) / 10;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

const QUALITY_LABELS = ['—', 'Rough', 'Restless', 'Okay', 'Good', 'Deep'];

interface SleepEntryEditorProps {
  initial: SleepDetails;
  onSave: (details: SleepDetails) => void;
}

/**
 * The sleep input surface: choose bedtime + wake time (hours derived), or log
 * a plain hour total, then rate quality and jot an optional note.
 */
export function SleepEntryEditor({ initial, onSave }: SleepEntryEditorProps) {
  const theme = useTheme();

  const [mode, setMode] = useState<'times' | 'hours'>(
    initial.bedTime && initial.wakeTime ? 'times' : 'hours',
  );
  const [bedTime, setBedTime] = useState(initial.bedTime ?? '23:00');
  const [wakeTime, setWakeTime] = useState(initial.wakeTime ?? '07:00');
  const [hours, setHours] = useState(initial.sleepHours && initial.sleepHours > 0 ? initial.sleepHours : 7.5);
  const [quality, setQuality] = useState(initial.sleepQuality ?? 0);
  const [note, setNote] = useState(initial.sleepNote ?? '');

  const derivedHours = useMemo(() => hoursBetween(bedTime, wakeTime), [bedTime, wakeTime]);
  const effectiveHours = mode === 'times' ? derivedHours : hours;

  const save = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (mode === 'times') {
      onSave({
        bedTime,
        wakeTime,
        sleepHours: derivedHours,
        sleepQuality: quality || undefined,
        sleepNote: note.trim() || undefined,
      });
    } else {
      onSave({
        bedTime: undefined,
        wakeTime: undefined,
        sleepHours: hours,
        sleepQuality: quality || undefined,
        sleepNote: note.trim() || undefined,
      });
    }
  };

  return (
    <Card>
      <SegmentedControl<'times' | 'hours'>
        value={mode}
        onChange={setMode}
        options={[
          { label: 'Bed & wake', value: 'times' },
          { label: 'Just hours', value: 'hours' },
        ]}
      />

      {/* Duration read-out */}
      <View style={{ alignItems: 'center', marginTop: theme.spacing.lg, marginBottom: theme.spacing.md }}>
        <Text variant="caption" color="textTertiary">TIME ASLEEP</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Text variant="numberLarge" color="primary">
            {Number.isInteger(effectiveHours) ? effectiveHours : effectiveHours.toFixed(1)}
          </Text>
          <Text variant="title3" color="textSecondary">h</Text>
        </View>
      </View>

      {mode === 'times' ? (
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <TimeField
            label="Bedtime"
            icon={<Moon size={16} color={theme.colors.secondary} />}
            value={bedTime}
            onChange={setBedTime}
          />
          <TimeField
            label="Wake up"
            icon={<Sunrise size={16} color={theme.colors.warning} />}
            value={wakeTime}
            onChange={setWakeTime}
          />
        </View>
      ) : (
        <HourStepper value={hours} onChange={setHours} />
      )}

      {/* Quality stars */}
      <View style={{ marginTop: theme.spacing.xl }}>
        <Text variant="footnote" color="textSecondary" style={{ marginBottom: theme.spacing.xs }}>
          How rested do you feel?
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          {[1, 2, 3, 4, 5].map((n) => {
            const active = n <= quality;
            return (
              <Pressable
                key={n}
                hitSlop={6}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setQuality(n === quality ? 0 : n);
                }}
              >
                <Star
                  size={30}
                  color={active ? theme.colors.warning : theme.colors.textTertiary}
                  fill={active ? theme.colors.warning : 'transparent'}
                  strokeWidth={1.75}
                />
              </Pressable>
            );
          })}
          <Text variant="footnote" color="textTertiary" style={{ marginLeft: 4 }}>
            {QUALITY_LABELS[quality]}
          </Text>
        </View>
      </View>

      {/* Note */}
      <View style={{ marginTop: theme.spacing.lg }}>
        <Text variant="footnote" color="textSecondary" style={{ marginBottom: theme.spacing.xs }}>
          Note (optional)
        </Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Woke up a few times, vivid dreams…"
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          style={{
            minHeight: 56,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.separator,
            backgroundColor: theme.colors.surfaceGlass,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            color: theme.colors.text,
            ...theme.typography.body,
            textAlignVertical: 'top',
          }}
        />
      </View>

      <View style={{ marginTop: theme.spacing.lg }}>
        <PillButton label="Save last night" onPress={save} />
      </View>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

function TimeField({
  label,
  icon,
  value,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
}) {
  const theme = useTheme();
  const [h, m] = value.split(':').map(Number);

  const set = (nh: number, nm: number) => {
    Haptics.selectionAsync().catch(() => {});
    onChange(`${pad((nh + 24) % 24)}:${pad((nm + 60) % 60)}`);
  };

  return (
    <View
      style={{
        flex: 1,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.separator,
        backgroundColor: theme.colors.surfaceGlass,
        padding: theme.spacing.md,
        alignItems: 'center',
        gap: theme.spacing.xs,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon}
        <Text variant="footnote" color="textSecondary">{label}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Column
          value={pad(h)}
          onUp={() => set(h + 1, m)}
          onDown={() => set(h - 1, m)}
        />
        <Text variant="title2" color="textTertiary">:</Text>
        <Column
          value={pad(m)}
          onUp={() => set(h, m + 5)}
          onDown={() => set(h, m - 5)}
        />
      </View>
    </View>
  );
}

function Column({ value, onUp, onDown }: { value: string; onUp: () => void; onDown: () => void }) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center' }}>
      <Pressable onPress={onUp} hitSlop={8} style={{ padding: 2 }}>
        <ChevronUp size={20} color={theme.colors.primary} />
      </Pressable>
      <Text variant="title2" style={{ minWidth: 34, textAlign: 'center' }}>{value}</Text>
      <Pressable onPress={onDown} hitSlop={8} style={{ padding: 2 }}>
        <ChevronDown size={20} color={theme.colors.primary} />
      </Pressable>
    </View>
  );
}

function HourStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const theme = useTheme();
  const step = (delta: number) => {
    Haptics.selectionAsync().catch(() => {});
    onChange(Math.min(14, Math.max(0, Math.round((value + delta) * 2) / 2)));
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xl }}>
      <RoundBtn onPress={() => step(-0.5)}>
        <Minus size={22} color={theme.colors.text} />
      </RoundBtn>
      <View style={{ alignItems: 'center', minWidth: 84 }}>
        <Text variant="numberMedium">
          {Number.isInteger(value) ? value : value.toFixed(1)}
        </Text>
        <Text variant="caption" color="textTertiary">hours</Text>
      </View>
      <RoundBtn onPress={() => step(0.5)}>
        <Plus size={22} color={theme.colors.text} />
      </RoundBtn>
    </View>
  );
}

function RoundBtn({ onPress, children }: { onPress: () => void; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surfaceGlass,
        borderWidth: 1,
        borderColor: theme.colors.separator,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}
