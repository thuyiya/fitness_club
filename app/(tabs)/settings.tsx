import React from 'react';
import { Alert, Pressable, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell,
  ChevronRight,
  Download,
  Heart,
  Moon,
  Ruler,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  User,
} from 'lucide-react-native';
import {
  Card,
  FadeInView,
  GlassCard,
  Screen,
  SectionHeader,
  SegmentedControl,
  Text,
} from '@/components';
import { useTheme } from '@/theme';
import { useUserStore } from '@/store/userStore';
import { useSettingsStore, ThemePreference } from '@/store/settingsStore';
import { useAiCoachStore } from '@/store/aiCoachStore';
import { MeasurementUnit } from '@/types';
import { formatHeight, formatWeight } from '@/lib/format';
import { MODEL } from '@/lib/llm/config';

export default function Settings() {
  const theme = useTheme();
  const profile = useUserStore((s) => s.profile);
  const resetUser = useUserStore((s) => s.reset);
  const {
    themePreference,
    setTheme,
    units,
    setUnits,
    notifications,
    toggleNotification,
    connectedHealth,
    toggleHealth,
  } = useSettingsStore();

  const deleteAccount = () => {
    Alert.alert('Delete Account', 'This will erase all your data. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          resetUser();
          router.replace('/welcome');
        },
      },
    ]);
  };

  return (
    <Screen>
      <View style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.md }}>
        <Text variant="largeTitle">Settings</Text>
      </View>

      {/* Profile card */}
      <FadeInView delay={0}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: theme.radius.xxl, padding: theme.spacing.xl, ...theme.shadows.glow }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 22,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <User size={30} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="title2" color="textInverse">{profile?.name ?? 'Champion'}</Text>
              <Text variant="footnote" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {profile ? `${profile.age} yrs · ${formatHeight(profile.heightCm, units)} · ${formatWeight(profile.weightKg, units)}` : ''}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </FadeInView>

      {/* Appearance */}
      <FadeInView delay={60}>
        <SectionHeader title="Appearance" />
        <Card>
          <Row icon={<Moon size={20} color={theme.colors.primary} />} label="Theme" noBorder>
            <View style={{ width: 200 }}>
              <SegmentedControl<ThemePreference>
                value={themePreference}
                onChange={setTheme}
                options={[
                  { label: 'Auto', value: 'system' },
                  { label: 'Light', value: 'light' },
                  { label: 'Dark', value: 'dark' },
                ]}
              />
            </View>
          </Row>
        </Card>
      </FadeInView>

      {/* Units */}
      <FadeInView delay={100}>
        <SectionHeader title="Units" />
        <Card>
          <Row icon={<Ruler size={20} color={theme.colors.secondary} />} label="Measurement" noBorder>
            <View style={{ width: 180 }}>
              <SegmentedControl<MeasurementUnit>
                value={units}
                onChange={setUnits}
                options={[
                  { label: 'Metric', value: 'metric' },
                  { label: 'Imperial', value: 'imperial' },
                ]}
              />
            </View>
          </Row>
        </Card>
      </FadeInView>

      {/* Notifications */}
      <FadeInView delay={140}>
        <SectionHeader title="Notifications" />
        <GlassCard padded={false}>
          <ToggleRow icon={<Bell size={20} color={theme.colors.warning} />} label="Meal reminders" value={notifications.meals} onToggle={() => toggleNotification('meals')} first />
          <ToggleRow icon={<Bell size={20} color={theme.colors.walking} />} label="Walk reminders" value={notifications.walk} onToggle={() => toggleNotification('walk')} />
          <ToggleRow icon={<Bell size={20} color={theme.colors.success} />} label="Workout reminders" value={notifications.workout} onToggle={() => toggleNotification('workout')} />
          <ToggleRow icon={<Bell size={20} color={theme.colors.water} />} label="Water reminders" value={notifications.water} onToggle={() => toggleNotification('water')} />
          <ToggleRow icon={<Bell size={20} color={theme.colors.primary} />} label="Weigh-in reminders" value={notifications.weighIn} onToggle={() => toggleNotification('weighIn')} />
          <ToggleRow icon={<Heart size={20} color={theme.colors.danger} />} label="Motivational quotes" value={notifications.motivation} onToggle={() => toggleNotification('motivation')} />
        </GlassCard>
      </FadeInView>

      {/* Integrations */}
      <FadeInView delay={180}>
        <SectionHeader title="Health Integrations" />
        <GlassCard padded={false}>
          <ToggleRow icon={<Text style={{ fontSize: 20 }}>🍎</Text>} label="Apple Health" value={connectedHealth.apple} onToggle={() => toggleHealth('apple')} first />
          <ToggleRow icon={<Text style={{ fontSize: 20 }}>🤖</Text>} label="Google Fit" value={connectedHealth.google} onToggle={() => toggleHealth('google')} />
          <ToggleRow icon={<Text style={{ fontSize: 20 }}>📱</Text>} label="Samsung Health" value={connectedHealth.samsung} onToggle={() => toggleHealth('samsung')} />
        </GlassCard>
      </FadeInView>

      {/* On-device AI */}
      <AIModelSection />

      {/* Data */}
      <FadeInView delay={240}>
        <SectionHeader title="Data & Privacy" />
        <GlassCard padded={false}>
          <NavRow icon={<Shield size={20} color={theme.colors.primary} />} label="Privacy" first />
          <NavRow icon={<Download size={20} color={theme.colors.success} />} label="Export Data (PDF)" />
          <NavRow icon={<Upload size={20} color={theme.colors.secondary} />} label="Backup & Restore" />
          <Pressable onPress={deleteAccount}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.md,
                padding: theme.spacing.md,
                borderTopWidth: 1,
                borderTopColor: theme.colors.separator,
              }}
            >
              <Trash2 size={20} color={theme.colors.danger} />
              <Text variant="callout" color="danger" style={{ flex: 1 }}>Delete Account</Text>
              <ChevronRight size={18} color={theme.colors.danger} />
            </View>
          </Pressable>
        </GlassCard>
      </FadeInView>

      <View style={{ height: theme.spacing.xl }} />
      <Text variant="caption" color="textTertiary" center>
        AI Weight Coach · v1.0.0
      </Text>
      <Text variant="caption" color="textTertiary" center style={{ marginTop: 4 }}>
        Made with 💙 for your health
      </Text>
    </Screen>
  );
}

