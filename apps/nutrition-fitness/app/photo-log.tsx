import React, { useState } from 'react';
import { Alert, Image, Platform, Pressable, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Camera, ImagePlus, ArrowLeft } from 'lucide-react-native';
import { Screen, Text, Card, PillButton } from '@/components';
import { useTheme } from '@/theme';
import { usePhotoStore } from '@/store/photoStore';
import { useLogStore } from '@/store/logStore';

export default function PhotoLog() {
  const { kind: param } = useLocalSearchParams<{ kind?: string }>();
  const kind = param === 'progress' ? 'progress' : 'meal';
  const theme = useTheme();
  const { entries, add, remove } = usePhotoStore();
  const [uri, setUri] = useState('');
  const [note, setNote] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [busy, setBusy] = useState(false);
  const pick = async (camera: boolean) => {
    try {
      if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) { Alert.alert('Camera access needed', 'Allow camera access in device settings, or choose a photo.'); return; }
      const result = await (camera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync)({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.75 });
      if (!result.canceled) setUri(result.assets[0].uri);
    } catch { Alert.alert('Could not open photos', 'Please try again on your device.'); }
  };
  const save = async () => {
    if (!uri || busy) return;
    const kcal = Number(calories), grams = Number(protein);
    if (kind === 'meal' && (![kcal, grams].every(Number.isFinite) || kcal < 0 || grams < 0)) { Alert.alert('Check your numbers', 'Enter positive calorie and protein amounts, or leave them empty.'); return; }
    setBusy(true);
    try {
      if (Platform.OS === 'web' || !FileSystem.documentDirectory) throw new Error('Use the mobile app to save photos privately on your device.');
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const directory = FileSystem.documentDirectory + 'journal/';
      await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
      const destination = directory + id + '.jpg';
      await FileSystem.copyAsync({ from: uri, to: destination });
      add({ id, uri: destination, note: note.trim(), kind, createdAt: Date.now() });
      if (kind === 'meal') useLogStore.getState().addMeal(kcal, grams);
      setUri(''); setNote(''); setCalories(''); setProtein('');
    } catch (e) { Alert.alert('Photo not saved', e instanceof Error ? e.message : 'Please try again.'); }
    finally { setBusy(false); }
  };
  const inputStyle = { color: theme.colors.text, backgroundColor: theme.colors.surface, padding: 16, borderRadius: 16, marginTop: 12 };
  return <Screen>
    <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={{ paddingVertical: 12 }}><ArrowLeft color={theme.colors.text}/></Pressable>
    <Text variant="largeTitle">{kind === 'meal' ? 'Meal journal' : 'Your progress'}</Text>
    <Text color="textSecondary" style={{ marginTop: 8, marginBottom: 24 }}>{kind === 'meal' ? 'A photo, a few notes. Make every meal count.' : 'Small changes, captured day by day.'}</Text>
    <Card>
      {uri ? <Image source={{ uri }} style={{ height: 260, borderRadius: 18, width: '100%' }}/> : <View style={{ height: 130, alignItems: 'center', justifyContent: 'center', gap: 12 }}><Camera size={36} color={theme.colors.primary}/><Text color="textSecondary">Start with a photo</Text></View>}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
        <PillButton fullWidth={false} label="Camera" onPress={() => pick(true)} style={{ flex: 1 }}/><PillButton fullWidth={false} label="Choose photo" onPress={() => pick(false)} style={{ flex: 1 }}/>
      </View>
      <TextInput accessibilityLabel="Photo notes" placeholder="Add a note…" placeholderTextColor={theme.colors.textTertiary} value={note} onChangeText={setNote} multiline style={inputStyle}/>
      {kind === 'meal' && <><Text variant="caption" color="textSecondary" style={{ marginTop: 12 }}>Optional nutrition · enter from your meal plan or label. Photos are a journal, not an AI estimate.</Text><TextInput accessibilityLabel="Calories" placeholder="Calories (kcal)" placeholderTextColor={theme.colors.textTertiary} keyboardType="decimal-pad" value={calories} onChangeText={setCalories} style={inputStyle}/><TextInput accessibilityLabel="Protein" placeholder="Protein (g)" placeholderTextColor={theme.colors.textTertiary} keyboardType="decimal-pad" value={protein} onChangeText={setProtein} style={inputStyle}/></>}
      <PillButton label={busy ? 'Saving…' : 'Save on this device'} disabled={!uri || busy} onPress={save} style={{ marginTop: 16 }}/>
    </Card>
    <Text variant="title2" style={{ marginVertical: 20 }}>Your journal</Text>
    {entries.filter(e => e.kind === kind).length === 0 && <Text color="textSecondary">Your saved photos will appear here.</Text>}
    {entries.filter(e => e.kind === kind).map(e => <Card key={e.id} style={{ marginBottom: 16 }}><Image source={{ uri: e.uri }} style={{ width: '100%', height: 280, borderRadius: 16 }} accessibilityLabel={e.note || `${kind} photo`}/><Text variant="footnote" color="textSecondary" style={{ marginTop: 12 }}>{new Date(e.createdAt).toLocaleString()}</Text>{!!e.note && <Text style={{ marginTop: 8 }}>{e.note}</Text>}<Pressable onPress={() => Alert.alert('Delete photo?', 'This removes the photo from this device. Any nutrition already logged stays in your daily totals.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { try { await FileSystem.deleteAsync(e.uri, { idempotent: true }); remove(e.id); } catch { Alert.alert('Could not delete photo', 'Please try again.'); } } }])} style={{ paddingVertical: 12 }}><Text color="danger">Delete photo</Text></Pressable></Card>)}
  </Screen>;
}
