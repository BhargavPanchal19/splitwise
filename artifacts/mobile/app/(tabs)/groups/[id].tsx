import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, Stack } from "expo-router";
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
import { useData, Settlement, Expense, Friend } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { calculatePairBalance, getUserBalancesReport, simplifyDebts } from "@/utils/balanceCalculator";
import { formatAmount, parseToCents } from "@/utils/currency";
import Avatar from "@/components/Avatar";
import ExpenseTile from "@/components/ExpenseTile";
import PolygonBackground from "@/components/PolygonBackground";
import FriendPickerList from "@/components/FriendPickerList";
import AddFriendModal from "@/components/AddFriendModal";
import ChartsModal from "@/components/ChartsModal";
import Svg, { Polygon } from "react-native-svg";

export default function GroupDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { groups, expenses, settlements, friends, addSettlement, addMemberToGroup } = useData();
  const [tab, setTab] = useState<"expenses" | "balances" | "members">("expenses");
  const [showSettle, setShowSettle] = useState(false);
  const [settleTo, setSettleTo] = useState("");
  const [settleAmount, setSettleAmount] = useState("");
  const [settling, setSettling] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [showSettledExpenses, setShowSettledExpenses] = useState(false);

  const group = useMemo(() => groups.find((g) => g.id === id), [groups, id]);

  const pickableFriends = useMemo(() => {
    if (!group) return [];
    const memberIds = new Set(group.members.map((m) => m.id));
    return friends.filter((f) => !memberIds.has(f.id));
  }, [friends, group]);
  const groupExpenses = useMemo(
    () => expenses.filter((e) => e.groupId === id),
    [expenses, id]
  );
  const groupSettlements = useMemo(
    () => settlements.filter((s) => s.groupId === id),
    [settlements, id]
  );
  const totalSpent = useMemo(
    () => groupExpenses.reduce((sum, e) => sum + (e.amount || 0), 0),
    [groupExpenses]
  );

  const groupedExpenses = useMemo(() => {
    const groupsMap: { [key: string]: Expense[] } = {};
    const sorted = [...groupExpenses].sort(
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
  }, [groupExpenses]);

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

  const simplifiedDebtsList = useMemo(() => {
    if (!group) return [];
    const memberNames: Record<string, string> = {};
    group.members.forEach((m) => {
      memberNames[m.id] = m.name;
    });

    const memberIds = group.members.map((m) => m.id);
    const reports = getUserBalancesReport(groupExpenses, groupSettlements, memberIds);

    const netBalances: Record<string, number> = {};
    Object.entries(reports).forEach(([uid, r]) => {
      netBalances[uid] = r.netBalance;
    });

    return simplifyDebts(netBalances, memberNames);
  }, [group, groupExpenses, groupSettlements]);

  async function addFriendToGroup(friend: Friend) {
    if (!group) return;
    const identifier = friend.email || friend.phone;
    if (!identifier) {
      Alert.alert("Error", "This friend has no email or phone on file.");
      return;
    }
    const found = await addMemberToGroup(group.id, identifier);
    if (!found) {
      Alert.alert("User Not Found", "Could not add this friend to the group.");
    } else {
      setShowAddMemberModal(false);
      Alert.alert("Success", `${friend.name} added to the group!`);
    }
  }

  async function handleSettle() {
    if (settling) return;
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

    setSettling(true);
    try {
      await addSettlement(newSettlement);
      setShowSettle(false);
      setSettleTo("");
      setSettleAmount("");
      Alert.alert("Success", `Settlement of ${formatAmount(amount)} recorded.`);
    } catch (err) {
      console.error("Failed to record settlement:", err);
      Alert.alert("Error", "Could not record settlement. Please check your network and try again.");
    } finally {
      setSettling(false);
    }
  }

  if (!group) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: colors.foreground }}>Group not found.</Text>
      </View>
    );
  }

  const topPad = Platform.OS === "web" ? 10 : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Play Store Orange Low-Poly Geometric Header Block */}
      <View style={[styles.orangeHeader, { backgroundColor: "#E65A4B" }]}>
        {/* Polygon background mesh with orange overlay! */}
        <View style={StyleSheet.absoluteFill}>
          <PolygonBackground />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(230, 90, 75, 0.82)" }]} />
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
            onPress={() => router.push({ pathname: "/groups/settings", params: { id } })}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={20} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Group Name title */}
        <Text style={styles.groupTitleText} numberOfLines={1}>{group.name}</Text>

        {/* Group Info Pills Row inside Header */}
        <View style={styles.headerInfoPillsRow}>
          <TouchableOpacity
            style={styles.headerInfoPill}
            onPress={() => Alert.alert("Trip Dates", "Trip dates feature coming soon!")}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={14} color="#FFF" style={{ marginRight: 4 }} />
            <Text style={styles.headerInfoPillText}>Add trip dates</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerInfoPill}
            onPress={() => setTab("members")}
            activeOpacity={0.8}
          >
            <Ionicons name="people-outline" size={14} color="#FFF" style={{ marginRight: 4 }} />
            <Text style={styles.headerInfoPillText}>{group.members.length} people</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Group Balance Summary Banner */}
      {balances.length > 0 && (
        <View style={styles.balanceSummaryContainer}>
          <Text style={styles.balanceSummaryText}>
            {balances.length === 1 ? (
              <>
                <Text style={{ color: colors.foreground }}>
                  {balances[0].member.name}{" "}
                  {balances[0].balance > 0 ? "owes you" : "you owe"}{" "}
                </Text>
                <Text
                  style={{
                    color: balances[0].balance > 0 ? colors.positive : colors.negative,
                    fontFamily: "Inter_700Bold",
                  }}
                >
                  {formatAmount(Math.abs(balances[0].balance))}
                </Text>
              </>
            ) : (
              <>
                <Text style={{ color: colors.foreground }}>
                  {balances.filter((b) => b.balance > 0).length} people owe you, you owe{" "}
                  {balances.filter((b) => b.balance < 0).length} people. Net:{" "}
                </Text>
                {(() => {
                  const net = balances.reduce((sum, b) => sum + b.balance, 0);
                  return (
                    <Text
                      style={{
                        color: net >= 0 ? colors.positive : colors.negative,
                        fontFamily: "Inter_700Bold",
                      }}
                    >
                      {formatAmount(Math.abs(net))}
                    </Text>
                  );
                })()}
              </>
            )}
          </Text>
        </View>
      )}

      {balances.length === 0 && (
        <View style={[styles.settledBannerContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Text style={[styles.settledBannerText, { color: colors.foreground }]}>
            🎉 You are all settled up in this group.
          </Text>
        </View>
      )}

      {/* Horizontal Action Pills Row */}
      <View style={[styles.pillsRowWrapper, { borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScrollContent}>
          <TouchableOpacity
            style={[styles.pillBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowSettle(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, { color: colors.foreground }]}>Settle up</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.pillBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
              tab === "expenses" && [styles.pillActiveBtn, { borderColor: colors.primary, backgroundColor: colors.secondary }],
            ]}
            onPress={() => setTab("expenses")}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, { color: tab === "expenses" ? colors.primary : colors.foreground }]}>Expenses</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.pillBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
              tab === "balances" && [styles.pillActiveBtn, { borderColor: colors.primary, backgroundColor: colors.secondary }],
            ]}
            onPress={() => setTab("balances")}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, { color: tab === "balances" ? colors.primary : colors.foreground }]}>Balances</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.pillBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
              tab === "members" && [styles.pillActiveBtn, { borderColor: colors.primary, backgroundColor: colors.secondary }],
            ]}
            onPress={() => setTab("members")}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, { color: tab === "members" ? colors.primary : colors.foreground }]}>Members</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pillBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => setShowCharts(true)}
          >
            <Ionicons name="pie-chart-outline" size={14} color={colors.foreground} style={{ marginRight: 4 }} />
            <Text style={[styles.pillText, { color: colors.foreground }]}>Charts</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pillBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => Alert.alert("Total spent", formatAmount(totalSpent))}
          >
            <Text style={[styles.pillText, { color: colors.foreground }]}>
              Total spent
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 110, paddingTop: topPad },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Play Store Style Empty State: "You're the only one here!" Card */}
        {group.members.length === 1 ? (
          <View style={[styles.onlyOneCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.onlyOneText, { color: colors.mutedForeground }]}>
              You're the only one here!
            </Text>

            <TouchableOpacity
              style={[styles.addMembersBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowAddMemberModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="person-add" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.addMembersBtnText}>Add members</Text>
            </TouchableOpacity>

            {pickableFriends.length > 0 && (
              <View style={styles.inlineFriendPicker}>
                <FriendPickerList
                  friends={pickableFriends}
                  onSelect={addFriendToGroup}
                  onAddFriend={() => setShowAddFriendModal(true)}
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.shareLinkBtn, { borderColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.shareLinkBtnText, { color: colors.primary }]}>Share a link</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Render Tab Specific lists if multi-member */}
            {tab === "expenses" && (
              <View style={styles.list}>
                {balances.length === 0 && !showSettledExpenses ? (
                  <TouchableOpacity
                    style={styles.settledCheckmarkContainer}
                    activeOpacity={0.8}
                    onPress={() => setShowSettledExpenses(true)}
                  >
                    <Text style={[styles.settledTitle, { color: colors.foreground }]}>
                      You are all settled up
                    </Text>
                    <Text style={[styles.settledSubtitle, { color: colors.mutedForeground }]}>
                      Tap to show settled expenses
                    </Text>

                    {/* High-Fidelity Polygonal Low-Poly Checkmark Svg */}
                    <Svg width={140} height={140} viewBox="0 0 100 100" style={styles.checkmarkSvg}>
                      {/* Triangle 1: violet */}
                      <Polygon points="25,55 40,75 35,48" fill="#7B2CBF" />
                      {/* Triangle 2: medium purple */}
                      <Polygon points="40,75 35,48 48,52" fill="#9D4EDD" />
                      {/* Triangle 3: pink */}
                      <Polygon points="40,75 48,52 52,70" fill="#C77DFF" />
                      {/* Triangle 4: red-violet */}
                      <Polygon points="52,70 48,52 64,42" fill="#D81159" />
                      {/* Triangle 5: red */}
                      <Polygon points="52,70 64,42 68,58" fill="#E21B3C" />
                      {/* Triangle 6: orange */}
                      <Polygon points="64,42 68,58 75,32" fill="#FF5A5F" />
                    </Svg>
                  </TouchableOpacity>
                ) : (
                  groupExpenses.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Ionicons name="receipt-outline" size={40} color={colors.mutedForeground} />
                      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No expenses yet</Text>
                    </View>
                  ) : (
                    <>
                      {balances.length === 0 && (
                        <TouchableOpacity
                          style={styles.hideSettledBtn}
                          activeOpacity={0.7}
                          onPress={() => setShowSettledExpenses(false)}
                        >
                          <Text style={[styles.hideSettledText, { color: colors.primary }]}>
                            Hide settled expenses
                          </Text>
                        </TouchableOpacity>
                      )}
                      {groupedExpenses.map(([monthYear, exps]) => (
                        <View key={monthYear} style={styles.monthSection}>
                          <Text style={[styles.monthHeader, { color: colors.mutedForeground }]}>
                            {monthYear}
                          </Text>
                          <View style={{ gap: 8 }}>
                            {exps.map((expense) => (
                              <ExpenseTile key={expense.id} expense={expense} currentUserId={user?.id ?? ""} />
                            ))}
                          </View>
                        </View>
                      ))}
                    </>
                  )
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
                  <>
                    {/* Simplified Debts Repayment Card */}
                    {simplifiedDebtsList.length > 0 && (
                      <View style={[styles.simplifiedDebtsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.simplifiedDebtsHeader}>
                          <Ionicons name="git-merge-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                          <Text style={[styles.simplifiedDebtsTitle, { color: colors.foreground }]}>Simplified Repayments</Text>
                        </View>
                        <Text style={[styles.simplifiedDebtsSub, { color: colors.mutedForeground }]}>
                          Combines all debts to minimize the total number of transactions.
                        </Text>
                        
                        <View style={styles.simplifiedList}>
                          {simplifiedDebtsList.map((tx, idx) => (
                            <View key={idx} style={styles.simplifiedRow}>
                              <Text style={[styles.repaymentText, { color: colors.foreground }]} numberOfLines={1}>
                                <Text style={{ fontFamily: "Inter_700Bold" }}>{tx.fromUser === user?.id ? "You" : tx.fromUserName}</Text>
                                <Text style={{ color: colors.mutedForeground }}> owes </Text>
                                <Text style={{ fontFamily: "Inter_700Bold" }}>{tx.toUser === user?.id ? "You" : tx.toUserName}</Text>
                              </Text>
                              <Text style={[styles.repaymentAmount, { color: colors.negative }]}>
                                {formatAmount(tx.amount)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground, marginTop: simplifiedDebtsList.length > 0 ? 12 : 0 }]}>
                      Individual Balances
                    </Text>

                    {balances.map(({ member, balance }) => (
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
                    ))}
                  </>
                )}
              </View>
            )}

            {tab === "members" && (
              <View style={styles.list}>
                <TouchableOpacity
                  style={[styles.addMembersBtn, { backgroundColor: colors.primary, marginBottom: 8 }]}
                  onPress={() => setShowAddMemberModal(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="person-add" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.addMembersBtnText}>Add friends to trip</Text>
                </TouchableOpacity>
                {group.members.map((m) => (
                  <View key={m.id} style={[styles.balanceRow, { backgroundColor: colors.card }]}>
                    <Avatar name={m.name} size={40} />
                    <View style={styles.balanceInfo}>
                      <Text style={[styles.balanceName, { color: colors.foreground }]}>
                        {m.id === user?.id ? `${m.name} (You)` : m.name}
                      </Text>
                      <Text style={[styles.balanceAmount, { color: colors.mutedForeground }]}>
                        {m.phone ? m.phone : m.email}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Pill-Shaped Play Store FAB */}
      <TouchableOpacity
        style={[styles.fabPill, { backgroundColor: colors.primary, bottom: insets.bottom + 80 }]}
        onPress={() => router.push({ pathname: "/expenses/add", params: { groupId: id } })}
        activeOpacity={0.9}
      >
        <Ionicons name="receipt-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
        <Text style={styles.fabPillText}>Add expense</Text>
      </TouchableOpacity>

      <Modal visible={showAddMemberModal} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add friends to trip</Text>
            <TouchableOpacity onPress={() => setShowAddMemberModal(false)}>
              <Ionicons name="close" size={26} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <FriendPickerList
              friends={pickableFriends}
              selectedIds={group.members.map((m) => m.id)}
              onSelect={addFriendToGroup}
              onAddFriend={() => setShowAddFriendModal(true)}
            />
          </ScrollView>
        </View>
      </Modal>

      <AddFriendModal
        visible={showAddFriendModal}
        onClose={() => setShowAddFriendModal(false)}
      />

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
              style={[styles.settleBtn, { backgroundColor: settling ? colors.border : colors.primary }]}
              onPress={handleSettle}
              activeOpacity={0.85}
              disabled={settling}
            >
              <Text style={styles.settleBtnText}>{settling ? "Recording..." : "Record Payment"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ChartsModal
        visible={showCharts}
        onClose={() => setShowCharts(false)}
        expenses={groupExpenses}
        members={group.members}
        title={group.name}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  orangeHeader: {
    height: 215,
    position: "relative",
    paddingHorizontal: 20,
    justifyContent: "flex-end",
    paddingBottom: 20,
  },
  headerButtonsRow: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
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
  groupTitleText: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerInfoPillsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  headerInfoPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderColor: "rgba(255, 255, 255, 0.25)",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerInfoPillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#FFF",
  },
  balanceSummaryContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  balanceSummaryText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
  monthSection: {
    marginBottom: 16,
  },
  monthHeader: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    marginBottom: 10,
    textTransform: "capitalize",
  },
  pillsRowWrapper: {
    paddingVertical: 12,
    borderBottomWidth: 0.8,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  pillsScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pillBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillActiveBtn: {
  },
  pillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  content: { paddingHorizontal: 16, gap: 12, paddingTop: 10 },
  inlineFriendPicker: {
    width: "100%",
    marginTop: 8,
    marginBottom: 12,
  },
  onlyOneCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    marginTop: 20,
  },
  onlyOneText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    marginBottom: 20,
    textAlign: "center",
  },
  addMembersBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 13,
    borderRadius: 12,
    marginBottom: 12,
  },
  addMembersBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#fff",
  },
  shareLinkBtn: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.2,
    backgroundColor: "transparent",
  },
  shareLinkBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
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
  simplifiedDebtsCard: {
    borderRadius: 16,
    borderWidth: 1.2,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  simplifiedDebtsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  simplifiedDebtsTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  simplifiedDebtsSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginBottom: 12,
  },
  simplifiedList: {
    gap: 10,
    borderTopWidth: 0.8,
    borderTopColor: "rgba(0,0,0,0.06)",
    paddingTop: 12,
  },
  simplifiedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  repaymentText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    flex: 1,
  },
  repaymentAmount: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  sectionSubtitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  settledBannerContainer: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  settledBannerText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    textAlign: "center",
  },
  settledCheckmarkContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    width: "100%",
  },
  settledTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    textAlign: "center",
    marginBottom: 8,
  },
  settledSubtitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 30,
  },
  checkmarkSvg: {
    alignSelf: "center",
  },
  hideSettledBtn: {
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  hideSettledText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});
