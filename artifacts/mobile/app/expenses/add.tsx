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
  const { groups, friends, addExpense, addFriend } = useData();
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Others");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(groupId ?? null);
  const [paidBy, setPaidBy] = useState(user?.id ?? "");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const group = useMemo(
    () => groups.find((g) => g.id === selectedGroupId),
    [groups, selectedGroupId]
  );

  const availableMembers = useMemo(() => {
    if (group) {
      return group.members;
    }
    const allFriends = friends.map((f) => ({ id: f.id, name: f.name, email: f.email }));
    const me = user ? [{ id: user.id, name: user.name, email: user.email }] : [];
    return [...me, ...allFriends];
  }, [group, friends, user]);

  function toggleMember(memberId: string) {
    setSelectedMembers((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter an expense title.");
      return;
    }
    const totalCents = parseToCents(amount);
    if (totalCents <= 0) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }

    const splitWithIds = selectedMembers.length > 0 ? selectedMembers : availableMembers.map((m) => m.id);
    if (splitWithIds.length === 0) {
      Alert.alert("Error", "Please select members to split with.");
      return;
    }

    const perPerson = Math.round(totalCents / splitWithIds.length);
    const splits = splitWithIds.map((uid) => ({ userId: uid, amountOwed: perPerson }));
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
      involvedUsers: splitWithIds,
    };

    await addExpense(newExpense);

    if (!selectedGroupId) {
      for (const uid of splitWithIds) {
        if (uid !== user?.id) {
          const member = availableMembers.find((m) => m.id === uid);
          if (member) {
            await addFriend({ id: member.id, name: member.name, email: member.email });
          }
        }
      }
    }

    Alert.alert("Success", "Expense added!", [{ text: "OK", onPress: () => router.back() }]);
  }

  const topPad = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 100, paddingTop: topPad },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Title</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
            placeholder="What's this expense for?"
            placeholderTextColor={colors.mutedForeground}
            value={title}
            onChangeText={setTitle}
            autoFocus
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Amount</Text>
          <View style={[styles.amountWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.currencySymbol, { color: colors.primary }]}>$</Text>
            <TextInput
              style={[styles.amountInput, { color: colors.foreground }]}
              placeholder="0.00"
              placeholderTextColor={colors.mutedForeground}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.chip,
                    { backgroundColor: category === cat ? colors.primary : colors.card, borderColor: category === cat ? colors.primary : colors.border },
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.chipText, { color: category === cat ? "#fff" : colors.foreground }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {groups.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Group (optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    { backgroundColor: !selectedGroupId ? colors.primary : colors.card, borderColor: !selectedGroupId ? colors.primary : colors.border },
                  ]}
                  onPress={() => setSelectedGroupId(null)}
                >
                  <Text style={[styles.chipText, { color: !selectedGroupId ? "#fff" : colors.foreground }]}>
                    None
                  </Text>
                </TouchableOpacity>
                {groups
                  .filter((g) => g.members.some((m) => m.id === user?.id))
                  .map((g) => (
                    <TouchableOpacity
                      key={g.id}
                      style={[
                        styles.chip,
                        { backgroundColor: selectedGroupId === g.id ? colors.primary : colors.card, borderColor: selectedGroupId === g.id ? colors.primary : colors.border },
                      ]}
                      onPress={() => setSelectedGroupId(g.id)}
                    >
                      <Text style={[styles.chipText, { color: selectedGroupId === g.id ? "#fff" : colors.foreground }]}>
                        {g.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Paid By</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {availableMembers.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.chip,
                    { backgroundColor: paidBy === m.id ? colors.primary : colors.card, borderColor: paidBy === m.id ? colors.primary : colors.border },
                  ]}
                  onPress={() => setPaidBy(m.id)}
                >
                  <Text style={[styles.chipText, { color: paidBy === m.id ? "#fff" : colors.foreground }]}>
                    {m.id === user?.id ? "You" : m.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Split Between</Text>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            {selectedMembers.length === 0 ? "All members (tap to customize)" : `${selectedMembers.length} selected`}
          </Text>
          <View style={styles.memberGrid}>
            {availableMembers.map((m) => {
              const isSelected = selectedMembers.length === 0 || selectedMembers.includes(m.id);
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.memberItem,
                    { backgroundColor: colors.card, borderColor: isSelected ? colors.primary : colors.border, borderWidth: isSelected ? 2 : 1 },
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

      <TouchableOpacity
        style={[styles.saveBtn, { bottom: insets.bottom + 90, backgroundColor: colors.primary }]}
        onPress={handleSave}
        activeOpacity={0.85}
      >
        <Text style={styles.saveBtnText}>Add Expense</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 20 },
  section: { gap: 10 },
  fieldLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
  },
  amountWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 58,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  currencySymbol: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 24,
  },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
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
