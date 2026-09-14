import React, { useState } from 'react';
import { Alert, Pressable, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Screen, Text, Card, PillButton, SegmentedControl } from '@/components';
import { useUserStore } from '@/store/userStore';
import { useTheme } from '@/theme';
import { Goal } from '@/types';
export default function Goals() {
  const theme = useTheme();
  const { profile, updateProfile } = useUserStore();
  const [goal, setGoal] = useState<Goal>(profile?.goal ?? 'maintain');
  const [weight, setWeight] = useState(String(profile?.targetWeightKg ?? ''));
  return <Screen><Pressable onPress={() => router.back()} style={{ paddingVertical: 16 }}><Text color="primary">Back</Text></Pressable><Text variant="largeTitle">Your next chapter.</Text><Text color="textSecondary" style={{ marginVertical: 16 }}>Adjust your goal. Your daily targets will update with you.</Text>{!profile ? <PillButton label="Set up health profile" onPress={() => router.push('/onboarding')}/> : <Card><SegmentedControl<Goal> value={goal} onChange={setGoal} options={[{ label: 'Lose', value: 'lose' }, { label: 'Maintain', value: 'maintain' }, { label: 'Gain', value: 'gain' }]}/><Text style={{ marginTop: 20 }}>Target weight (kg)</Text><TextInput accessibilityLabel="Target weight in kilograms" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" style={{ color: theme.colors.text, backgroundColor: theme.colors.surface, padding: 16, marginVertical: 16, borderRadius: 16 }}/><PillButton label="Save goal" onPress={() => { const kg = Number(weight); if (!Number.isFinite(kg) || kg < 30 || kg > 350) return Alert.alert('Check target weight', 'Enter a weight between 30 and 350 kg.'); if ((goal === 'lose' && kg >= profile.weightKg) || (goal === 'gain' && kg <= profile.weightKg)) return Alert.alert('Check your goal', 'Choose a target that matches your selected direction.'); updateProfile({ goal, targetWeightKg: goal === 'maintain' ? profile.weightKg : kg }); router.back(); }}/></Card>}</Screen>;
}