/** Manage the on-device AI model: status, size, download or delete to free space. */
function AIModelSection() {
  const theme = useTheme();
  const { available, status, progress, downloaded, connect, removeModel } = useAiCoachStore();

  if (!available) return null;

  const installed = downloaded || status === 'ready';
  const statusLabel =
    status === 'ready'
      ? 'Ready'
      : status === 'downloading'
        ? `Downloading ${Math.round(progress * 100)}%`
        : status === 'preparing'
          ? 'Loading…'
          : installed
            ? 'Installed'
            : 'Not installed';
  const statusColor =
    status === 'ready' || installed ? 'success' : status === 'error' ? 'danger' : 'textTertiary';

  const confirmDelete = () => {
    Alert.alert(
      'Delete AI model?',
      `This frees ${MODEL.sizeLabel} of storage. You can download it again anytime.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeModel() },
      ],
    );
  };

  return (
    <FadeInView delay={200}>
      <SectionHeader title="AI Coach" />
      <GlassCard padded={false}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
            padding: theme.spacing.md,
          }}
        >
          <Sparkles size={20} color={theme.colors.primary} />
          <View style={{ flex: 1 }}>
            <Text variant="callout">On-device model</Text>
            <Text variant="caption" color="textTertiary">
              {MODEL.displayName} · {MODEL.sizeLabel}
            </Text>
          </View>
          <Text variant="caption" color={statusColor as never}>{statusLabel}</Text>
        </View>

        {status === 'downloading' || status === 'preparing' ? null : installed ? (
          <Pressable onPress={confirmDelete}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.md,
                padding: theme.spacing.md,
                borderTopWidth: 1,
                borderTopColor: theme.colors.separator,
              }}
            >
              <Trash2 size={20} color={theme.colors.danger} />
              <Text variant="callout" color="danger" style={{ flex: 1 }}>Delete model (free {MODEL.sizeLabel})</Text>
            </View>
          </Pressable>
        ) : (
          <Pressable onPress={() => connect()}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.md,
                padding: theme.spacing.md,
                borderTopWidth: 1,
                borderTopColor: theme.colors.separator,
              }}
            >
              <Download size={20} color={theme.colors.primary} />
              <Text variant="callout" color="primary" style={{ flex: 1 }}>Download AI model ({MODEL.sizeLabel})</Text>
              <ChevronRight size={18} color={theme.colors.textTertiary} />
            </View>
          </Pressable>
        )}
      </GlassCard>
    </FadeInView>
  );
}

function Row({
  icon,
  label,
  children,
  noBorder,
}: {
  icon: React.ReactNode;
  label: string;
  children?: React.ReactNode;
  noBorder?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderTopWidth: noBorder ? 0 : 1,
        borderTopColor: theme.colors.separator,
      }}
    >
      {icon}
      <Text variant="callout" style={{ flex: 1 }}>{label}</Text>
      {children}
    </View>
  );
}

function ToggleRow({
  icon,
  label,
  value,
  onToggle,
  first,
}: {
  icon: React.ReactNode;
  label: string;
  value: boolean;
  onToggle: () => void;
  first?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        padding: theme.spacing.md,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: theme.colors.separator,
      }}
    >
      {icon}
      <Text variant="callout" style={{ flex: 1 }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ true: theme.colors.primary, false: theme.colors.separator }}
        thumbColor="#fff"
      />
    </View>
  );
}

function NavRow({ icon, label, first }: { icon: React.ReactNode; label: string; first?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.md,
          padding: theme.spacing.md,
          borderTopWidth: first ? 0 : 1,
          borderTopColor: theme.colors.separator,
        }}
      >
        {icon}
        <Text variant="callout" style={{ flex: 1 }}>{label}</Text>
        <ChevronRight size={18} color={theme.colors.textTertiary} />
      </View>
    </Pressable>
  );
}
