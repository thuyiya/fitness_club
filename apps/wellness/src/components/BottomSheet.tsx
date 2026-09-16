import { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius, space, type as typo, type Theme } from "../theme/tokens";

const SCREEN = Dimensions.get("window").height;

/**
 * A sheet that rises from the bottom and can be flicked away.
 *
 * Built on Animated + PanResponder from React Native core rather than a
 * gesture library: this is one sheet with one axis, and pulling in
 * reanimated/gesture-handler for it would cost a native rebuild on every
 * machine that clones the repo.
 *
 * Dismissal follows the usual physical rule --- drag past a third of the
 * sheet's height OR flick downward fast enough. Distance alone makes a quick
 * flick feel ignored; velocity alone makes a slow deliberate drag fail.
 */
export function BottomSheet({
  theme,
  visible,
  onClose,
  title,
  heightRatio = 0.5,
  children,
  contentStyle,
}: {
  theme: Theme;
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Portion of the screen the sheet covers. 0.5 is half, per the design. */
  heightRatio?: number;
  children: React.ReactNode;
  contentStyle?: ViewStyle;
}) {
  const insets = useSafeAreaInsets();
  const height = SCREEN * heightRatio;
  const translateY = useRef(new Animated.Value(height)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  const animateTo = (to: number, cb?: () => void) => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: to, useNativeDriver: true, bounciness: 0, speed: 14 }),
      Animated.timing(backdrop, { toValue: to === 0 ? 1 : 0, duration: 180, useNativeDriver: true }),
    ]).start(cb);
  };

  useEffect(() => {
    if (visible) animateTo(0);
    else translateY.setValue(height);
  }, [visible, height]);

  const close = () => animateTo(height, onClose);

  const pan = useRef(
    PanResponder.create({
      // Claim the gesture only on a real downward drag, so buttons and scroll
      // views inside the sheet keep working.
      onMoveShouldSetPanResponder: (_e, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_e, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_e, g) => {
        const farEnough = g.dy > height / 3;
        const fastEnough = g.vy > 0.8;
        if (farEnough || fastEnough) animateTo(height, onClose);
        else animateTo(0);
      },
    }),
  ).current;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Animated.View style={{ ...StyleSheetAbsolute, opacity: backdrop }}>
          <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={close} />
        </Animated.View>

        <Animated.View
          style={{
            height: height + insets.bottom,
            backgroundColor: theme.bg,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            transform: [{ translateY }],
            paddingBottom: insets.bottom,
          }}
        >
          {/* The grab handle is the affordance --- without it nobody discovers
              that the sheet can be dragged away. */}
          <View {...pan.panHandlers} style={{ paddingTop: space.md, paddingBottom: space.sm, alignItems: "center" }}>
            <View style={{ width: 40, height: 4, borderRadius: radius.pill, backgroundColor: theme.line }} />
            {title && (
              <Text style={{ ...typo.title, color: theme.ink, marginTop: space.md, alignSelf: "flex-start", paddingHorizontal: space.lg }}>
                {title}
              </Text>
            )}
          </View>

          <View style={[{ flex: 1, paddingHorizontal: space.lg }, contentStyle]}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const StyleSheetAbsolute = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};
