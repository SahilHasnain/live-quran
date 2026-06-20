import { TrackPlayerProvider } from "@/contexts/TrackPlayerContext";
import { Stack } from "expo-router";
import "../global.css";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TrackPlayerProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </TrackPlayerProvider>
    </GestureHandlerRootView>
  );
}
