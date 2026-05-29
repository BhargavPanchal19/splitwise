import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useData, Settlement } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { calculatePairBalance } from "@/utils/balanceCalculator";
import { formatAmount, parseToCents } from "@/utils/currency";
import Avatar from "@/components/Avatar";
import ExpenseTile from "@/components/ExpenseTile";

export default function GroupDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { groups, expenses, settlements, addSettlement } = useData();
  const [tab, setTab] = useState<"expenses" | "balances">("expenses");
  const [showSettle, setShowSettle] = useState(false);
  const [settleTo, setSettleTo] = useState("");
  const [settleAmount, setSettleAmount] = useState("");

  const group = useMemo(() => groups.find((g) => g.id === id), [groups, id]);
  const groupExpenses = useMemo(
    () => expenses.filter((e) => e.groupId === id),
    [expenses, id]
  );
  const groupSettlements = useMemo(
    () => settlements.filter((s) => s.groupId === id),
    [settlements, id]
  );

  const balances = useMemo(() => {
    if (!group || !user) return [];
    return group.members
      .filter((m) => m.id !== user.id)
      .map((m) => ({
        member: m,
        balance: calculatePairBalance(user.id, m.id, groupExpenses, groupSettlements),
      }))
      .filter((b) => b.balance !== 0);
  }, [group, user, groupExpenses, groupSettlements]);

  async function handleSettle() {
    if (!settleTo || !settleAmount.trim()) {
      Alert.alert("Error", "Please select a person and enter an amount.");
      return;
    }
    const amount = parseToCents(settleAmount);
    if (amount <= 0) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }
    const toMember = group?.members.find((m) => m.id === settleTo);
    if (!user || !toMember) return;
    const newSettlement: Settlement = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      paidBy: user.id,
      paidByName: user.name,
      paidTo: toMember.id,
      paidToName: toMember.name,
      amount,
      groupId: id ?? null,
      date: new Date().toISOString(),
    };
    await addSettlement(newSettlement);
    setShowSettle(false);
    setSettleTo("");
    setSettleAmount("");
    Alert.alert("Success", `Settlement of ${formatAmount(amount)} recorded.`);
  }

  if (!group) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: colors.foreground }}>Group not found.</Text>
      </View>
    );
  }

  const topPad = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 100, paddingTop: topPad },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.membersCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.membersLabel, { color: colors.mutedForeground }]}>
            {group.members.length} members
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.avatarRow}>
              {group.members.map((m) => (
                <View key={m.id} style={styles.avatarItem}>
                  <Avatar name={m.name} size={44} />
                  <Text style={[styles.avatarName, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {m.id === user?.id ? "You" : m.name.split(" ")[0]}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={[styles.tabBar, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "expenses" && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }]}
            onPress={() => setTab("expenses")}
          >
            <Text style={[styles.tabText, { color: tab === "expenses" ? colors.primary : colors.mutedForeground }]}>
              Expenses
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "balances" && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }]}
            onPress={() => setTab("balances")}
          >
            <Text style={[styles.tabText, { color: tab === "balances" ? colors.primary : colors.mutedForeground }]}>
              Balances
            </Text>
          </TouchableOpacity>
        </View>

        {tab === "expenses" && (
          <View style={styles.list}>
            {groupExpenses.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={40} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No expenses yet</Text>
              </View>
            ) : (
              groupExpenses.map((expense) => (
                <ExpenseTile key={expense.id} expense={expense} currentUserId={user?.id ?? ""} />
              ))
            )}
          </View>
        )}

        {tab === "balances" && (
          <View style={styles.list}>
            {balances.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={40} color={colors.primary} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>All settled up!</Text>
              </View>
            ) : (
              balances.map(({ member, balance }) => (
                <View key={member.id} style={[styles.balanceRow, { backgroundColor: colors.card }]}>
                  <Avatar name={member.name} size={40} />
                  <View style={styles.balanceInfo}>
                    <Text style={[styles.balanceName, { color: colors.foreground }]}>{member.name}</Text>
                    <Text
                      style={[styles.balanceAmount, { color: balance > 0 ? colors.positive : colors.negative }]}
                    >
                      {balance > 0 ? `Owes you ${formatAmount(balance)}` : `You owe ${formatAmount(Math.abs(balance))}`}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomActions, { bottom: insets.bottom + 90 }]}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
          onPress={() => router.push({ pathname: "/expenses/add", params: { groupId: id } })}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
          <Text style={[styles.actionBtnText, { color: colors.primary }]}>Add Expense</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          onPress={() => setShowSettle(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text style={[styles.actionBtnText, { color: "#fff" }]}>Settle Up</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showSettle} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Settle Up</Text>
            <TouchableOpacity onPress={() => setShowSettle(false)}>
              <Ionicons name="close" size={26} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Pay To</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {group.members
                  .filter((m) => m.id !== user?.id)
                  .map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      style={[
                        styles.memberChip,
                        {
                          backgroundColor: settleTo === m.id ? colors.primary : colors.secondary,
                        },
                      ]}
                      onPress={() => setSettleTo(m.id)}
                    >
                      <Text style={[styles.chipText, { color: settleTo === m.id ? "#fff" : colors.primary }]}>
                        {m.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </ScrollView>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Amount</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
              placeholder="0.00"
              placeholderTextColor={colors.mutedForeground}
              value={settleAmount}
              onChangeText={setSettleAmount}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity
              style={[styles.settleBtn, { backgroundColor: colors.primary }]}
              onPress={handleSettle}
              activeOpacity={0.85}
            >
              <Text style={styles.settleBtnText}>Record Payment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 12 },
  membersCard: {
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    marginTop: 8,
  },
  membersLabel: { fontFamily: "Inter_500Medium", fontSize: 13 },
  avatarRow: { flexDirection: "row", gap: 16 },
  avatarItem: { alignItems: "center", gap: 4 },
  avatarName: { fontFamily: "Inter_400Regular", fontSize: 11, maxWidth: 50 },
  tabBar: {
    flexDirection: "row",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 14 },
  tabText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  list: { gap: 8 },
  emptyState: { alignItems: "center", gap: 8, paddingVertical: 40 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 15 },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  balanceInfo: { flex: 1, gap: 3 },
  balanceName: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  balanceAmount: { fontFamily: "Inter_500Medium", fontSize: 13 },
  bottomActions: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  actionBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 22 },
  modalBody: { paddingHorizontal: 20, gap: 12 },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6 },
  memberChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  chipText: { fontFamily: "Inter_500Medium", fontSize: 14 },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
  },
  settleBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  settleBtnText: { fontFamily: "Inter_700Bold", fontSize: 17, color: "#fff" },
});
