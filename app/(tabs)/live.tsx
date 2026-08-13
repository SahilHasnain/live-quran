import { colors } from "@/constants/theme";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import { QuranMode, useTrackPlayer } from "@/contexts/TrackPlayerContext";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";

const MODES: { key: QuranMode; label: string }[] = [
  { key: "tilawat", label: "Tilawat" },
  { key: "translation", label: "Translation" },
  { key: "tafseer", label: "Tafseer" },
];

const SLEEP_TIMER_OPTIONS = [
  { minutes: 5, label: "5 min" },
  { minutes: 10, label: "10 min" },
  { minutes: 15, label: "15 min" },
  { minutes: 30, label: "30 min" },
  { minutes: 45, label: "45 min" },
  { minutes: 60, label: "1 hour" },
];

export default function Index() {
  const { showTabBar } = useTabBarVisibility();
  const {
    isLivePlaying,
    isLiveBuffering,
    isLiveLoading,
    liveError,
    currentMode,
    currentTrack,
    playLive,
    pauseLive,
    switchMode,
    sleepTimerMinutes,
    sleepTimerRemaining,
    setSleepTimer,
    cancelSleepTimer,
  } = useTrackPlayer();
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showSleepTimerMenu, setShowSleepTimerMenu] = useState(false);

  // Always show tab bar on Live screen
  useFocusEffect(
    useCallback(() => {
      showTabBar();
    }, [showTabBar]),
  );

  const getModeDisplayName = (mode: QuranMode) => {
    switch (mode) {
      case "tilawat":
        return "Tilawat Radio";
      case "tafseer":
        return "Tafseer Radio";
      case "translation":
        return "Translation Radio";
      default:
        return "Quran Radio";
    }
  };

  const getModeLabel = (mode: QuranMode) => {
    return MODES.find(m => m.key === mode)?.label || "Tilawat";
  };

  const handleModeSwitch = (mode: QuranMode) => {
    if (mode === currentMode) return;
    switchMode(mode);
    setShowModeMenu(false);
  };

  const handleSleepTimerSelect = (minutes: number) => {
    setSleepTimer(minutes);
    setShowSleepTimerMenu(false);
  };

  const handleCancelSleepTimer = () => {
    cancelSleepTimer();
    setShowSleepTimerMenu(false);
  };

  const formatTimeRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View className="flex-1 bg-[#0a0e1c]">
      <Image
        source={require("@/assets/images/quran-bg-v2.jpg")}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        blurRadius={22}
        transition={200}
      />
      <Image
        source={require("@/assets/images/quran-bg-v2.jpg")}
        style={StyleSheet.absoluteFillObject}
        contentFit="contain"
        contentPosition="center"
        transition={200}
      />
      <LinearGradient
        colors={["rgba(8,12,26,0.08)", "rgba(10,14,28,0.22)", "rgba(10,14,28,0.48)"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={["rgba(212,168,67,0.06)", "rgba(212,168,67,0)", "rgba(0,0,0,0.08)"]}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <StatusBar barStyle="light-content" />

      {/* Mode Dropdown Modal */}
      <Modal
        visible={showModeMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModeMenu(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowModeMenu(false)}>
          <View className="flex-1 bg-black/50">
            <TouchableWithoutFeedback>
              <View className="absolute top-[72px] right-4 bg-[#131b2e] rounded-xl overflow-hidden shadow-lg border border-neutral-800">
                {MODES.map((m, index) => (
                  <TouchableOpacity
                    key={m.key}
                    onPress={() => handleModeSwitch(m.key)}
                    disabled={isLiveLoading}
                    className={`px-4 py-3 flex-row items-center justify-between ${index < MODES.length - 1 ? "border-b border-neutral-800" : ""
                      } ${currentMode === m.key ? "bg-primary/20" : ""} ${isLiveLoading ? "opacity-50" : ""
                      }`}
                    style={{ minWidth: 140 }}
                  >
                    <Text
                      className={`font-medium ${currentMode === m.key ? "text-primary-light" : "text-white"
                        }`}
                    >
                      {m.label}
                    </Text>
                    {currentMode === m.key && (
                      <MaterialIcons name="check" size={18} color={colors.primary.light} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Sleep Timer Modal */}
      <Modal
        visible={showSleepTimerMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSleepTimerMenu(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowSleepTimerMenu(false)}>
          <View className="flex-1 bg-black/50">
            <TouchableWithoutFeedback>
              <View className="absolute bottom-44 right-6 bg-[#131b2e] rounded-xl overflow-hidden shadow-lg border border-neutral-800">
                {sleepTimerMinutes && (
                  <TouchableOpacity
                    onPress={handleCancelSleepTimer}
                    className="px-4 py-3 flex-row items-center justify-between border-b border-neutral-800 bg-red-500/10"
                    style={{ minWidth: 140 }}
                  >
                    <Text className="font-medium text-red-400">Cancel Timer</Text>
                    <MaterialIcons name="close" size={18} color="#f87171" />
                  </TouchableOpacity>
                )}
                {SLEEP_TIMER_OPTIONS.map((option, index) => (
                  <TouchableOpacity
                    key={option.minutes}
                    onPress={() => handleSleepTimerSelect(option.minutes)}
                    className={`px-4 py-3 flex-row items-center justify-between ${index < SLEEP_TIMER_OPTIONS.length - 1 || sleepTimerMinutes ? "border-b border-neutral-800" : ""
                      } ${sleepTimerMinutes === option.minutes ? "bg-primary/20" : ""}`}
                    style={{ minWidth: 140 }}
                  >
                    <Text
                      className={`font-medium ${sleepTimerMinutes === option.minutes ? "text-primary-light" : "text-white"
                        }`}
                    >
                      {option.label}
                    </Text>
                    {sleepTimerMinutes === option.minutes && (
                      <MaterialIcons name="check" size={18} color={colors.primary.light} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Loading Overlay */}
      {isLiveLoading && (
        <View className="absolute inset-0 bg-[#0a0e1c]/95 z-50 items-center justify-center">
          <View className="items-center">
            <Image
              source={require("@/assets/images/headphone-v1.png")}
              style={{ width: 80, height: 80, marginBottom: 24 }}
              resizeMode="contain"
            />
            <ActivityIndicator size="large" color={colors.primary.light} />
            <Text className="mt-4 text-lg font-semibold text-white/90">
              Loading {getModeDisplayName(currentMode)}...
            </Text>
            <Text className="mt-2 text-sm text-neutral-400">Please wait</Text>
          </View>
        </View>
      )}

      {/* Header */}
      <View className="px-6 pb-5 pt-14">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <Image
              source={require("@/assets/images/icon.png")}
              style={{ width: 32, height: 32 }}
              resizeMode="contain"
            />
            <View>
              <Text className="text-xl font-bold text-white/90">
                Quran Radio
              </Text>
              {/* Live Badge Below Text */}
              <View className="mt-1 self-start bg-green-500/90 px-2 py-0.5 rounded flex-row items-center">
                <View className="w-1 h-1 mr-1 bg-white rounded-full" />
                <Text className="text-white text-[8px] font-bold uppercase tracking-wider">
                  Live
                </Text>
              </View>
            </View>
          </View>

          <View className="flex-row items-center gap-3">
            {/* Mode Selector Button */}
            <TouchableOpacity
              onPress={() => setShowModeMenu(!showModeMenu)}
              disabled={isLiveLoading}
              className={`bg-primary px-4 py-2.5 rounded-xl flex-row items-center gap-2 ${isLiveLoading ? "opacity-50" : ""
                }`}
              accessibilityLabel="Select mode"
            >
              <Text className="text-sm font-semibold text-white">
                {getModeLabel(currentMode)}
              </Text>
              <MaterialIcons
                name={showModeMenu ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                size={20}
                color="white"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1">
        {/* Now Playing Card */}
        <View className="items-center p-8 mx-6 mt-6 mb-6">
          {liveError ? (
            <View className="items-center">
              <View className="items-center justify-center w-20 h-20 mb-4 rounded-full bg-red-500/10">
                <MaterialIcons name="warning" size={48} color="#ef4444" />
              </View>
              <Text className="mb-2 text-lg font-semibold text-center text-white/90">
                Connection Error
              </Text>
              <Text className="px-4 mb-6 text-sm text-center text-neutral-500">
                {liveError.message}
              </Text>
              <TouchableOpacity
                onPress={playLive}
                disabled={isLiveLoading}
                className="px-8 py-3 rounded-full bg-primary"
              >
                {isLiveLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-base font-semibold text-white">
                    Try Again
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {isLiveBuffering && (
                <ActivityIndicator color={colors.primary.light} size="small" />
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Fixed Play/Pause and Sleep Timer Buttons at Bottom Right */}
      <View className="absolute pb-8 bottom-24 right-6 items-end gap-3">
        {/* Sleep Timer Button */}
        <TouchableOpacity
          onPress={() => setShowSleepTimerMenu(!showSleepTimerMenu)}
          className={`bg-neutral-800/90 backdrop-blur-sm px-4 py-3 rounded-full flex-row items-center gap-2 shadow-lg ${sleepTimerMinutes ? "border-2 border-primary/60" : ""
            }`}
          accessibilityLabel="Sleep timer"
        >
          <MaterialIcons
            name="bedtime"
            size={20}
            color={sleepTimerMinutes ? colors.primary.light : "white"}
          />
          {sleepTimerRemaining !== null && (
            <Text className="text-sm font-semibold text-primary-light min-w-[40px]">
              {formatTimeRemaining(sleepTimerRemaining)}
            </Text>
          )}
        </TouchableOpacity>

        {/* Play/Pause Button */}
        <TouchableOpacity
          onPress={isLivePlaying ? pauseLive : playLive}
          disabled={isLiveLoading}
          className={`w-16 h-16 rounded-full items-center justify-center border border-primary/30 shadow-lg ${isLiveLoading ? "opacity-50" : ""}`}
        >
          {isLiveLoading ? (
            <ActivityIndicator size="small" color={colors.primary.light} />
          ) : (
            <MaterialIcons
              name={isLivePlaying ? "pause" : "play-arrow"}
              size={40}
              color="white"
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
