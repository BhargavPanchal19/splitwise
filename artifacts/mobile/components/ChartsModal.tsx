import React, { useMemo, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { formatAmount } from "@/utils/currency";
import Avatar from "@/components/Avatar";
import type { Expense } from "@/context/DataContext";

interface ChartsModalProps {
  visible: boolean;
  onClose: () => void;
  expenses: Expense[];
  members: { id: string; name: string; email: string; phone?: string }[];
  title: string;
}

export default function ChartsModal({
  visible,
  onClose,
  expenses,
  members,
  title,
}: ChartsModalProps) {
  const colors = useColors();
  const { user } = useAuth();
  const [tab, setTab] = useState<"category" | "whoPaid">("category");

  function getCategoryColor(category: string) {
    switch (category?.toLowerCase()) {
      case "food": return "#FF9F0A";
      case "transport": return "#0A84FF";
      case "rent": return "#30D158";
      case "entertainment": return "#BF5AF2";
      default: return "#E65A4B";
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

  // 1. Spending Breakdown by Category
  const categoriesData = useMemo(() => {
    const map: Record<string, number> = {
      Food: 0,
      Transport: 0,
      Rent: 0,
      Entertainment: 0,
      Others: 0,
    };
    expenses.forEach((e) => {
      const cat = e.category || "Others";
      map[cat] = (map[cat] || 0) + e.amount;
    });

    const total = Object.values(map).reduce((sum, v) => sum + v, 0);

    return Object.entries(map)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
        color: getCategoryColor(name),
        icon: getCategoryIcon(name),
      }))
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const totalAmount = useMemo(() => {
    return categoriesData.reduce((sum, c) => sum + c.amount, 0);
  }, [categoriesData]);

  // SVG Donut Calculations
  const donutSegments = useMemo(() => {
    const radius = 70;
    const circumference = 2 * Math.PI * radius; // ~439.82
    let currentOffset = 0;

    return categoriesData.map((c) => {
      const strokeLength = (c.amount / totalAmount) * circumference;
      const strokeOffset = circumference - currentOffset + (circumference / 4); // offset by 90deg to start at top
      currentOffset += strokeLength;

      return {
        ...c,
        strokeDasharray: `${strokeLength} ${circumference - strokeLength}`,
        strokeDashoffset: strokeOffset,
      };
    });
  }, [categoriesData, totalAmount]);

  // 2. Paid breakdown by group member
  const paidByData = useMemo(() => {
    const map: Record<string, { name: string; amount: number }> = {};

    members.forEach((m) => {
      map[m.id] = { name: m.name, amount: 0 };
    });

    expenses.forEach((e) => {
      if (map[e.paidBy]) {
        map[e.paidBy].amount += e.amount;
      } else {
        map[e.paidBy] = { name: e.paidByName || "User", amount: e.amount };
      }
    });

    const list = Object.entries(map).map(([id, info]) => ({
      id,
      name: info.name,
      amount: info.amount,
      isCurrentUser: id === user?.id,
    }));

    return list.sort((a, b) => b.amount - a.amount);
  }, [expenses, members, user]);

  const maxPaid = useMemo(() => {
    return Math.max(...paidByData.map((p) => p.amount), 1);
  }, [paidByData]);

  const totalPaidByAll = useMemo(() => {
    return paidByData.reduce((sum, p) => sum + p.amount, 0);
  }, [paidByData]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet">
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {/* Modal Header */}
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>{title} Insights</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.closeBtn}>
            <Ionicons name="close" size={26} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Dynamic Tab Switcher */}
        <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "category" && { borderBottomColor: colors.primary }]}
            onPress={() => setTab("category")}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, { color: tab === "category" ? colors.primary : colors.mutedForeground }]}>
              By Category
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, tab === "whoPaid" && { borderBottomColor: colors.primary }]}
            onPress={() => setTab("whoPaid")}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, { color: tab === "whoPaid" ? colors.primary : colors.mutedForeground }]}>
              Who Paid What
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          {tab === "category" ? (
            <>
              {totalAmount === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="pie-chart-outline" size={64} color={colors.mutedForeground} />
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No expense data</Text>
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                    Insights will appear once expenses are added.
                  </Text>
                </View>
              ) : (
                <View style={styles.chartWrapper}>
                  {/* Premium Donut Chart Container */}
                  <View style={styles.donutContainer}>
                    <Svg width="180" height="180" viewBox="0 0 180 180">
                      {/* Grey background ring */}
                      <Circle
                        cx="90"
                        cy="90"
                        r="70"
                        stroke={colors.border}
                        strokeWidth="16"
                        fill="transparent"
                      />

                      {/* Donut Segments */}
                      {donutSegments.map((segment, idx) => (
                        <Circle
                          key={idx}
                          cx="90"
                          cy="90"
                          r="70"
                          stroke={segment.color}
                          strokeWidth="16"
                          strokeDasharray={segment.strokeDasharray}
                          strokeDashoffset={segment.strokeDashoffset}
                          strokeLinecap="round"
                          fill="transparent"
                        />
                      ))}
                    </Svg>

                    {/* Centered Total Text Overlay */}
                    <View style={styles.totalOverlay}>
                      <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Total Spend</Text>
                      <Text style={[styles.totalValue, { color: colors.foreground }]}>
                        {formatAmount(totalAmount)}
                      </Text>
                    </View>
                  </View>

                  {/* Colored Category Breakdown List */}
                  <View style={styles.breakdownList}>
                    <Text style={[styles.sectionHeading, { color: colors.foreground }]}>Category Breakdown</Text>
                    {categoriesData.map((cat, idx) => (
                      <View key={idx} style={styles.breakdownRow}>
                        <View style={styles.categoryLeft}>
                          <View style={[styles.iconBox, { backgroundColor: cat.color }]}>
                            <Ionicons name={cat.icon as any} size={18} color="#fff" />
                          </View>
                          <Text style={[styles.categoryName, { color: colors.foreground }]}>
                            {cat.name}
                          </Text>
                        </View>
                        <View style={styles.categoryRight}>
                          <Text style={[styles.categoryAmount, { color: colors.foreground }]}>
                            {formatAmount(cat.amount)}
                          </Text>
                          <Text style={[styles.categoryPercentage, { color: colors.mutedForeground }]}>
                            {cat.percentage.toFixed(0)}%
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          ) : (
            <>
              {totalPaidByAll === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="bar-chart-outline" size={64} color={colors.mutedForeground} />
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No payments recorded</Text>
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                    Insights will appear once expenses are paid.
                  </Text>
                </View>
              ) : (
                <View style={styles.paidWrapper}>
                  <Text style={[styles.sectionHeading, { color: colors.foreground, marginBottom: 16 }]}>
                    Who Paid What
                  </Text>

                  {paidByData.map((p) => {
                    const pctVal = Math.max((p.amount / maxPaid) * 100, 4);
                    const widthPct = `${pctVal}%`;
                    const percentOfTotal = totalPaidByAll > 0 ? (p.amount / totalPaidByAll) * 100 : 0;

                    return (
                      <View key={p.id} style={styles.barRow}>
                        <View style={styles.barLabelWrapper}>
                          <Avatar name={p.name} size={32} />
                          <View style={styles.barMemberMeta}>
                            <Text style={[styles.barMemberName, { color: colors.foreground }]}>
                              {p.isCurrentUser ? "You" : p.name.split(" ")[0]}
                            </Text>
                            <Text style={[styles.barMemberPercent, { color: colors.mutedForeground }]}>
                              {percentOfTotal.toFixed(0)}% of total
                            </Text>
                          </View>
                        </View>

                        <View style={styles.barContainer}>
                          <View style={styles.track}>
                            <View
                              style={[
                                styles.barFilled,
                                {
                                  width: widthPct,
                                  backgroundColor: p.isCurrentUser ? colors.primary : "#E65A4B",
                                },
                              ]}
                            />
                          </View>
                          <Text style={[styles.barAmountText, { color: colors.foreground }]}>
                            {formatAmount(p.amount)}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 22 },
  closeBtn: { padding: 4 },
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 20,
  },
  tabBtn: {
    paddingVertical: 14,
    marginRight: 24,
    borderBottomWidth: 2.5,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 24,
  },
  chartWrapper: {
    alignItems: "center",
    gap: 32,
    width: "100%",
  },
  donutContainer: {
    position: "relative",
    width: 180,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  totalOverlay: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  totalLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  totalValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    marginTop: 2,
  },
  breakdownList: {
    width: "100%",
    gap: 14,
  },
  sectionHeading: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    letterSpacing: -0.2,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  categoryRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  categoryAmount: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  categoryPercentage: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  paidWrapper: {
    width: "100%",
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  barLabelWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: 110,
  },
  barMemberMeta: {
    gap: 2,
  },
  barMemberName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  barMemberPercent: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
  barContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  track: {
    flex: 1,
    height: 10,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 5,
    overflow: "hidden",
  },
  barFilled: {
    height: "100%",
    borderRadius: 5,
  },
  barAmountText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    minWidth: 74,
    textAlign: "right",
  },
  emptyState: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 60,
    paddingHorizontal: 20,
    width: "100%",
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
});
