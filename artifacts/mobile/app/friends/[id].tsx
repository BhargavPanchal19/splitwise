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
import BalanceCard from "@/components/BalanceCard";
import ExpenseTile from "@/components/ExpenseTile";

export default function FriendDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { friends, expenses, settlements, addSettlement } = useData();
  const [showSettle, setShowSettle] = useState(false);
  const [settleAmount, setSettleAmount] = useState("");

  const friend = useMemo(() => friends.find((f) => f.id === id), [friends, id]);

  const sharedExpenses = useMemo(
    () =>
      expenses.filter(
        (e) =>
          e.groupId === null &&
          (e.paidBy === id || e.paidBy === user?.id) &&
          e.involvedUsers.includes(id ?? "") &&
          e.involvedUsers.includes(user?.id ?? "")
      ),
    [expenses, id, user]
  );

  const balance = useMemo(
    () =>
      user && id ? calculatePairBalance(user.id, id, expenses, settlements) : 0,
    [user, id, expenses, settlements]
  );

  async function handleSettle() {
    if (!settleAmount.trim()) {
      Alert.alert("Error", "Please enter an amount.");
      return;
    }
    const amount = parseToCents(settleAmount);
    if (amount <= 0) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }
    if (!user || !friend) return;
    const newSettlement: Settlement = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      paidBy: user.id,
      paidByName: user.name,
      paidTo: friend.id,
      paidToName: friend.name,
      amount,
      groupId: null,
      date: new Date().toISOString(),
    };
    await addSettlement(newSettlement);
    setShowSettle(false);
    setSettleAmount("");
    Alert.alert("Success", `Settlement of ${formatAmount(amount)} recorded.`);
  }

  if (!friend) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: colors.foreground }}>Friend not found.</Text>
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
        <View style={styles.profileRow}>
          <Avatar name={friend.name} size={64} />
          <View>
            <Text style={[styles.friendName, { color: colors.foreground }]}>{friend.name}</Text>
            <Text style={[styles.friendEmail, { color: colors.mutedForeground }]}>{friend.email}</Text>
          </View>
        </View>

        <BalanceCard amount={balance} />

        {sharedExpenses.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Shared Expenses</Text>
            <View style={styles.list}>
              {sharedExpenses.map((expense) => (
                <ExpenseTile key={expense.id} expense={expense} currentUserId={user?.id ?? ""} />
              ))}
            </View>
          </View>
        )}

        {sharedExpenses.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No shared expenses yet
            </Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.settleBtn, { bottom: insets.bottom + 90, backgroundColor: colors.primary }]}
        onPress={() => setShowSettle(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
        <Text style={styles.settleBtnText}>Settle Up</Text>
      </TouchableOpacity>

      <Modal visible={showSettle} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Settle Up with {friend.name}</Text>
            <TouchableOpacity onPress={() => setShowSettle(false)}>
              <Ionicons name="close" size={26} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <BalanceCard amount={balance} />
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Amount to Pay</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
              placeholder="0.00"
              placeholderTextColor={colors.mutedForeground}
              value={settleAmount}
              onChangeText={setSettleAmount}
              keyboardType="decimal-pad"
              autoFocus
            />
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
              onPress={handleSettle}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmBtnText}>Record Payment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 8,
  },
  friendName: { fontFamily: "Inter_700Bold", fontSize: 22 },
  friendEmail: { fontFamily: "Inter_400Regular", fontSize: 14 },
  section: { gap: 10 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  list: { gap: 8 },
  emptyState: { alignItems: "center", gap: 10, paddingVertical: 32 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 15 },
  settleBtn: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#1CC29F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  settleBtnText: { fontFamily: "Inter_700Bold", fontSize: 17, color: "#fff" },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, flex: 1, paddingRight: 10 },
  modalBody: { paddingHorizontal: 20, gap: 14 },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6 },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
  },
  confirmBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  confirmBtnText: { fontFamily: "Inter_700Bold", fontSize: 17, color: "#fff" },
});
