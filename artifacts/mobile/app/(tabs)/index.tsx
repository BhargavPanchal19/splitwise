import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  FlatList,
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
import { calculateNetBalance, calculatePairBalance } from "@/utils/balanceCalculator";
import { formatAmount } from "@/utils/currency";
import Avatar from "@/components/Avatar";
import BalanceCard from "@/components/BalanceCard";
import ExpenseTile from "@/components/ExpenseTile";
import FriendTile from "@/components/FriendTile";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { expenses, settlements, friends } = useData();

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

  const friendsWithBalance = useMemo(
    () =>
      friends
        .map((f) => ({
          friend: f,
          balance: user
            ? calculatePairBalance(user.id, f.id, myExpenses, settlements)
            : 0,
        }))
        .filter((f) => f.balance !== 0)
        .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)),
    [friends, user, myExpenses, settlements]
  );

  const recentExpenses = useMemo(() => myExpenses.slice(0, 5), [myExpenses]);

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
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            Good day,
          </Text>
          <Text style={[styles.userName, { color: colors.foreground }]}>
            {user?.name ?? ""}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/expenses/add")}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <BalanceCard amount={netBalance} large />

      {friendsWithBalance.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Outstanding Balances
          </Text>
          <View style={styles.list}>
            {friendsWithBalance.map(({ friend, balance }) => (
              <FriendTile
                key={friend.id}
                friend={friend}
                balance={balance}
                onPress={() => router.push(`/friends/${friend.id}`)}
              />
            ))}
          </View>
        </View>
      )}

      {recentExpenses.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Recent Expenses
          </Text>
          <View style={styles.list}>
            {recentExpenses.map((expense) => (
              <ExpenseTile
                key={expense.id}
                expense={expense}
                currentUserId={user?.id ?? ""}
              />
            ))}
          </View>
        </View>
      )}

      {myExpenses.length === 0 && friends.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={56} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No expenses yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Add friends and start splitting expenses together
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/expenses/add")}
          >
            <Text style={styles.emptyButtonText}>Add first expense</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    gap: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  greeting: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  userName: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1CC29F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
  },
  list: {
    gap: 8,
  },
  emptyState: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
  },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    textAlign: "center",
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#fff",
  },
});
