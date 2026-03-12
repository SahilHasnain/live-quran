import { AnimatedTabBar } from "@/components/AnimatedTabBar";
import { HeaderVisibilityProvider } from "@/contexts/HeaderVisibilityContext";
import { TabBarVisibilityProvider } from "@/contexts/TabBarVisibilityContext";
import { MaterialIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <HeaderVisibilityProvider>
      <TabBarVisibilityProvider>
        <Tabs
          tabBar={(props) => <AnimatedTabBar {...props} />}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: "Live",
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="radio" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="audios"
            options={{
              title: "Browse",
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="menu-book" size={size} color={color} />
              ),
            }}
          />
        </Tabs>
      </TabBarVisibilityProvider>
    </HeaderVisibilityProvider>
  );
}
