import React from 'react';
import { Alert, Linking, Pressable, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell,
  ChevronRight,
  Cloud,
  Compass,
  Download,
  FileText,
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
import {
  DataMode,
  FocusMode,
  MAX_TABS,
  TAB_META,
  ThemePreference,
  useSettingsStore,
} from '@/store/settingsStore';
import { useAiCoachStore } from '@/store/aiCoachStore';
import { MeasurementUnit } from '@/types';
import { formatHeight, formatWeight } from '@/lib/format';
import { MODEL } from '@/lib/llm/config';
import { LEGAL } from '@/lib/links';

export default function Settings() {
  const theme = useTheme();
  const profile = useUserStore((s) => s.profile);
  const resetUser = useUserStore((s) => s.reset);
  const {
    themePreference,
    setTheme,
    units,
    setUnits,
    focus,
    setFocus,
    dataMode,
    setDataMode,
    tabBar,
    toggleTab,
    notifications,
    toggleNotification,
    connectedHealth,
    toggleHealth,
  } = useSettingsStore();

  const deleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This erases all data stored on this device and cannot be undone.\n\nIf you have used a cloud feature and want that data removed too, open the online deletion page.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete on device',
          style: 'destructive',
          onPress: () => {
            resetUser();
            router.replace('/(tabs)');
          },
        },
        { text: 'Online request', onPress: () => Linking.openURL(LEGAL.dataDeletion) },
      ],
    );
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
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.md,
              marginBottom: theme.spacing.sm,
            }}
          >
            <Moon size={20} color={theme.colors.primary} />
            <Text variant="callout" style={{ flex: 1 }}>Theme</Text>
          </View>
          <SegmentedControl<ThemePreference>
            value={themePreference}
            onChange={setTheme}
            options={[
              { label: 'Auto', value: 'system' },
              { label: 'Light', value: 'light' },
              { label: 'Dark', value: 'dark' },
              { label: 'Glass', value: 'glass' },
            ]}
          />
        </Card>
      </FadeInView>

      {/* Focus */}
      <FadeInView delay={80}>
        <SectionHeader title="Focus" subtitle="What the app is tuned around" />
        <Card>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.md,
              marginBottom: theme.spacing.sm,
            }}
          >
            <Compass size={20} color={theme.colors.primary} />
            <Text variant="callout" style={{ flex: 1 }}>Main focus</Text>
          </View>
          <SegmentedControl<FocusMode>
            value={focus}
            onChange={setFocus}
            options={[
              { label: 'Calm', value: 'calm' },
              { label: 'Wellness', value: 'wellness' },
            ]}
          />
          <Text variant="caption" color="textTertiary" style={{ marginTop: theme.spacing.sm }}>
            {focus === 'calm'
              ? 'Calm keeps only the mind-relaxation tabs.'
              : 'Wellness unlocks nutrition, workouts and full progress.'}
          </Text>
        </Card>
      </FadeInView>

      {/* Tab bar customization */}
      <FadeInView delay={90}>
        <SectionHeader
          title="Tab bar"
          subtitle={`Choose up to ${MAX_TABS} · ${tabBar.length}/${MAX_TABS} shown`}
        />
        <GlassCard padded={false}>
          {TAB_META.map((t, i) => {
            const on = tabBar.includes(t.key);
            const atMax = !on && tabBar.length >= MAX_TABS;
            return (
              <View
                key={t.key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.md,
                  padding: theme.spacing.md,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: theme.colors.separator,
                }}
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: on ? theme.colors.primary : theme.colors.separator,
                  }}
                />
                <Text variant="callout" style={{ flex: 1 }} color={on ? 'text' : 'textTertiary'}>
                  {t.label}
                </Text>
                {t.locked ? (
                  <Text variant="caption" color="textTertiary">Always on</Text>
                ) : (
                  <Switch
                    value={on}
                    disabled={atMax}
                    onValueChange={() => toggleTab(t.key)}
                    trackColor={{ true: theme.colors.primary, false: theme.colors.separator }}
                    thumbColor="#fff"
                  />
                )}
              </View>
            );
          })}
        </GlassCard>
        <Text variant="caption" color="textTertiary" style={{ marginTop: theme.spacing.sm }}>
          Home, Meals and Workouts can also be reached from Home when hidden.
        </Text>
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

      {/* Data */}
      <FadeInView delay={120}>
        <SectionHeader title="Data" subtitle="Where your information lives" />
        <Card>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.md,
              marginBottom: theme.spacing.sm,
            }}
          >
            <Cloud size={20} color={theme.colors.secondary} />
            <Text variant="callout" style={{ flex: 1 }}>Sync</Text>
          </View>
          <SegmentedControl<DataMode>
            value={dataMode}
            onChange={setDataMode}
            options={[
              { label: 'Offline', value: 'offline' },
              { label: 'Cloud', value: 'cloud' },
            ]}
          />
          <Text variant="caption" color="textTertiary" style={{ marginTop: theme.spacing.sm }}>
            {dataMode === 'offline'
              ? 'Everything stays on this device.'
              : 'Your journey is backed up and synced.'}
          </Text>
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

      {/* On-device coach */}
      <AIModelSection />

      {/* Data */}
      <FadeInView delay={240}>
        <SectionHeader title="Data & Privacy" />
        <GlassCard padded={false}>
          <NavRow icon={<Shield size={20} color={theme.colors.primary} />} label="Privacy Policy" onPress={() => Linking.openURL(LEGAL.privacy)} first />
          <NavRow icon={<FileText size={20} color={theme.colors.secondary} />} label="Terms of Service" onPress={() => Linking.openURL(LEGAL.terms)} />
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
        Solace · v1.0.0
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
      'Delete coach model?',
      `This frees ${MODEL.sizeLabel} of storage. You can download it again anytime.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeModel() },
      ],
    );
  };

  return (
    <FadeInView delay={200}>
      <SectionHeader title="Coach" />
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
              <Text variant="callout" color="primary" style={{ flex: 1 }}>Download coach ({MODEL.sizeLabel})</Text>
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

function NavRow({
  icon,
  label,
  first,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  first?: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress}>
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
