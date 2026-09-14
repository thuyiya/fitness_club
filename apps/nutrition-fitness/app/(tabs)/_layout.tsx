import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Tabs, router, Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Sparkles, Plus, TrendingUp, Settings, Dumbbell, Utensils, ClipboardList, Target, Camera, X, ChevronRight, ShieldCheck } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components';
import { useTheme } from '@/theme';

const actions = [
  { title: 'Workouts', hint: 'Move today. Log your session.', icon: Dumbbell, route: '/workouts' },
  { title: 'Meal log', hint: 'Capture a meal and add your notes.', icon: Utensils, route: '/photo-log?kind=meal' },
  { title: 'Exercise plan', hint: 'Generate your week. See today’s moves.', icon: ClipboardList, route: '/exercise-plan?edit=1' },
  { title: 'Meal plan', hint: 'Plan your meals around your goal.', icon: Sparkles, route: '/meals' },
  { title: 'Change goals', hint: 'Make your plan work for you.', icon: Target, route: '/goals' },
  { title: 'Progress photo', hint: 'Keep a private visual journal.', icon: Camera, route: '/photo-log?kind=progress' },
];
export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const items = [{ name: 'index', label: 'Home', icon: Home }, { name: 'coach', label: 'Coach', icon: Sparkles }, { name: 'add', label: 'Add', icon: Plus }, { name: 'progress', label: 'Progress', icon: TrendingUp }, { name: 'settings', label: 'Settings', icon: Settings }];
  return <>
    <Tabs screenOptions={{ headerShown: false }} tabBar={({ state, navigation }) => (
      <View style={{ position: 'absolute', left: 16, right: 16, bottom: Math.max(insets.bottom, 12), borderRadius: 28, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.cardBorder, flexDirection: 'row', paddingVertical: 10, ...theme.shadows.medium }}>
        {items.map(({ name, label, icon: Icon }) => {
          const active = state.routes[state.index].name === name;
          const color = active ? theme.colors.primary : theme.colors.textTertiary;
          return <Pressable key={name} accessibilityRole="button" accessibilityLabel={name === 'add' ? 'Add a log or plan' : label} accessibilityState={{ selected: active }} onPress={() => {
            if (name === 'add') return setOpen(true);
            const route = state.routes.find(r => r.name === name)!;
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!event.defaultPrevented) navigation.navigate(name);
          }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            {name === 'add' ? <LinearGradient colors={[theme.colors.primary, theme.colors.secondary]} style={{ width: 50, height: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}><Plus color={theme.colors.textInverse} size={28}/></LinearGradient> : <><Icon color={color} size={21}/><Text variant="caption" style={{ color }}>{label}</Text></>}
          </Pressable>;
        })}
      </View>
    )}>
      <Tabs.Screen name="index"/><Tabs.Screen name="coach"/><Tabs.Screen name="progress"/><Tabs.Screen name="settings"/>
      <Tabs.Screen name="meals" options={{ href: null }}/><Tabs.Screen name="workouts" options={{ href: null }}/>
    </Tabs>
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay }}>
        <Pressable accessibilityLabel="Dismiss actions" onPress={() => setOpen(false)} style={{ flex: 1 }}/>
        <View accessibilityViewIsModal style={{ maxHeight: '85%', borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: theme.colors.background, padding: 24, paddingBottom: Math.max(insets.bottom, 20) }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.colors.separator, alignSelf: 'center', marginBottom: 20 }}/>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text variant="title1">A little progress.</Text><Pressable accessibilityLabel="Close actions" onPress={() => setOpen(false)} style={{ padding: 10 }}><X color={theme.colors.textSecondary}/></Pressable></View>
          <Text color="textSecondary" style={{ marginBottom: 18 }}>What would you like to do?</Text>
          <ScrollView>{actions.map(({ title, hint, icon: Icon, route }) => <Pressable key={title} accessibilityRole="button" onPress={() => { setOpen(false); router.push(route as Href); }} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, marginBottom: 8, borderRadius: 20, backgroundColor: pressed ? theme.colors.surface : theme.colors.card })}>
            <View style={{ padding: 12, backgroundColor: theme.colors.primary + '18', borderRadius: 15 }}><Icon size={23} color={theme.colors.primary}/></View><View style={{ flex: 1 }}><Text variant="headline">{title}</Text><Text variant="caption" color="textSecondary">{hint}</Text></View><ChevronRight size={16} color={theme.colors.textTertiary}/>
          </Pressable>)}</ScrollView>
          <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: 12 }}><ShieldCheck size={14} color={theme.colors.secondary}/><Text variant="caption" color="textSecondary">Your health. Your device. Your space.</Text></View>
        </View>
      </View>
    </Modal>
  </>;
}
