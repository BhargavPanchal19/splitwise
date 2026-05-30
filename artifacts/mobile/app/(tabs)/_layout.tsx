import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs, router } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { Platform, StyleSheet, View, TouchableOpacity, useColorScheme } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

export const unstable_settings = {
  initialRouteName: "friends",
};

const AccountIcon = ({ color }: { color: string }) => {
  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1.5,
        borderColor: color,
        overflow: "hidden",
        flexDirection: "row",
      }}
    >
      <View style={{ flex: 1, backgroundColor: "#E65A4B" }} />
      <View style={{ flex: 1, backgroundColor: "#FE7D6A" }} />
    </View>
  );
};

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="friends">
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <Label>Friends</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="groups">
        <Icon sf={{ default: "person.3", selected: "person.3.fill" }} />
        <Label>Groups</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "list.bullet.rectangle", selected: "list.bullet.rectangle.fill" }} />
        <Label>Activity</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <Icon sf={{ default: "person.circle", selected: "person.circle.fill" }} />
        <Label>Account</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      initialRouteName="friends"
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: true,
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: {
          fontFamily: "Inter_700Bold",
          fontSize: 20,
          color: colors.foreground,
        },
        headerShadowVisible: false,
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: isIOS ? "transparent" : colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: colors.tabBar,
          elevation: 8,
          height: Platform.OS === "ios" ? 82 : 92,
          paddingBottom: Platform.OS === "ios" ? 22 : 32,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          ...(isWeb ? { position: "absolute", bottom: 0, left: 0, right: 0, height: 84, paddingBottom: 0 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: colors.tabBar }]}
            />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
          marginBottom: isWeb ? 10 : 4,
        },
        tabBarButton: (props) => {
          const isSelected = props.accessibilityState?.selected;
          const { delayLongPress, ...restProps } = props as any;
          return (
            <TouchableOpacity
              {...restProps}
              activeOpacity={0.9}
              style={[
                props.style,
                {
                  borderTopWidth: isSelected ? 3 : 0,
                  borderTopColor: colors.primary,
                  paddingTop: isSelected ? 8 : 11,
                },
              ]}
            />
          );
        },
      }}
    >
      <Tabs.Screen
        name="friends"
        options={{
          title: "Friends",
          headerShown: false,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person.2" tintColor={color} size={24} />
            ) : (
              <Ionicons name="person-outline" size={24} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: "Groups",
          headerShown: false,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person.3" tintColor={color} size={24} />
            ) : (
              <Ionicons name="people-outline" size={24} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Activity",
          headerShown: false,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="bell" tintColor={color} size={24} />
            ) : (
              <Ionicons name="analytics-outline" size={24} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          headerShown: false,
          tabBarIcon: ({ color }) => <AccountIcon color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/(auth)/login");
    }
  }, [user, loading]);

  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
