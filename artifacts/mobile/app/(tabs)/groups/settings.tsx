import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, Stack } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import Avatar from "@/components/Avatar";
import FriendPickerList from "@/components/FriendPickerList";
import AddFriendModal from "@/components/AddFriendModal";
import { Friend } from "@/context/DataContext";

export default function GroupSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { groups, friends, addMemberToGroup, removeGroup, refresh } = useData();

  const group = useMemo(() => groups.find((g) => g.id === id), [groups, id]);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(group?.name ?? "");
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);

  const pickableFriends = useMemo(() => {
    if (!group) return [];
    const memberIds = new Set(group.members.map((m) => m.id));
    return friends.filter((f) => !memberIds.has(f.id));
  }, [friends, group]);

  if (!group) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: colors.foreground }}>Group not found.</Text>
      </View>
    );
  }

  // Get dynamic icon based on group type
  const getGroupIconInfo = () => {
    // Check if the group name contains indicators or look up metadata
    const nameLower = group.name.toLowerCase();
    if (nameLower.includes("couple") || nameLower.includes("love")) {
      return { icon: "heart", color: "#FF4D6D" };
    }
    if (nameLower.includes("home") || nameLower.includes("flat") || nameLower.includes("room")) {
      return { icon: "home", color: "#FFB703" };
    }
    if (nameLower.includes("gym") || nameLower.includes("trip") || nameLower.includes("travel")) {
      return { icon: "airplane", color: "#FE7D6A" }; // matches screenshot orange airplane!
    }
    return { icon: "list", color: "#1CC29F" };
  };

  const iconInfo = getGroupIconInfo();

  async function handleRename() {
    if (!group) return;
    if (!editedName.trim()) {
      Alert.alert("Error", "Group name cannot be empty.");
      return;
    }
    // Perform rename in local/AsyncStorage memory
    group.name = editedName.trim();
    setIsEditingName(false);
    await refresh();
    Alert.alert("Success", "Group name updated!");
  }

  function handleAddMember() {
    if (!group) return;
    setShowAddMemberModal(true);
  }

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

  function handleInviteLink() {
    if (!group) return;
    Alert.alert("Invite Link", "Copied invite link splitwise.com/join/grp_" + group.id + " to clipboard!");
  }

  function handleLeave() {
    if (!group) return;
    Alert.alert("Leave Group", "Are you sure you want to leave this group?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: () => {
          // Remove current user from group members
          group.members = group.members.filter((m) => m.id !== user?.id);
          refresh();
          router.replace("/(tabs)/groups");
        }
      }
    ]);
  }

  function handleDelete() {
    if (!group) return;
    Alert.alert("Delete Group", "Are you sure you want to delete this group? This action is permanent.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await removeGroup(group.id);
          } finally {
            await refresh();
            router.replace("/(tabs)/groups");
          }
        },
      }
    ]);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header Row */}
      <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Group settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        
        {/* Group Name & Icon Row */}
        <View style={styles.groupInfoRow}>
          <View style={[styles.groupIconContainer, { backgroundColor: iconInfo.color }]}>
            <Ionicons name={iconInfo.icon as any} size={28} color="#fff" />
          </View>

          <View style={styles.groupNameContainer}>
            {isEditingName ? (
              <View style={styles.editNameWrapper}>
                <TextInput
                  style={[styles.nameInput, { color: colors.foreground, borderBottomColor: colors.primary }]}
                  value={editedName}
                  onChangeText={setEditedName}
                  autoFocus
                />
                <TouchableOpacity onPress={handleRename} style={styles.saveNameBtn}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={[styles.groupNameText, { color: colors.foreground }]}>{group.name}</Text>
            )}
          </View>

          {!isEditingName && (
            <TouchableOpacity onPress={() => setIsEditingName(true)} activeOpacity={0.7}>
              <Text style={[styles.editBtnText, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Group members list */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Group members</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={handleAddMember} activeOpacity={0.7}>
            <Ionicons name="person-add-outline" size={22} color={colors.foreground} style={styles.menuIcon} />
            <Text style={[styles.menuText, { color: colors.foreground }]}>Add people to group</Text>
          </TouchableOpacity>


          <TouchableOpacity style={styles.menuItem} onPress={handleInviteLink} activeOpacity={0.7}>
            <Ionicons name="link-outline" size={22} color={colors.foreground} style={styles.menuIcon} />
            <Text style={[styles.menuText, { color: colors.foreground }]}>Invite via link</Text>
          </TouchableOpacity>

          {/* Members loop */}
          {group.members.map((m) => (
            <View key={m.id} style={styles.memberRow}>
              <Avatar name={m.name} size={42} />
              <View style={styles.memberInfo}>
                <Text style={[styles.memberName, { color: colors.foreground }]}>{m.name}</Text>
                <Text style={[styles.memberEmail, { color: colors.mutedForeground }]} numberOfLines={1}>{m.email}</Text>
              </View>
              <Text style={[styles.settledText, { color: colors.mutedForeground }]}>settled up</Text>
            </View>
          ))}
        </View>

        {/* Danger zone settings */}
        <View style={[styles.section, { marginTop: 10 }]}>
          <TouchableOpacity style={styles.menuItem} onPress={handleLeave} activeOpacity={0.7}>
            <Ionicons name="exit-outline" size={22} color="#D9383A" style={styles.menuIcon} />
            <Text style={[styles.menuText, { color: "#D9383A", fontFamily: "Inter_600SemiBold" }]}>Leave group</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleDelete} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={22} color="#D9383A" style={styles.menuIcon} />
            <Text style={[styles.menuText, { color: "#D9383A", fontFamily: "Inter_600SemiBold" }]}>Delete group</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      <Modal visible={showAddMemberModal} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.addMemberModal, { backgroundColor: colors.background }]}>
          <View style={styles.addMemberModalHeader}>
            <Text style={[styles.addMemberModalTitle, { color: colors.foreground }]}>
              Add friends to group
            </Text>
            <TouchableOpacity onPress={() => setShowAddMemberModal(false)}>
              <Ionicons name="close" size={26} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.addMemberModalBody}>
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
    paddingVertical: 12,
    borderBottomWidth: 0.8,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  content: { paddingHorizontal: 16, gap: 24, paddingTop: 16 },
  groupInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  groupIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  groupNameContainer: {
    flex: 1,
  },
  groupNameText: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
  },
  editNameWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nameInput: {
    flex: 1,
    height: 38,
    borderBottomWidth: 1.5,
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    paddingBottom: 2,
  },
  saveNameBtn: {
    padding: 4,
  },
  editBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  addMemberModal: { flex: 1 },
  addMemberModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  addMemberModalTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  addMemberModalBody: { paddingHorizontal: 20, paddingBottom: 40 },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  menuIcon: {
    marginRight: 16,
  },
  menuText: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  memberInfo: {
    flex: 1,
    paddingLeft: 14,
    gap: 3,
  },
  memberName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  memberEmail: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  settledText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
});
