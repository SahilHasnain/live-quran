import { TrackPlayerProvider } from "@/contexts/TrackPlayerContext";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { Stack } from "expo-router";
import { useCallback } from "react";
import "../global.css";
import { GestureHandlerRootView } from "react-native-gesture-handler";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    KFGQPC_Uthmanic_Hafs: require("../assets/fonts/KFGQPC_Uthmanic_Hafs_Regular.ttf"),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) await SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <TrackPlayerProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </TrackPlayerProvider>
    </GestureHandlerRootView>
  );
}
