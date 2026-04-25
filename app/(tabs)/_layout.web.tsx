import { HeaderVisibilityProvider } from "@/contexts/HeaderVisibilityContext";
import { TabBarVisibilityProvider } from "@/contexts/TabBarVisibilityContext";
import { MaterialIcons } from "@expo/vector-icons";
import { Slot, usePathname, useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

const NAV_ITEMS = [
  { href: "/", label: "Browse", icon: "menu-book" as const },
  { href: "/live", label: "Live", icon: "radio" as const },
  { href: "/history", label: "History", icon: "history" as const },
  { href: "/downloads", label: "Downloads", icon: "download" as const },
];

export default function TabLayoutWeb() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <HeaderVisibilityProvider>
      <TabBarVisibilityProvider>
        <View className="flex-1 bg-[#050906]">
          <View className="absolute inset-0 bg-[rgb(5,9,6)]" />
          <View className="absolute -left-24 top-[-80px] h-[360px] w-[360px] rounded-full bg-emerald-400/10" />
          <View className="absolute right-[-120px] top-[10%] h-[460px] w-[460px] rounded-full bg-amber-400/5" />
          <View className="absolute bottom-[-140px] left-[20%] h-[400px] w-[400px] rounded-full bg-emerald-500/10" />

          <View className="flex-1 flex-row px-6 py-6">
            <View className="mr-6 w-[280px] overflow-hidden rounded-[28px] border border-white/10 bg-[#0a120d]/92">
              <View className="border-b border-white/10 px-6 pb-6 pt-7">
                <View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15">
                  <MaterialIcons name="auto-stories" size={26} color="#34d399" />
                </View>
                <Text className="text-2xl font-bold text-white">Live Quran</Text>
              </View>

              <View className="px-4 py-4">
                {NAV_ITEMS.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href === "/" && pathname === "/(tabs)") ||
                    pathname === `/(tabs)${item.href === "/" ? "" : item.href}`;

                  return (
                    <Pressable
                      key={item.href}
                      onPress={() => router.push(item.href)}
                      className={`mb-2 flex-row items-center rounded-2xl px-4 py-4 ${
                        isActive
                          ? "bg-emerald-500/15 border border-emerald-400/30"
                          : "border border-transparent bg-transparent"
                      }`}
                    >
                      <View
                        className={`mr-4 h-11 w-11 items-center justify-center rounded-xl ${
                          isActive ? "bg-emerald-400/15" : "bg-white/5"
                        }`}
                      >
                        <MaterialIcons
                          name={item.icon}
                          size={22}
                          color={isActive ? "#6ee7b7" : "#737373"}
                        />
                      </View>
                      <View className="flex-1">
                        <Text
                          className={`text-base font-semibold ${
                            isActive ? "text-white" : "text-neutral-300"
                          }`}
                        >
                          {item.label}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View className="flex-1 overflow-hidden rounded-[32px] border border-white/10 bg-[#07110b]/80">
              <View style={{ flex: 1 }}>
                <Slot />
              </View>
            </View>
          </View>
        </View>
      </TabBarVisibilityProvider>
    </HeaderVisibilityProvider>
  );
}
