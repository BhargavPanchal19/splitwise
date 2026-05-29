import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { formatAmount } from "@/utils/currency";

interface BalanceCardProps {
  amount: number;
  label?: string;
  large?: boolean;
}

export default function BalanceCard({
  amount,
  label,
  large = false,
}: BalanceCardProps) {
  const colors = useColors();
  const isPositive = amount > 0;
  const isZero = amount === 0;
  const tintColor = isZero
    ? colors.mutedForeground
    : isPositive
    ? colors.positive
    : colors.negative;

  const labelText = isZero
    ? "You are all settled up"
    : isPositive
    ? label ?? "You are owed"
    : label ?? "You owe";

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        {labelText}
      </Text>
      <Text
        style={[
          styles.amount,
          { color: tintColor, fontSize: large ? 36 : 28 },
        ]}
      >
        {isZero ? "Settled up" : formatAmount(Math.abs(amount))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  amount: {
    fontFamily: "Inter_700Bold",
  },
});
