import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Expense } from "@/context/DataContext";
import { formatAmount } from "@/utils/currency";
import Avatar from "@/components/Avatar";

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Food: "restaurant-outline",
  Transport: "car-outline",
  Rent: "home-outline",
  Entertainment: "film-outline",
  Others: "ellipsis-horizontal-circle-outline",
};

interface ExpenseTileProps {
  expense: Expense;
  currentUserId: string;
  onPress?: () => void;
}

export default function ExpenseTile({
  expense,
  currentUserId,
  onPress,
}: ExpenseTileProps) {
  const colors = useColors();
  const isPayer = expense.paidBy === currentUserId;
  const mySplit = expense.splits.find((s) => s.userId === currentUserId);
  const myAmount = isPayer
    ? expense.splits
        .filter((s) => s.userId !== currentUserId)
        .reduce((sum, s) => sum + s.amountOwed, 0)
    : mySplit?.amountOwed ?? 0;

  const amountColor = isPayer ? colors.positive : colors.negative;
  const amountLabel = isPayer ? `you lent` : `you borrowed`;
  const icon =
    CATEGORY_ICONS[expense.category] ?? "ellipsis-horizontal-circle-outline";

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[styles.iconContainer, { backgroundColor: colors.secondary }]}
      >
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.middle}>
        <Text
          style={[styles.title, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {expense.title}
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          {isPayer ? "You paid" : `${expense.paidByName} paid`}{" "}
          {formatAmount(expense.amount)}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amountLabel, { color: colors.mutedForeground }]}>
          {amountLabel}
        </Text>
        <Text style={[styles.amount, { color: amountColor }]}>
          {formatAmount(myAmount)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  middle: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  sub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  right: {
    alignItems: "flex-end",
    gap: 2,
  },
  amountLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
  amount: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
});
