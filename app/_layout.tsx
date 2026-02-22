import { TrackPlayerProvider } from "@/contexts/TrackPlayerContext";
import { Stack } from "expo-router";
import "../global.css";

export default function RootLayout() {
  return (
    <TrackPlayerProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </TrackPlayerProvider>
  );
}
