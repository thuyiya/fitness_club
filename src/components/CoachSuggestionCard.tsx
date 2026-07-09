/**
 * Inline Calm suggestion inside a Lumora chat bubble.
 *
 * Two affordances:
 *   • Tap the row  → deep-links to the full-screen player / practice / breathe.
 *   • Round button → for guided journeys, plays the audio *inline* via the
 *     global player store (no navigation needed — "play it via chat"). For
 *     practices/breathe (which use component-bound audio) it opens the screen.
 */
import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Leaf, Pause, Play, Sparkles, Wind } from 'lucide-react-native';
import { Text } from './Text';
import { useTheme } from '@/theme';
import { useGuidedPlayer } from '@/lib/useGuidedPlayer';
import { GUIDED_SESSIONS } from '@/lib/calmSessions';
import { CoachSuggestion } from '@/lib/coachSuggest';

export function CoachSuggestionCard({ suggestion }: { suggestion: CoachSuggestion }) {
  const theme = useTheme();
  const router = useRouter();
  const guided = useGuidedPlayer();

  const isJourney = suggestion.kind === 'journey';
  const session = isJourney ? GUIDED_SESSIONS.find((s) => s.id === suggestion.id) : undefined;

  const isActive = isJourney && guided.state.activeId === suggestion.id;
  const isPlaying = isActive && guided.state.isPlaying;
  const isLoading = isJourney && guided.state.loadingId === suggestion.id;

  /** Open the full screen for this suggestion (also starts the journey if idle). */
  const open = () => {
    if (suggestion.kind === 'journey') {
      if (!session) return;
      if (guided.state.activeId !== session.id) guided.play(session);
      router.push({ pathname: '/player', params: { id: session.id } });
    } else if (suggestion.kind === 'practice') {
      router.push({ pathname: '/practice', params: { id: suggestion.id } });
    } else {
      router.push({ pathname: '/breathe', params: { pattern: suggestion.id } });
    }
  };

  /** Round play button: journeys play inline; others fall back to opening. */
  const onPlay = () => {
    if (isJourney && session) {
      if (isActive) guided.togglePlay();
      else guided.play(session);
    } else {
      open();
    }
  };

  const Icon = suggestion.kind === 'breathe' ? Wind : suggestion.kind === 'practice' ? Sparkles : Leaf;

  return (
    <Pressable onPress={open}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 10,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.background,
          borderWidth: 1,
          borderColor: theme.colors.cardBorder,
        }}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.backgroundElevated,
            borderWidth: 1,
            borderColor: theme.colors.cardBorder,
          }}
        >
          <Icon size={18} color={theme.colors.primary} />
        </View>

        <View style={{ flex: 1 }}>
          <Text variant="subhead" numberOfLines={1}>{suggestion.title}</Text>
          <Text variant="caption" color="textTertiary" numberOfLines={1}>{suggestion.subtitle}</Text>
        </View>

        <Pressable onPress={onPlay} hitSlop={8}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.secondary]}
            style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : isPlaying ? (
              <Pause size={18} color="#fff" fill="#fff" />
            ) : (
              <Play size={18} color="#fff" fill="#fff" />
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </Pressable>
  );
}
