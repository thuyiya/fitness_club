import React, { useState } from 'react';
import { Modal, Pressable, TextInput, View } from 'react-native';
import { Dumbbell, Droplets, Footprints, UtensilsCrossed, X } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';
import { GlassCard } from './GlassCard';
import { SectionHeader } from './SectionHeader';
import { useLogStore } from '@/store/logStore';
import { useUserStore } from '@/store/userStore';

type Sheet = 'meal' | 'exercise' | 'water' | null;

/**
 * The "Today" logging card on the Progress screen: live daily totals plus quick
 * entry points to log a meal, exercise or water. Mirrors what the Coach can do
 * from natural language, for people who prefer tapping.
 */
export function TodayLog() {
  const theme = useTheme();
  const store = useLogStore();
  const today = store.today();
  const plan = useUserStore((s) => s.plan);
  const [sheet, setSheet] = useState<Sheet>(null);

  const calTarget = plan?.targets.calories ?? 0;
  const proteinTarget = plan?.targets.proteinG ?? 0;
  const activeMin = (today.walkingMinutes ?? 0) + (today.workoutMinutes ?? 0);

  return (
    <View>
      <SectionHeader title="Today" subtitle="Log as you go — or just tell Coach" />
      <GlassCard>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Stat label="Calories" value={`${today.caloriesConsumed}`} sub={calTarget ? `/ ${calTarget}` : ''} />
          <Stat label="Protein" value={`${today.proteinG}g`} sub={proteinTarget ? `/ ${proteinTarget}g` : ''} />
          <Stat label="Active" value={`${activeMin}m`} sub={today.distanceKm ? `${today.distanceKm}km` : ''} />
          <Stat label="Water" value={today.waterMl ? `${(today.waterMl / 1000).toFixed(1)}L` : '—'} sub="" />
        </View>

        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
          <LogButton icon={<UtensilsCrossed size={18} color={theme.colors.primary} />} label="Meal" onPress={() => setSheet('meal')} />
          <LogButton icon={<Dumbbell size={18} color={theme.colors.primary} />} label="Exercise" onPress={() => setSheet('exercise')} />
          <LogButton icon={<Droplets size={18} color={theme.colors.primary} />} label="Water" onPress={() => setSheet('water')} />
        </View>
      </GlassCard>

      <LogSheet type={sheet} onClose={() => setSheet(null)} />
    </View>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text variant="headline">{value}</Text>
      {sub ? (
        <Text variant="caption" color="textTertiary">
          {sub}
        </Text>
      ) : null}
      <Text variant="caption" color="textTertiary" style={{ marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

function LogButton({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          paddingVertical: 12,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.primary + '14',
        }}
      >
        {icon}
        <Text variant="subhead" color="primary" style={{ fontWeight: '600' }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

/* ---- entry sheet -------------------------------------------------------- */

function LogSheet({ type, onClose }: { type: Sheet; onClose: () => void }) {
  const theme = useTheme();
  const store = useLogStore();

  // Meal
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  // Exercise
  const [exKind, setExKind] = useState<'walk' | 'workout'>('walk');
  const [minutes, setMinutes] = useState('');
  const [distance, setDistance] = useState('');
  // Water
  const [waterMl, setWaterMl] = useState('');

  const reset = () => {
    setCalories('');
    setProtein('');
    setMinutes('');
    setDistance('');
    setWaterMl('');
    setExKind('walk');
  };

  const close = () => {
    reset();
    onClose();
  };

  const save = () => {
    if (type === 'meal') {
      const c = parseFloat(calories) || 0;
      const p = parseFloat(protein) || 0;
      if (c > 0 || p > 0) store.addMeal(Math.round(c), Math.round(p));
    } else if (type === 'exercise') {
      const m = Math.round(parseFloat(minutes) || 0);
      const km = parseFloat(distance) || 0;
      if (m > 0) (exKind === 'walk' ? store.addWalking : store.addWorkout)(m);
      if (km > 0) store.addDistance(km);
    } else if (type === 'water') {
      const ml = Math.round(parseFloat(waterMl) || 0);
      if (ml > 0) store.addWater(ml);
    }
    close();
  };

  const titles: Record<Exclude<Sheet, null>, string> = {
    meal: 'Log a meal',
    exercise: 'Log exercise',
    water: 'Log water',
  };

  return (
    <Modal visible={type !== null} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={close} />
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme.colors.backgroundElevated,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.xl + 12,
          gap: theme.spacing.md,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="title3">{type ? titles[type] : ''}</Text>
          <Pressable onPress={close} hitSlop={10}>
            <X size={22} color={theme.colors.textSecondary} />
          </Pressable>
        </View>

        {type === 'meal' && (
          <>
            <Field label="Calories (kcal)" value={calories} onChange={setCalories} placeholder="e.g. 520" />
            <Field label="Protein (g)" value={protein} onChange={setProtein} placeholder="e.g. 40" />
          </>
        )}

        {type === 'exercise' && (
          <>
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <KindPill icon={<Footprints size={16} color={exKind === 'walk' ? '#fff' : theme.colors.textSecondary} />} label="Walk" active={exKind === 'walk'} onPress={() => setExKind('walk')} />
              <KindPill icon={<Dumbbell size={16} color={exKind === 'workout' ? '#fff' : theme.colors.textSecondary} />} label="Workout" active={exKind === 'workout'} onPress={() => setExKind('workout')} />
            </View>
            <Field label="Minutes" value={minutes} onChange={setMinutes} placeholder="e.g. 30" />
            {exKind === 'walk' && (
              <Field label="Distance (km, optional)" value={distance} onChange={setDistance} placeholder="e.g. 3.5" />
            )}
          </>
        )}

        {type === 'water' && (
          <Field label="Water (ml)" value={waterMl} onChange={setWaterMl} placeholder="e.g. 500" />
        )}

        <Pressable onPress={save}>
          <View
            style={{
              paddingVertical: 14,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.primary,
              alignItems: 'center',
            }}
          >
            <Text variant="headline" color="textInverse">
              Save
            </Text>
          </View>
        </Pressable>
      </View>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text variant="caption" color="textTertiary">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textTertiary}
        keyboardType="decimal-pad"
        style={{
          height: 48,
          borderRadius: theme.radius.md,
          paddingHorizontal: theme.spacing.md,
          backgroundColor: theme.colors.background,
          borderWidth: 1,
          borderColor: theme.colors.cardBorder,
          color: theme.colors.text,
          fontSize: 16,
        }}
      />
    </View>
  );
}

function KindPill({
  icon,
  label,
  active,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          paddingVertical: 10,
          borderRadius: theme.radius.pill,
          backgroundColor: active ? theme.colors.primary : theme.colors.background,
          borderWidth: 1,
          borderColor: active ? theme.colors.primary : theme.colors.cardBorder,
        }}
      >
        {icon}
        <Text variant="subhead" color={active ? 'textInverse' : 'textSecondary'} style={{ fontWeight: '600' }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
