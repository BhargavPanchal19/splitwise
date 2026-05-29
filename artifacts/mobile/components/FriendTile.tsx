import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Friend } from "@/context/DataContext";
import { formatAmount } from "@/utils/currency";
import Avatar from "@/components/Avatar";

interface FriendTileProps {
  friend: Friend;
  balance: number;
  onPress?: () => void;
}

export default function FriendTile({ friend, balance, onPress }: FriendTileProps) {
  const colors = useColors();
  const isPositive = balance > 0;
  const isZero = balance === 0;
  const balanceColor = isZero
    ? colors.mutedForeground
    : isPositive
    ? colors.positive
    : colors.negative;

  const balanceText = isZero
    ? "settled up"
    : isPositive
    ? `owes you ${formatAmount(balance)}`
    : `you owe ${formatAmount(Math.abs(balance))}`;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Avatar name={friend.name} size={46} />
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]}>
          {friend.name}
        </Text>
        <Text style={[styles.balance, { color: balanceColor }]}>
          {balanceText}
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
    gap: 14,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  balance: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
});
