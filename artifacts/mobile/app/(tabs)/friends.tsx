import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
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
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { calculatePairBalance } from "@/utils/balanceCalculator";
import { formatAmount } from "@/utils/currency";
import FriendTile from "@/components/FriendTile";
import ElephantSvg from "@/components/ElephantSvg";
import Avatar from "@/components/Avatar";

export default function FriendsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    friends,
    expenses,
    settlements,
    friendRequests,
    sendFriendReq,
    acceptFriendReq,
    rejectFriendReq,
  } = useData();

  const [showModal, setShowModal] = useState(false);
  const [searchIdentifier, setSearchIdentifier] = useState("");
  const [loading, setLoading] = useState(false);

  const friendsWithBalance = useMemo(
    () =>
      friends.map((f) => ({
        friend: {
          ...f,
          photoURL: f.photoURL || (f.name.toLowerCase().includes("bhargav") ? "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&h=200&q=80" : undefined)
        },
        balance: user
          ? calculatePairBalance(user.id, f.id, expenses, settlements)
          : 0,
      })),
    [friends, user, expenses, settlements]
  );

  const totalFriendsBalance = useMemo(() => {
    return friendsWithBalance.reduce((sum, item) => sum + item.balance, 0);
  }, [friendsWithBalance]);

  async function handleAddFriend() {
    if (!searchIdentifier.trim()) return;
    setLoading(true);
    try {
      const res = await sendFriendReq(searchIdentifier.trim());
      if (res.success) {
        setShowModal(false);
        setSearchIdentifier("");
        Alert.alert("Success", res.message);
      } else {
        Alert.alert("Error", res.message);
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(id: string, name: string) {
    try {
      await acceptFriendReq(id);
      Alert.alert("Accepted", `You are now friends with ${name}!`);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleReject(id: string) {
    try {
      await rejectFriendReq(id);
    } catch {
      Alert.alert("Error", "Could not decline request. Please try again.");
    }
  }

  const incomingRequests = useMemo(
    () =>
      friendRequests.filter(
        (r) => r.receiverId === user?.id && r.status === "pending"
      ),
    [friendRequests, user?.id]
  );

  const topPad = Platform.OS === "web" ? 10 : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 16) }]}>
      {/* Play Store Custom Top Header Row */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
          <Ionicons name="search" size={24} color={colors.foreground} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowModal(true)} activeOpacity={0.7}>
          <Text style={[styles.addFriendsLink, { color: colors.primary }]}>Add friends</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 110, paddingTop: topPad },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Pending Friend Requests Panel (GORGEOUS HIGHLIGHT CARD) */}
        {incomingRequests.length > 0 && (
          <View style={styles.requestsSection}>
            <Text style={[styles.requestsHeader, { color: colors.foreground }]}>
              Friend Requests ({incomingRequests.length})
            </Text>
            <View style={styles.requestsList}>
              {incomingRequests.map((req) => (
                <View
                  key={req.id}
                  style={[
                    styles.requestCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      shadowColor: colors.foreground,
                    },
                  ]}
                >
                  <View style={styles.requestLeft}>
                    <Avatar name={req.senderName} size={40} />
                    <View style={styles.requestMeta}>
                      <Text style={[styles.requestSenderName, { color: colors.foreground }]}>
                        {req.senderName}
                      </Text>
                      <Text style={[styles.requestSenderEmail, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {req.senderPhone || req.senderEmail}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.acceptBtn, { backgroundColor: colors.primary }]}
                      onPress={() => handleAccept(req.id, req.senderName)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionBtnText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.declineBtn, { borderColor: colors.border }]}
                      onPress={() => handleReject(req.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.declineBtnText, { color: colors.mutedForeground }]}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {friendsWithBalance.length > 0 && (
          <View style={styles.balanceHeaderRow}>
            <Text style={[styles.overallBalanceText, { color: colors.foreground }]}>
              {totalFriendsBalance === 0 ? (
                "Overall, you are all settled up"
              ) : (
                <>
                  Overall, {totalFriendsBalance >= 0 ? "you are owed " : "you owe "}
                  <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold" }}>
                    {formatAmount(Math.abs(totalFriendsBalance))}
                  </Text>
                </>
              )}
            </Text>
            <TouchableOpacity style={styles.filterBtn} activeOpacity={0.7}>
              <Ionicons name="options-outline" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        )}

        {friendsWithBalance.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.welcomeText, { color: colors.foreground }]}>
              Welcome to Splitwise, {user?.name.split(" ")[0]}!
            </Text>

            <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>
              You have not added any friends yet.
            </Text>

            <TouchableOpacity
              style={[styles.addFriendsBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="person-add" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.addFriendsBtnText}>Add friends on Splitwise</Text>
            </TouchableOpacity>

            <View style={styles.mascotContainer}>
              <ElephantSvg size={170} />
            </View>
          </View>
        ) : (
          <View style={{ gap: 20 }}>
            <View style={styles.list}>
              {friendsWithBalance.map(({ friend, balance }) => (
                <FriendTile
                  key={friend.id}
                  friend={friend}
                  balance={balance}
                  onPress={() =>
                    router.push({
                      pathname: "/friends/[id]",
                      params: { id: friend.id },
                    })
                  }
                />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.addMoreFriendsBtn, { borderColor: colors.primary }]}
              onPress={() => setShowModal(true)}
              activeOpacity={0.75}
            >
              <Ionicons name="person-add-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.addMoreFriendsText, { color: colors.primary }]}>Add more friends</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Pill-Shaped Play Store FAB */}
      <TouchableOpacity
        style={[styles.fabPill, { backgroundColor: colors.primary, bottom: insets.bottom + 80 }]}
        onPress={() => router.push("/expenses/add")}
        activeOpacity={0.9}
      >
        <Ionicons name="receipt-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
        <Text style={styles.fabPillText}>Add expense</Text>
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Add Friend
            </Text>
            <TouchableOpacity onPress={() => { setShowModal(false); setSearchIdentifier(""); }}>
              <Ionicons name="close" size={26} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              Phone or Email
            </Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
              placeholder="Phone number or email"
              placeholderTextColor={colors.mutedForeground}
              value={searchIdentifier}
              onChangeText={setSearchIdentifier}
              autoCapitalize="none"
              keyboardType="default"
              autoFocus
            />
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Friend must already have an account. They will get a request and can Accept to become friends.
            </Text>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={handleAddFriend}
              activeOpacity={0.85}
              disabled={loading}
            >
              <Text style={styles.addBtnText}>
                {loading ? "Sending Request..." : "Send Friend Request"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconBtn: {
    padding: 4,
  },
  addFriendsLink: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  content: { paddingHorizontal: 16, gap: 14 },
  balanceHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
    marginVertical: 10,
  },
  overallBalanceText: {
    fontFamily: "Inter_500Medium",
    fontSize: 20,
    letterSpacing: -0.2,
  },
  filterBtn: {
    padding: 4,
  },
  list: { gap: 6 },
  addMoreFriendsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 8,
    alignSelf: "center",
    width: "70%",
    backgroundColor: "transparent",
  },
  addMoreFriendsText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  requestsSection: {
    marginBottom: 8,
  },
  requestsHeader: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  requestsList: {
    gap: 10,
  },
  requestCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  requestLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  requestMeta: {
    flex: 1,
  },
  requestSenderName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  requestSenderEmail: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 1,
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  actionBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptBtn: {},
  declineBtn: {
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  actionBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: "#fff",
  },
  declineBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  welcomeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    textAlign: "center",
    marginBottom: 44,
    marginTop: 8,
  },
  emptySubText: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  addFriendsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 10,
    marginBottom: 44,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addFriendsBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#fff",
  },
  mascotContainer: {
    marginTop: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  fabPill: {
    position: "absolute",
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: "#1CC29F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  fabPillText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#fff",
  },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 22 },
  modalBody: { paddingHorizontal: 20, gap: 12 },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6 },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
  },
  hint: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  addBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  addBtnText: { fontFamily: "Inter_700Bold", fontSize: 17, color: "#fff" },
});
