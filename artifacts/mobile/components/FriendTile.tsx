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

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Avatar name={friend.name} size={48} photoURL={friend.photoURL} />
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]}>
          {friend.name}
        </Text>
      </View>
      <View style={styles.right}>
        {isZero ? (
          <Text style={[styles.statusLabel, { color: colors.mutedForeground }]}>
            settled up
          </Text>
        ) : (
          <>
            <Text
              style={[
                styles.statusLabel,
                { color: isPositive ? colors.positive : colors.negative },
              ]}
            >
              {isPositive ? "owes you" : "you owe"}
            </Text>
            <Text
              style={[
                styles.amount,
                { color: isPositive ? colors.positive : colors.negative },
              ]}
            >
              {formatAmount(Math.abs(balance))}
            </Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 14,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
  },
  right: {
    alignItems: "flex-end",
    gap: 2,
  },
  statusLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textTransform: "lowercase",
  },
  amount: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
});
