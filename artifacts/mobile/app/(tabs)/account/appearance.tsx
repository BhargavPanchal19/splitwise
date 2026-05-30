import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useTheme, ThemeMode } from "@/context/ThemeContext";
import PolygonBackground from "@/components/PolygonBackground";

export default function AppearanceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { themeMode, setThemeMode } = useTheme();

  const options: {
    id: ThemeMode;
    title: string;
    description?: string;
    icon: string;
  }[] = [
    {
      id: "light",
      title: "Light",
      icon: "sunny-outline",
    },
    {
      id: "dark",
      title: "Dark",
      icon: "moon-outline",
    },
    {
      id: "system",
      title: "System",
      description: "App appearance adjusts to match your system settings",
      icon: "contrast-outline",
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <PolygonBackground />

      {/* Custom Top Back Header Row */}
      <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Appearance</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Premium Options Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {options.map((item, index) => {
            const isActive = themeMode === item.id;
            const isLast = index === options.length - 1;

            return (
              <View key={item.id}>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => setThemeMode(item.id)}
                  activeOpacity={0.7}
                >
                  {/* Left Side Icon */}
                  <Ionicons name={item.icon as any} size={22} color={colors.foreground} style={styles.optionIcon} />

                  {/* Center Content Column */}
                  <View style={styles.textContainer}>
                    <Text style={[styles.optionTitle, { color: colors.foreground }]}>{item.title}</Text>
                    {item.description && (
                      <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>{item.description}</Text>
                    )}
                  </View>

                  {/* Active Green Checkmark Indicator */}
                  {isActive && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} style={styles.checkmarkIcon} />
                  )}
                </TouchableOpacity>

                {/* Inner divider */}
                {!isLast && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.8,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  optionIcon: {
    marginRight: 18,
    width: 24,
    textAlign: "center",
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  optionTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
  },
  optionDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  checkmarkIcon: {
    marginLeft: 12,
  },
  divider: {
    height: 0.8,
    marginLeft: 60,
  },
});
