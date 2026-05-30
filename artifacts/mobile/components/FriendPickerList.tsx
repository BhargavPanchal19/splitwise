import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Friend } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import Avatar from "@/components/Avatar";

type Props = {
  friends: Friend[];
  selectedIds?: string[];
  onSelect: (friend: Friend) => void;
  onAddFriend?: () => void;
  emptyMessage?: string;
};

export default function FriendPickerList({
  friends,
  selectedIds = [],
  onSelect,
  onAddFriend,
  emptyMessage = "No friends yet. Add a friend by phone or email.",
}: Props) {
  const colors = useColors();
  const selected = new Set(selectedIds);

  const addFriendRow = onAddFriend ? (
    <TouchableOpacity
      style={[styles.addFriendRow, { borderColor: colors.primary, backgroundColor: colors.secondary + "33" }]}
      onPress={onAddFriend}
      activeOpacity={0.8}
    >
      <Ionicons name="person-add-outline" size={22} color={colors.primary} />
      <Text style={[styles.addFriendText, { color: colors.primary }]}>Add new friend</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.primary} />
    </TouchableOpacity>
  ) : null;

  if (friends.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        {addFriendRow}
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {emptyMessage}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {addFriendRow}
      {friends.map((friend) => {
        const isSelected = selected.has(friend.id);
        return (
          <TouchableOpacity
            key={friend.id}
            style={[
              styles.row,
              { backgroundColor: colors.card, borderColor: colors.border },
              isSelected && { borderColor: colors.primary, opacity: 0.6 },
            ]}
            onPress={() => !isSelected && onSelect(friend)}
            activeOpacity={0.7}
            disabled={isSelected}
          >
            <Avatar name={friend.name} size={42} />
            <View style={styles.meta}>
              <Text style={[styles.name, { color: colors.foreground }]}>{friend.name}</Text>
              <Text style={[styles.sub, { color: colors.mutedForeground }]} numberOfLines={1}>
                {friend.phone || friend.email}
              </Text>
            </View>
            {isSelected ? (
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            ) : (
              <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  emptyWrap: { gap: 8 },
  addFriendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  addFriendText: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  meta: { flex: 1, gap: 2 },
  name: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  sub: { fontFamily: "Inter_400Regular", fontSize: 12 },
  empty: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 12,
    gap: 10,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
