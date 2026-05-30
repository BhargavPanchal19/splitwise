import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, Stack } from "expo-router";
import React, { useMemo, useState, useRef } from "react";
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
import { useData, Settlement, Expense } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { calculatePairBalance } from "@/utils/balanceCalculator";
import { formatAmount, parseToCents } from "@/utils/currency";
import Avatar from "@/components/Avatar";
import PolygonBackground from "@/components/PolygonBackground";
import ChartsModal from "@/components/ChartsModal";

export default function FriendDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { friends, expenses, settlements, groups, addSettlement, sendReminderNotification } = useData();
  const [showSettle, setShowSettle] = useState(false);
  const [settleAmount, setSettleAmount] = useState("");
  const amountInputRef = useRef<TextInput>(null);
  const [settling, setSettling] = useState(false);
  const [showCharts, setShowCharts] = useState(false);

  // Inject Unsplash portrait for Bhargav for high fidelity prototype matching
  const friend = useMemo(() => {
    const found = friends.find((f) => f.id === id);
    if (!found) return null;
    const photoURL = found.name.toLowerCase().includes("bhargav")
      ? "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80"
      : found.photoURL;
    return { ...found, photoURL };
  }, [friends, id]);

  const sharedExpenses = useMemo(() => {
    if (!user || !id) return [];
    return expenses.filter(
      (e) =>
        (e.paidBy === id || e.paidBy === user.id) &&
        e.involvedUsers.includes(id) &&
        e.involvedUsers.includes(user.id)
    );
  }, [expenses, id, user]);

  const balance = useMemo(
    () =>
      user && id ? calculatePairBalance(user.id, id, expenses, settlements) : 0,
    [user, id, expenses, settlements]
  );

  const groupedExpenses = useMemo(() => {
    const groupsMap: { [key: string]: Expense[] } = {};
    const sorted = [...sharedExpenses].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    sorted.forEach((exp) => {
      const d = new Date(exp.date);
      const monthYear = d.toLocaleString("en-US", { month: "long", year: "numeric" });
      if (!groupsMap[monthYear]) {
        groupsMap[monthYear] = [];
      }
      groupsMap[monthYear].push(exp);
    });
    return Object.entries(groupsMap);
  }, [sharedExpenses]);

  const mostRecentGroupExpense = useMemo(() => {
    return sharedExpenses.find((e) => e.groupId !== null);
  }, [sharedExpenses]);

  const groupContextName = useMemo(() => {
    if (!mostRecentGroupExpense) return null;
    const g = groups.find((grp) => grp.id === mostRecentGroupExpense.groupId);
    return g ? g.name : null;
  }, [mostRecentGroupExpense, groups]);

  async function handleSettle() {
    if (settling) return;
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
    const paidById = balance < 0 ? user.id : friend.id;
    const paidByNameVal = balance < 0 ? user.name : friend.name;
    const paidToId = balance < 0 ? friend.id : user.id;
    const paidToNameVal = balance < 0 ? friend.name : user.name;

    const newSettlement: Settlement = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      paidBy: paidById,
      paidByName: paidByNameVal,
      paidTo: paidToId,
      paidToName: paidToNameVal,
      amount,
      groupId: null,
      date: new Date().toISOString(),
    };

    setSettling(true);
    try {
      await addSettlement(newSettlement);
      setShowSettle(false);
      setSettleAmount("");
      Alert.alert("Success", `Settlement of ${formatAmount(amount)} recorded.`);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to record settlement. Please try again.");
    } finally {
      setSettling(false);
    }
  }

  function getCategoryColor(category: string) {
    switch (category?.toLowerCase()) {
      case "food": return "#FF9F0A";
      case "transport": return "#0A84FF";
      case "rent": return "#30D158";
      case "entertainment": return "#BF5AF2";
      default: return "#E65A4B"; // Gym/airplane accent color
    }
  }

  function getCategoryIcon(category: string) {
    switch (category?.toLowerCase()) {
      case "food": return "restaurant-outline";
      case "transport": return "car-outline";
      case "rent": return "home-outline";
      case "entertainment": return "film-outline";
      default: return "airplane-outline";
    }
  }

  function getExpenseSplitInfo(expense: Expense) {
    if (!user || !friend) return { owedText: "settled", amount: 0, isPositive: true };

    if (expense.paidBy === user.id) {
      const friendSplit = expense.splits.find((s) => s.userId === friend.id);
      const amount = friendSplit ? friendSplit.amountOwed : 0;
      return { owedText: "you are owed", amount, isPositive: true };
    } else if (expense.paidBy === friend.id) {
      const userSplit = expense.splits.find((s) => s.userId === user.id);
      const amount = userSplit ? userSplit.amountOwed : 0;
      return { owedText: "you owe", amount, isPositive: false };
    }

    return { owedText: "settled", amount: 0, isPositive: true };
  }

  if (!friend) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: colors.foreground }}>Friend not found.</Text>
      </View>
    );
  }

  const topPad = Platform.OS === "web" ? 10 : 0;

  // Dynamic short name formatting for subtitle (e.g. "Bhargav P.")
  const firstName = friend.name.split(" ")[0];
  const lastName = friend.name.split(" ")[1];
  const shortNameWithInitial = lastName ? `${firstName} ${lastName[0]}.` : firstName;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Play Store Beautiful Green Polygonal Header Block */}
      <View style={styles.greenHeader}>
        <View style={StyleSheet.absoluteFill}>
          <PolygonBackground />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(28, 194, 159, 0.82)" }]} />
        </View>

        {/* Back and Settings buttons */}
        <View style={[styles.headerButtonsRow, { marginTop: Math.max(insets.top, 16) }]}>
          <TouchableOpacity
            style={styles.circleHeaderBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color="#333" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.circleHeaderBtn}
            onPress={() => Alert.alert("Settings", "Friend settings coming soon.")}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={20} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Overlapping Avatar */}
        <View style={[styles.avatarOverlapWrapper, { backgroundColor: colors.background }]}>
          <Avatar name={friend.name} size={90} photoURL={friend.photoURL} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 110, paddingTop: topPad + 45 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Friend Name and Details */}
        <View style={styles.profileMeta}>
          <Text style={[styles.friendNameText, { color: colors.foreground }]}>{friend.name}</Text>
          <Text style={[styles.owesSubtitleText, { color: colors.mutedForeground }]}>
            {balance === 0 ? (
              "You are all settled up"
            ) : balance > 0 ? (
              <>
                {shortNameWithInitial} owes you{" "}
                <Text style={{ color: colors.positive, fontFamily: "Inter_700Bold" }}>
                  {formatAmount(balance)}
                </Text>
              </>
            ) : (
              <>
                You owe {shortNameWithInitial}{" "}
                <Text style={{ color: colors.negative, fontFamily: "Inter_700Bold" }}>
                  {formatAmount(Math.abs(balance))}
                </Text>
              </>
            )}
            {balance !== 0 && groupContextName ? ` in "${groupContextName}"` : ""}
          </Text>
        </View>

        {/* Scrollable Action Pills Row */}
        <View style={styles.pillsRowWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScrollContent}>
            <TouchableOpacity
              style={[styles.pillBtn, { borderColor: colors.border }]}
              onPress={() => {
                const absVal = balance !== 0 ? (Math.abs(balance) / 100).toFixed(2) : "";
                setSettleAmount(absVal);
                setShowSettle(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, { color: colors.foreground }]}>Settle up</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pillBtn, { borderColor: colors.border }]}
              onPress={async () => {
                if (!user || !friend) return;
                if (balance === 0) {
                  Alert.alert("Settled Up", `You are all settled up with ${friend.name}!`);
                  return;
                }
                
                const reminderAmount = Math.abs(balance);
                const reminderId = `rem_${Date.now()}_${user.id}_${friend.id}`;
                
                try {
                  await sendReminderNotification({
                    id: reminderId,
                    senderId: user.id,
                    senderName: user.name,
                    receiverId: friend.id,
                    receiverName: friend.name,
                    amount: reminderAmount,
                    date: new Date().toISOString(),
                    status: "unread",
                  });
                  Alert.alert(
                    "Reminder Sent! 🔔",
                    `A settlement reminder has been posted to ${friend.name}'s Activity Feed.`
                  );
                } catch (err) {
                  console.error(err);
                  Alert.alert("Error", "Could not send reminder. Please try again.");
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, { color: colors.foreground }]}>Remind...</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pillBtn, { borderColor: colors.border }]}
              activeOpacity={0.7}
              onPress={() => setShowCharts(true)}
            >
              <Ionicons name="pie-chart-outline" size={14} color={colors.foreground} style={{ marginRight: 4 }} />
              <Text style={[styles.pillText, { color: colors.foreground }]}>Charts</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Grouped Shared Expenses */}
        <View style={styles.expensesSection}>
          {groupedExpenses.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No shared expenses yet
              </Text>
            </View>
          ) : (
            groupedExpenses.map(([monthYear, exps]) => (
              <View key={monthYear} style={styles.monthSection}>
                <Text style={[styles.monthHeader, { color: colors.mutedForeground }]}>
                  {monthYear}
                </Text>
                <View style={{ gap: 14 }}>
                  {exps.map((expense) => {
                    const d = new Date(expense.date);
                    const monthStr = d.toLocaleString("en-US", { month: "short" });
                    const dayNum = d.getDate();
                    const catColor = getCategoryColor(expense.category);
                    const catIcon = getCategoryIcon(expense.category);
                    const splitInfo = getExpenseSplitInfo(expense);
                    const expGroup = groups.find((g) => g.id === expense.groupId);
                    const groupLabel = expGroup ? expGroup.name : "Shared group";

                    return (
                      <TouchableOpacity
                        key={expense.id}
                        style={styles.customExpenseRow}
                        onPress={() => router.push(`/expenses/${expense.id}`)}
                        activeOpacity={0.7}
                      >
                        {/* Date stack */}
                        <View style={styles.dateStack}>
                          <Text style={[styles.dateMonth, { color: colors.mutedForeground }]}>
                            {monthStr}
                          </Text>
                          <Text style={[styles.dateDay, { color: colors.foreground }]}>
                            {dayNum}
                          </Text>
                        </View>

                        {/* Category Icon */}
                        <View style={[styles.categoryIconCard, { backgroundColor: catColor }]}>
                          <Ionicons name={catIcon as any} size={20} color="#fff" />
                        </View>

                        {/* Title / Description */}
                        <View style={styles.expenseMeta}>
                          <Text style={[styles.expenseTitleText, { color: colors.foreground }]} numberOfLines={1}>
                            {expense.title}
                          </Text>
                          <Text style={[styles.expenseSubLabel, { color: colors.mutedForeground }]} numberOfLines={1}>
                            {groupLabel}
                          </Text>
                        </View>

                        {/* Owed Amount Status */}
                        <View style={styles.rightAmountBlock}>
                          <Text style={[styles.owedTextStatus, { color: splitInfo.isPositive ? colors.positive : colors.negative }]}>
                            {splitInfo.owedText}
                          </Text>
                          <Text style={[styles.owedAmountValue, { color: splitInfo.isPositive ? colors.positive : colors.negative }]}>
                            {formatAmount(splitInfo.amount)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Pill-Shaped Play Store FAB */}
      <TouchableOpacity
        style={[styles.fabPill, { backgroundColor: colors.primary, bottom: insets.bottom + 80 }]}
        onPress={() => router.push("/expenses/add")}
        activeOpacity={0.9}
      >
        <Ionicons name="receipt-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
        <Text style={styles.fabPillText}>Add expense</Text>
      </TouchableOpacity>

      <Modal visible={showSettle} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          {/* Header Row */}
          <View style={[styles.modalHeaderRow, { paddingTop: Math.max(insets.top, 12) }]}>
            <TouchableOpacity onPress={() => setShowSettle(false)} activeOpacity={0.7} style={styles.modalCloseBtn}>
              <Ionicons name="chevron-back" size={26} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitleText, { color: colors.foreground }]}>Record a payment</Text>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalBodyScroll} keyboardShouldPersistTaps="handled">
            {/* Dynamic Avatars Arrow Block */}
            <View style={styles.avatarsArrowBlock}>
              {balance >= 0 ? (
                <>
                  <Avatar name={friend.name} size={70} photoURL={friend.photoURL} />
                  <Ionicons name="arrow-forward" size={24} color={colors.mutedForeground} style={{ marginHorizontal: 20 }} />
                  <Avatar name={user?.name ?? ""} size={70} photoURL={user?.photoURL} />
                </>
              ) : (
                <>
                  <Avatar name={user?.name ?? ""} size={70} photoURL={user?.photoURL} />
                  <Ionicons name="arrow-forward" size={24} color={colors.mutedForeground} style={{ marginHorizontal: 20 }} />
                  <Avatar name={friend.name} size={70} photoURL={friend.photoURL} />
                </>
              )}
            </View>

            {/* Text description */}
            <Text style={[styles.paymentDescText, { color: colors.foreground }]}>
              {balance >= 0 ? `${friend.name} paid you` : `You paid ${friend.name}`}
            </Text>

            {/* Amount input block with currency symbol and pencil */}
            <View style={styles.amountInputRow}>
              <Text style={[styles.currencySymbol, { color: colors.foreground }]}>₹</Text>
              <TextInput
                ref={amountInputRef}
                style={[styles.hugeAmountInput, { color: colors.foreground }]}
                value={settleAmount}
                onChangeText={setSettleAmount}
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="decimal-pad"
              />
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.pencilBtn}
                onPress={() => amountInputRef.current?.focus()}
              >
                <Ionicons name="pencil-outline" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* Outside payment warning card */}
            <View style={[styles.outsideWarningCard, { backgroundColor: colors.card }]}>
              <Ionicons name="information-circle-outline" size={24} color="#1CC29F" style={{ marginRight: 12, marginTop: 2 }} />
              <Text style={[styles.warningText, { color: colors.mutedForeground }]}>
                You are recording a payment that happened outside Splitwise. No money will be moved.
              </Text>
            </View>
          </ScrollView>

          {/* Record payment bottom button */}
          <View style={[styles.bottomButtonContainer, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
            <TouchableOpacity
              style={[styles.greenRecordBtn, { backgroundColor: settling ? colors.border : "#1CC29F" }]}
              onPress={handleSettle}
              activeOpacity={0.85}
              disabled={settling}
            >
              <Text style={styles.greenRecordBtnText}>
                {settling ? "Recording..." : "Record payment"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ChartsModal
        visible={showCharts}
        onClose={() => setShowCharts(false)}
        expenses={sharedExpenses}
        members={user ? [user, friend] : [friend]}
        title={friend.name}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  greenHeader: {
    height: 180,
    position: "relative",
    justifyContent: "flex-end",
  },
  headerButtonsRow: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  circleHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarOverlapWrapper: {
    position: "absolute",
    bottom: -32,
    alignSelf: "center",
    zIndex: 5,
    borderRadius: 50,
    padding: 3,
    backgroundColor: "#16161a", // Blends with screen background
  },
  content: { paddingHorizontal: 16 },
  profileMeta: {
    alignItems: "center",
    marginTop: 6,
    gap: 4,
    marginBottom: 16,
  },
  friendNameText: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    textAlign: "center",
  },
  owesSubtitleText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    textAlign: "center",
  },
  pillsRowWrapper: {
    paddingVertical: 12,
    marginBottom: 16,
  },
  pillsScrollContent: {
    gap: 8,
    paddingHorizontal: 4,
  },
  pillBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.2,
  },
  pillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  expensesSection: {
    gap: 20,
  },
  monthSection: {
    gap: 12,
  },
  monthHeader: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    textTransform: "capitalize",
  },
  customExpenseRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  dateStack: {
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    marginRight: 10,
  },
  dateMonth: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    textTransform: "uppercase",
  },
  dateDay: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  categoryIconCard: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  expenseMeta: {
    flex: 1,
    justifyContent: "center",
    gap: 2,
  },
  expenseTitleText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  expenseSubLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  rightAmountBlock: {
    alignItems: "flex-end",
    gap: 2,
  },
  owedTextStatus: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  owedAmountValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  emptyState: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 50,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
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
  modalRoot: { flex: 1 },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalTitleText: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    textAlign: "center",
  },
  modalBodyScroll: {
    paddingHorizontal: 20,
    alignItems: "center",
    paddingTop: 30,
  },
  avatarsArrowBlock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  paymentDescText: {
    fontFamily: "Inter_500Medium",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 24,
  },
  amountInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 36,
  },
  currencySymbol: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    marginRight: 8,
    alignSelf: "center",
  },
  hugeAmountInput: {
    fontFamily: "Inter_700Bold",
    fontSize: 48,
    textAlign: "center",
    minWidth: 150,
    paddingVertical: 0,
  },
  pencilBtn: {
    padding: 6,
    marginLeft: 4,
  },
  outsideWarningCard: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 16,
    alignItems: "flex-start",
    width: "100%",
    marginTop: 10,
  },
  warningText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  bottomButtonContainer: {
    paddingHorizontal: 20,
    width: "100%",
  },
  greenRecordBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  greenRecordBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#ffffff",
  },
});
