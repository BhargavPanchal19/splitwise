import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
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
import { useData, Expense } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { parseToCents } from "@/utils/currency";
import Avatar from "@/components/Avatar";

const CATEGORIES = ["Food", "Transport", "Rent", "Entertainment", "Others"];

export default function AddExpenseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { groups, friends, addExpense, sendFriendReq } = useData();
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Others");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(groupId ?? null);
  const [paidBy, setPaidBy] = useState(user?.id ?? "");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const group = useMemo(
    () => groups.find((g) => g.id === selectedGroupId),
    [groups, selectedGroupId]
  );

  const availableMembers = useMemo(() => {
    if (group) {
      return group.members;
    }
    const allFriends = friends.map((f) => ({
      id: f.id,
      name: f.name,
      email: f.email,
      phone: f.phone,
    }));
    const me = user
      ? [{ id: user.id, name: user.name, email: user.email, phone: user.phone }]
      : [];
    return [...me, ...allFriends];
  }, [group, friends, user]);

  const splitTargets = useMemo(() => {
    if (selectedMembers.length > 0) {
      return selectedMembers;
    }
    return availableMembers.map((m) => m.id);
  }, [selectedMembers, availableMembers]);

  const involvedUsers = useMemo(() => {
    return Array.from(
      new Set([...splitTargets, user?.id, paidBy].filter(Boolean) as string[])
    );
  }, [splitTargets, user?.id, paidBy]);

  function toggleMember(memberId: string) {
    setSelectedMembers((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  }

  async function handleSave() {
    if (saving) return;
    if (!title.trim()) {
      Alert.alert("Error", "Please enter an expense title.");
      return;
    }
    const totalCents = parseToCents(amount);
    if (totalCents <= 0) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }

    if (splitTargets.length === 0) {
      Alert.alert("Error", "Please select members to split with.");
      return;
    }

    let splits: { userId: string; amountOwed: number }[];

    if (splitTargets.length === 1) {
      // Individual expense — full amount goes to the selected person only
      splits = [{ userId: splitTargets[0], amountOwed: totalCents }];
    } else {
      const perPerson = Math.round(totalCents / splitTargets.length);
      splits = splitTargets.map((uid, index) => {
        if (index === splitTargets.length - 1) {
          const sumPrior = perPerson * (splitTargets.length - 1);
          return { userId: uid, amountOwed: totalCents - sumPrior };
        }
        return { userId: uid, amountOwed: perPerson };
      });
    }

    const paidByMember = availableMembers.find((m) => m.id === paidBy);

    const newExpense: Expense = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: title.trim(),
      amount: totalCents,
      paidBy,
      paidByName: paidByMember?.name ?? user?.name ?? "",
      groupId: selectedGroupId,
      category,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      splits,
      involvedUsers,
    };

    setSaving(true);
    try {
      await addExpense(newExpense);

      if (!selectedGroupId) {
        for (const uid of involvedUsers) {
          if (uid !== user?.id) {
            const member = availableMembers.find((m) => m.id === uid);
            if (member) {
              const id = member.phone || member.email;
              if (id) await sendFriendReq(id);
            }
          }
        }
      }

      Alert.alert("Success", "Expense added!", [{ text: "OK", onPress: () => router.back() }]);
    } catch (err) {
      console.error("Failed to add expense:", err);
      Alert.alert("Error", "Could not add expense. Please check your network and try again.");
    } finally {
      setSaving(false);
    }
  }

  const topPad = Platform.OS === "web" ? 10 : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Premium Splitwise Custom Header */}
      <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, 12), backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Add an expense</Text>
        <TouchableOpacity 
          style={styles.headerSaveBtn} 
          onPress={handleSave} 
          activeOpacity={0.7}
          disabled={saving}
        >
          <Text style={[styles.headerSaveText, { color: saving ? colors.mutedForeground : colors.primary }]}>
            {saving ? "Saving..." : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 120, paddingTop: topPad + 12 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Core Info Input Card (Title & Amount stacked beautifully) */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.inputRow}>
            <View style={[styles.iconCircle, { backgroundColor: colors.secondary }]}>
              <Ionicons name="receipt-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.inputFieldWrapper}>
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Description</Text>
              <TextInput
                style={[styles.cleanInput, { color: colors.foreground }]}
                placeholder="What was this expense for?"
                placeholderTextColor={colors.mutedForeground}
                value={title}
                onChangeText={setTitle}
                autoFocus
              />
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.inputRow}>
            <View style={[styles.iconCircle, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.amountSymbolText, { color: colors.primary }]}>₹</Text>
            </View>
            <View style={styles.inputFieldWrapper}>
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Total Amount</Text>
              <TextInput
                style={[styles.cleanAmountInput, { color: colors.foreground }]}
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>

        {/* Category Selector */}
        <View style={styles.section}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalPillsScroll}>
            <View style={styles.chipRow}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.card,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setCategory(cat)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, { color: isSelected ? "#fff" : colors.foreground }]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Group Selector */}
        {groups.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Group (optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalPillsScroll}>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    {
                      backgroundColor: !selectedGroupId ? colors.primary : colors.card,
                      borderColor: !selectedGroupId ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedGroupId(null)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, { color: !selectedGroupId ? "#fff" : colors.foreground }]}>
                    None
                  </Text>
                </TouchableOpacity>
                {groups
                  .filter((g) => g.members.some((m) => m.id === user?.id))
                  .map((g) => {
                    const isSelected = selectedGroupId === g.id;
                    return (
                      <TouchableOpacity
                        key={g.id}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.card,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setSelectedGroupId(g.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.chipText, { color: isSelected ? "#fff" : colors.foreground }]}>
                          {g.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Paid By Selector */}
        <View style={styles.section}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Paid By</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalPillsScroll}>
            <View style={styles.chipRow}>
              {availableMembers.map((m) => {
                const isSelected = paidBy === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.card,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setPaidBy(m.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, { color: isSelected ? "#fff" : colors.foreground }]}>
                      {m.id === user?.id ? "You" : m.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Split Between Participant Customizer */}
        <View style={styles.section}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Split Between</Text>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            {selectedMembers.length === 0
              ? "All members (tap to customize)"
              : selectedMembers.length === 1
                ? "Individual — full amount goes to selected person"
                : `${selectedMembers.length} selected — split equally`}
          </Text>

          <View style={styles.memberGrid}>
            {availableMembers.map((m) => {
              const isSelected = selectedMembers.length === 0 || selectedMembers.includes(m.id);
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.memberItem,
                    {
                      backgroundColor: colors.card,
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => toggleMember(m.id)}
                  activeOpacity={0.7}
                >
                  <Avatar name={m.name} size={38} />
                  <Text style={[styles.memberName, { color: colors.foreground }]} numberOfLines={1}>
                    {m.id === user?.id ? "You" : m.name.split(" ")[0]}
                  </Text>
                  {isSelected && (
                    <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
                      <Ionicons name="checkmark" size={10} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Floating Bottom Add Expense button */}
      <TouchableOpacity
        style={[styles.saveBtn, { bottom: insets.bottom + 20, backgroundColor: saving ? colors.border : colors.primary }]}
        onPress={handleSave}
        activeOpacity={0.85}
        disabled={saving}
      >
        <Text style={styles.saveBtnText}>{saving ? "Adding Expense..." : "Add Expense"}</Text>
      </TouchableOpacity>
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
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    textAlign: "center",
  },
  headerSaveBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerSaveText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  content: { paddingHorizontal: 16, gap: 22 },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  amountSymbolText: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  inputFieldWrapper: {
    flex: 1,
    justifyContent: "center",
  },
  inputLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  cleanInput: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    padding: 0,
    height: 24,
  },
  cleanAmountInput: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    padding: 0,
    height: 28,
  },
  divider: {
    height: 0.8,
    width: "100%",
  },
  section: { gap: 10 },
  fieldLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  horizontalPillsScroll: {
    paddingBottom: 4,
  },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontFamily: "Inter_500Medium", fontSize: 14 },
  hint: { fontFamily: "Inter_400Regular", fontSize: 13 },
  memberGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  memberItem: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 6,
    position: "relative",
    minWidth: 74,
  },
  memberName: { fontFamily: "Inter_500Medium", fontSize: 12, maxWidth: 64 },
  checkmark: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    position: "absolute",
    left: 20,
    right: 20,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#1CC29F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  saveBtnText: { fontFamily: "Inter_700Bold", fontSize: 17, color: "#fff" },
});
