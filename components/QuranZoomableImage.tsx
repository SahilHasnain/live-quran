import { Image, type ImageSource } from "expo-image";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

type QuranZoomableImageProps = {
  source: ImageSource;
  width: number;
  height: number;
  onPress?: () => void;
  onZoomChange?: (isZoomed: boolean) => void;
  onError?: () => void;
};

export function QuranZoomableImage({
  source,
  width,
  height,
  onPress,
  onZoomChange,
  onError,
}: QuranZoomableImageProps) {
  const [isPanEnabled, setIsPanEnabled] = useState(false);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const notifyZoomChange = (zoomed: boolean) => {
    setIsPanEnabled(zoomed);
    onZoomChange?.(zoomed);
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      const nextScale = Math.min(Math.max(savedScale.value * event.scale, 1), 3);
      scale.value = nextScale;
    })
    .onEnd(() => {
      savedScale.value = Math.min(Math.max(scale.value, 1), 3);
      scale.value = withSpring(savedScale.value);

      if (savedScale.value <= 1) {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }

      runOnJS(notifyZoomChange)(savedScale.value > 1);
    });

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .activeOffsetY([-10, 10])
    .onUpdate((event) => {
      if (savedScale.value <= 1) return;
      const horizontalBound = (width * savedScale.value - width) / 2;
      const verticalBound = (height * savedScale.value - height) / 2;
      translateX.value = Math.min(
        Math.max(savedTranslateX.value + event.translationX, -horizontalBound),
        horizontalBound,
      );
      translateY.value = Math.min(
        Math.max(savedTranslateY.value + event.translationY, -verticalBound),
        verticalBound,
      );
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const tapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      if (onPress) runOnJS(onPress)();
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const shouldReset = scale.value > 1;
      scale.value = withSpring(shouldReset ? 1 : 2);
      savedScale.value = shouldReset ? 1 : 2;
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      runOnJS(notifyZoomChange)(!shouldReset);
    });

  const gesture = Gesture.Race(
    doubleTapGesture,
    Gesture.Simultaneous(
      tapGesture,
      pinchGesture,
      panGesture.enabled(isPanEnabled),
    ),
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={{ width, height }}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.imageWrap, { width, height }, animatedStyle]}>
          <Image
            source={source}
            style={{ width, height }}
            contentFit="contain"
            onError={onError}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  imageWrap: {
    backgroundColor: "#050505",
  },
});
