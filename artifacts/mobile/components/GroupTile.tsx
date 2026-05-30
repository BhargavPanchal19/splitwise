import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Group } from "@/context/DataContext";
import { formatAmount } from "@/utils/currency";

interface GroupTileProps {
  group: Group;
  balance: number;
  onPress?: () => void;
}

export default function GroupTile({ group, balance, onPress }: GroupTileProps) {
  const colors = useColors();
  const isPositive = balance > 0;
  const isZero = balance === 0;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[styles.iconContainer, { backgroundColor: colors.secondary }]}
      >
        <Ionicons name="people-outline" size={22} color={colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]}>
          {group.name}
        </Text>
        <Text style={[styles.members, { color: colors.mutedForeground }]}>
          {group.members.length} member{group.members.length !== 1 ? "s" : ""}
        </Text>
      </View>
      <View style={styles.right}>
        {isZero ? (
          <Text style={[styles.statusLabel, { color: colors.mutedForeground }]}>
            settled up
          </Text>
        ) : (
          <>
            <Text style={[styles.statusLabel, { color: colors.mutedForeground }]}>
              {isPositive ? "you are owed" : "you owe"}
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
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  members: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  right: {
    alignItems: "flex-end",
    gap: 2,
  },
  statusLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    textTransform: "lowercase",
  },
  amount: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
});
