import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import PolygonBackground from "@/components/PolygonBackground";
import { formatAmount } from "@/utils/currency";

export default function RecentActivityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { expenses, settlements, groups, allUsers, reminders } = useData();

  // Helper to format relative time
  function getRelativeTime(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} minutes ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  }

  // Helper to render bold markdown and quotes
  function renderFormattedText(text: string, color: string) {
    const parts = text.split(/(\*\*.*?\*\*|"[^"]*")/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <Text key={index} style={[styles.boldText, { color }]}>
            {part.slice(2, -2)}{" "}
          </Text>
        );
      }
      if (part.startsWith('"') && part.endsWith('"')) {
        return (
          <Text key={index} style={[styles.boldText, { color }]}>
            {part}{" "}
          </Text>
        );
      }
      return <Text key={index} style={{ color }}>{part}</Text>;
    });
  }

  // Dynamic Activity Logs based on Workspace State
  const activities = useMemo(() => {
    const list: { id: string; text: string; dateText: string; timestamp: number }[] = [];

    // 1. Group Creations
    const uniqueGroups = Array.from(new Map(groups.map((g) => [g.id, g])).values());
    for (const g of uniqueGroups) {
      if (!g || !g.id || !g.createdAt) continue;
      const time = new Date(g.createdAt).getTime();
      if (isNaN(time)) continue;

      const isMe = g.createdBy === user?.id;
      const creatorName = isMe ? "You" : (allUsers.find((u) => u.id === g.createdBy)?.name ?? "Someone");
      list.push({
        id: `group_create_${g.id}`,
        text: `**${creatorName}** created the group "${g.name || "Unnamed Group"}".`,
        dateText: getRelativeTime(time),
        timestamp: time,
      });
    }

    // 2. Expenses Added
    const uniqueExpenses = Array.from(new Map(expenses.map((e) => [e.id, e])).values());
    for (const e of uniqueExpenses) {
      if (!e || !e.id || !e.createdAt || !e.title) continue;
      const time = new Date(e.createdAt).getTime();
      if (isNaN(time)) continue;

      const isMe = e.paidBy === user?.id;
      const paidByName = isMe ? "You" : (e.paidByName || "Someone");
      const groupName = e.groupId ? groups.find((g) => g.id === e.groupId)?.name : null;
      let text = `**${paidByName}** added "${e.title}".`;
      if (groupName) {
        text = `**${paidByName}** added "${e.title}" in "${groupName}".`;
      }
      list.push({
        id: `expense_add_${e.id}`,
        text,
        dateText: getRelativeTime(time),
        timestamp: time,
      });
    }

    // 3. Settlements Recorded
    const uniqueSettlements = Array.from(new Map(settlements.map((s) => [s.id, s])).values());
    for (const s of uniqueSettlements) {
      if (!s || !s.id || !s.date || !s.paidBy || !s.paidTo) continue;
      const time = new Date(s.date).getTime();
      if (isNaN(time)) continue;

      const isMe = s.paidBy === user?.id;
      const paidByName = isMe ? "You" : (s.paidByName || "Someone");
      const paidToName = s.paidTo === user?.id ? "you" : (s.paidToName || "Someone");
      list.push({
        id: `settle_${s.id}`,
        text: `**${paidByName}** settled up with **${paidToName}**.`,
        dateText: getRelativeTime(time),
        timestamp: time,
      });
    }

    // 4. Reminders
    if (reminders) {
      const uniqueReminders = Array.from(new Map(reminders.map((r) => [r.id, r])).values());
      for (const r of uniqueReminders) {
        if (!r || !r.id || !r.date || !r.senderId || !r.receiverId) continue;
        const time = new Date(r.date).getTime();
        if (isNaN(time)) continue;

        const isMeSender = r.senderId === user?.id;
        const isMeReceiver = r.receiverId === user?.id;

        if (isMeSender) {
          list.push({
            id: `reminder_${r.id}`,
            text: `You sent a reminder to **${r.receiverName}** to settle **${formatAmount(r.amount)}**.`,
            dateText: getRelativeTime(time),
            timestamp: time,
          });
        } else if (isMeReceiver) {
          list.push({
            id: `reminder_${r.id}`,
            text: `**${r.senderName}** sent you a reminder to settle **${formatAmount(r.amount)}**.`,
            dateText: getRelativeTime(time),
            timestamp: time,
          });
        }
      }
    }

    // Sort desc by timestamp
    const sorted = list.sort((a, b) => b.timestamp - a.timestamp);

    return sorted;
  }, [groups, expenses, settlements, user, allUsers, reminders]);

  const topPad = Platform.OS === "web" ? 10 : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 16) }]}>
      <PolygonBackground />

      {/* Play Store Custom Top Header Row */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
          <Ionicons name="search-outline" size={24} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Large Left-Aligned Screen Title */}
      <Text style={[styles.screenTitle, { color: colors.foreground }]}>Recent activity</Text>

      {/* Activity FlatList */}
      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 110, paddingTop: topPad },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={56} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No activity yet
            </Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              Every time you split expenses, create groups, or settle bills, they will appear here!
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.activityRow}>
            {/* Dark rounded icon container with orange badge overlay */}
            <View style={styles.avatarWrapper}>
              <View style={[styles.iconSquare, { backgroundColor: "#2E3A36" }]}>
                <Ionicons name="shapes-outline" size={20} color="#1CC29F" />
              </View>
              <View style={[styles.badgeDot, { backgroundColor: "#FF4500" }]} />
            </View>

            {/* Content Text Column */}
            <View style={styles.contentCol}>
              <Text style={styles.descText} numberOfLines={2}>
                {renderFormattedText(item.text, colors.foreground)}
              </Text>
              <Text style={[styles.timeText, { color: colors.mutedForeground }]}>
                {item.dateText}
              </Text>
            </View>
          </View>
        )}
      />

      {/* Pill-Shaped Play Store FAB */}
      <TouchableOpacity
        style={[styles.fabPill, { backgroundColor: colors.primary, bottom: insets.bottom + 80 }]}
        onPress={() => router.push("/expenses/add")}
        activeOpacity={0.9}
      >
        <Ionicons name="receipt-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
        <Text style={styles.fabPillText}>Add expense</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  iconBtn: {
    padding: 4,
  },
  screenTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 16,
  },
  content: { paddingHorizontal: 20, gap: 18 },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrapper: {
    width: 48,
    height: 48,
    position: "relative",
    marginRight: 16,
  },
  iconSquare: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2.2,
    borderColor: "#fff",
  },
  contentCol: {
    flex: 1,
    justifyContent: "center",
    gap: 3,
  },
  descText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 20,
  },
  boldText: {
    fontFamily: "Inter_700Bold",
  },
  timeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  fabPill: {
    position: "absolute",
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: "#1CC29F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  fabPillText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#fff",
  },
  emptyState: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
  },
  emptySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    textAlign: "center",
  },
});
