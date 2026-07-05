import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ArrowRight } from 'lucide-react-native';
import { Text } from './Text';

/**
 * "Clearing the Mind" — a one-time, no-input intro shown on the first visit to
 * the Calm tab. Three swipeable, animated screens rooted in Buddhist practice:
 * mindful breathing (anapanasati), letting thoughts pass, and resting in the
 * stillness that reveals a clear mind.
 */

const BG = ['#0F2A20', '#0A1B15'] as const;
const SAGE = '#8FBF9F';
const MINT = '#Bfe3CB';
const GOLD = '#D9C08A';

type Slide = {
  eyebrow: string;
  title: string;
  body: string;
  Visual: React.ComponentType;
};

const SLIDES: Slide[] = [
  {
    eyebrow: 'One breath at a time',
    title: 'Arrive',
    body: 'Let your breathing slow. Breathe in… and gently out. There is nowhere to be but here, in this moment.',
    Visual: BreathingOrb,
  },
  {
    eyebrow: 'Thoughts are visitors',
    title: 'Let go',
    body: 'Notice each thought as it arises, then let it drift away like a cloud across an open sky. You are the sky — not the clouds.',
    Visual: RisingThoughts,
  },
  {
    eyebrow: 'Stillness reveals clarity',
    title: 'A clear mind',
    body: 'When the water is still, it reflects clearly. Rest here a moment — and carry this calm with you.',
    Visual: RippleRings,
  },
];

export function MindIntro({ visible, onDone }: { visible: boolean; onDone: () => void }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  const next = () => {
    Haptics.selectionAsync().catch(() => {});
    if (isLast) {
      finish();
      return;
    }
    scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
  };

  const finish = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
    onDone();
  };

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={finish}>
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={BG as unknown as string[]} style={StyleSheet.absoluteFill} />

        {/* Skip */}
        <Pressable
          onPress={finish}
          hitSlop={12}
          style={{ position: 'absolute', top: insets.top + 12, right: 20, zIndex: 10 }}
        >
          <Text variant="subhead" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Skip
          </Text>
        </Pressable>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          scrollEventThrottle={16}
        >
          {SLIDES.map((s, i) => (
            <View
              key={s.title}
              style={{ width, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 }}
            >
              <View style={{ height: 260, alignItems: 'center', justifyContent: 'center' }}>
                {/* Mount the animation only for a broad window so it's alive when reached */}
                <s.Visual />
              </View>

              <Animated.View
                key={`${s.title}-${index === i}`}
                entering={FadeIn.duration(600)}
                style={{ alignItems: 'center', marginTop: 40 }}
              >
                <Text variant="caption" style={{ color: GOLD, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  {s.eyebrow}
                </Text>
                <Text variant="largeTitle" center style={{ color: '#F4F8EE', marginTop: 10 }}>
                  {s.title}
                </Text>
                <Text
                  variant="callout"
                  center
                  style={{ color: 'rgba(255,255,255,0.78)', marginTop: 14, lineHeight: 24, maxWidth: 320 }}
                >
                  {s.body}
                </Text>
              </Animated.View>
            </View>
          ))}
        </ScrollView>

        {/* Footer: dots + advance */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: insets.bottom + 28,
            paddingHorizontal: 32,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {SLIDES.map((_, i) => (
              <Dot key={i} active={i === index} />
            ))}
          </View>

          <Pressable onPress={next}>
            <LinearGradient
              colors={[SAGE, '#6FA982']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                height: 54,
                minWidth: isLast ? 150 : 54,
                paddingHorizontal: isLast ? 24 : 0,
                borderRadius: 27,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {isLast ? (
                <Text variant="headline" style={{ color: '#0A1B15' }}>
                  Begin
                </Text>
              ) : (
                <ArrowRight size={24} color="#0A1B15" />
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Dot({ active }: { active: boolean }) {
  return (
    <View
      style={{
        width: active ? 22 : 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: active ? MINT : 'rgba(255,255,255,0.25)',
      }}
    />
  );
}

/** Slide 1 — a soft orb expanding and contracting to a slow breath rhythm. */
function BreathingOrb() {
  const scale = useSharedValue(0.62);
  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [scale]);

  const orb = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glow = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * 1.4 }],
    opacity: 0.15 + (scale.value - 0.62) * 0.5,
  }));

  return (
    <View style={{ width: 220, height: 220, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: SAGE },
          glow,
        ]}
      />
      <Animated.View style={orb}>
        <LinearGradient
          colors={[MINT, SAGE]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={{ width: 170, height: 170, borderRadius: 85 }}
        />
      </Animated.View>
    </View>
  );
}

/** Slide 2 — small motes drifting upward and dissolving, like passing thoughts. */
function RisingThoughts() {
  const motes = Array.from({ length: 7 });
  return (
    <View style={{ width: 240, height: 240 }}>
      {motes.map((_, i) => (
        <Mote key={i} index={i} />
      ))}
    </View>
  );
}

function Mote({ index }: { index: number }) {
  const y = useSharedValue(0);
  const o = useSharedValue(0);
  const left = 20 + ((index * 31) % 200);
  const size = 6 + (index % 3) * 4;

  useEffect(() => {
    const delay = index * 520;
    y.value = withDelay(delay, withRepeat(withTiming(-150, { duration: 4200, easing: Easing.out(Easing.quad) }), -1, false));
    o.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.65, { duration: 1400 }),
          withTiming(0, { duration: 2800 }),
        ),
        -1,
        false,
      ),
    );
  }, [index, y, o]);

  const style = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [{ translateY: y.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          bottom: 40,
          left,
          width: size,
          height: size,
          borderRadius: size,
          backgroundColor: MINT,
        },
        style,
      ]}
    />
  );
}

/** Slide 3 — concentric rings rippling outward into stillness. */
function RippleRings() {
  const rings = [0, 1, 2];
  return (
    <View style={{ width: 240, height: 240, alignItems: 'center', justifyContent: 'center' }}>
      {rings.map((i) => (
        <Ring key={i} index={i} />
      ))}
      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: GOLD }} />
    </View>
  );
}

function Ring({ index }: { index: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(
      index * 1100,
      withRepeat(withTiming(1, { duration: 3300, easing: Easing.out(Easing.ease) }), -1, false),
    );
  }, [index, p]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.3 + p.value * 1.1 }],
    opacity: (1 - p.value) * 0.5,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 200,
          height: 200,
          borderRadius: 100,
          borderWidth: 2,
          borderColor: SAGE,
        },
        style,
      ]}
    />
  );
}
