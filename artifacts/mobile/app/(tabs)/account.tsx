import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { calculateNetBalance } from "@/utils/balanceCalculator";
import { formatAmount } from "@/utils/currency";
import Avatar from "@/components/Avatar";

export default function AccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { expenses, settlements, groups, friends } = useData();

  const myExpenses = useMemo(
    () =>
      expenses.filter(
        (e) =>
          e.paidBy === user?.id ||
          e.splits.some((s) => s.userId === user?.id)
      ),
    [expenses, user]
  );

  const netBalance = useMemo(
    () => (user ? calculateNetBalance(user.id, myExpenses, settlements) : 0),
    [user, myExpenses, settlements]
  );

  const totalPaid = useMemo(
    () =>
      expenses
        .filter((e) => e.paidBy === user?.id)
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses, user]
  );

  async function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  const topPad = Platform.OS === "web" ? 67 : 0;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 100, paddingTop: topPad },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
        <Avatar name={user?.name ?? "U"} size={72} />
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.foreground }]}>
            {user?.name}
          </Text>
          <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>
            {user?.email}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {myExpenses.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            Expenses
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {groups.filter((g) => g.members.some((m) => m.id === user?.id)).length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            Groups
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {friends.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            Friends
          </Text>
        </View>
      </View>

      <View style={[styles.balanceSummary, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Balance Summary</Text>
        <View style={styles.balanceRow}>
          <Text style={[styles.balanceLabel, { color: colors.mutedForeground }]}>Total paid by you</Text>
          <Text style={[styles.balanceValue, { color: colors.foreground }]}>
            {formatAmount(totalPaid)}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.balanceRow}>
          <Text style={[styles.balanceLabel, { color: colors.mutedForeground }]}>Net balance</Text>
          <Text
            style={[
              styles.balanceValue,
              {
                color:
                  netBalance === 0
                    ? colors.mutedForeground
                    : netBalance > 0
                    ? colors.positive
                    : colors.negative,
              },
            ]}
          >
            {netBalance === 0
              ? "Settled up"
              : netBalance > 0
              ? `Owed ${formatAmount(netBalance)}`
              : `Owes ${formatAmount(Math.abs(netBalance))}`}
          </Text>
        </View>
      </View>

      <View style={[styles.menuSection, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIcon, { backgroundColor: "#FFF0EF" }]}>
            <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
          </View>
          <Text style={[styles.menuText, { color: colors.destructive }]}>Sign Out</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.destructive} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginTop: 8,
  },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { fontFamily: "Inter_700Bold", fontSize: 20 },
  profileEmail: { fontFamily: "Inter_400Regular", fontSize: 14 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 22 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 12 },
  balanceSummary: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 16 },
  balanceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  balanceLabel: { fontFamily: "Inter_400Regular", fontSize: 14 },
  balanceValue: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  divider: { height: 1 },
  menuSection: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 16 },
});
