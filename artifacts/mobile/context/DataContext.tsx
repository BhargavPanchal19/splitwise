import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { User, useAuth } from "@/context/AuthContext";
import {
  loadUserData,
  subscribeUserData,
  createGroup,
  addGroupMember,
  saveExpense,
  saveSettlement,
  saveFriend,
  deleteFriend,
  deleteGroup,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  findUserByIdentifier,
  findUserByFriendCode,
  saveReminder,
} from "@/services/firestoreStore";

export interface Split {
  userId: string;
  amountOwed: number;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  paidBy: string;
  paidByName: string;
  groupId: string | null;
  category: string;
  date: string;
  createdAt: string;
  splits: Split[];
  involvedUsers: string[];
}

export interface Settlement {
  id: string;
  paidBy: string;
  paidByName: string;
  paidTo: string;
  paidToName: string;
  amount: number;
  groupId: string | null;
  date: string;
}

export interface Group {
  id: string;
  name: string;
  createdBy: string;
  members: User[];
  createdAt: string;
  type?: "trip" | "home" | "couple" | "other";
  simplifyDebts?: boolean;
}

export interface Friend extends User {}

export interface FriendRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  receiverId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

export interface Reminder {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  amount: number;
  date: string;
  status: "unread" | "read";
}

const EXPENSES_KEY = "splitwise_expenses";
const SETTLEMENTS_KEY = "splitwise_settlements";
const GROUPS_KEY = "splitwise_groups";
const FRIENDS_KEY = "splitwise_friends";
const USERS_KEY = "splitwise_users";
const FRIEND_REQUESTS_KEY = "splitwise_friend_requests";
const REMINDERS_KEY = "splitwise_reminders";

interface DataContextType {
  expenses: Expense[];
  settlements: Settlement[];
  groups: Group[];
  friends: Friend[];
  allUsers: User[];
  friendRequests: FriendRequest[];
  reminders: Reminder[];
  addExpense: (expense: Expense) => Promise<void>;
  addSettlement: (settlement: Settlement) => Promise<void>;
  addGroup: (group: Group) => Promise<void>;
  removeGroup: (groupId: string) => Promise<void>;
  addMemberToGroup: (groupId: string, identifier: string) => Promise<boolean>;
  addFriend: (friend: Friend) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  sendFriendReq: (identifier: string) => Promise<{ success: boolean; message: string }>;
  sendFriendReqByCode: (code: string) => Promise<{ success: boolean; message: string }>;
  acceptFriendReq: (requestId: string) => Promise<void>;
  rejectFriendReq: (requestId: string) => Promise<void>;
  sendReminderNotification: (reminder: Reminder) => Promise<void>;
  refresh: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const cacheLocally = useCallback(
    async (data: {
      expenses: Expense[];
      settlements: Settlement[];
      groups: Group[];
      friends: Friend[];
      allUsers: User[];
      friendRequests: FriendRequest[];
      reminders: Reminder[];
    }) => {
      if (!user) return;
      await Promise.all([
        AsyncStorage.setItem(
          `${EXPENSES_KEY}_${user.id}`,
          JSON.stringify(data.expenses)
        ),
        AsyncStorage.setItem(
          `${SETTLEMENTS_KEY}_${user.id}`,
          JSON.stringify(data.settlements)
        ),
        AsyncStorage.setItem(
          `${GROUPS_KEY}_${user.id}`,
          JSON.stringify(data.groups)
        ),
        AsyncStorage.setItem(
          `${FRIENDS_KEY}_${user.id}`,
          JSON.stringify(data.friends)
        ),
        AsyncStorage.setItem(USERS_KEY, JSON.stringify(data.allUsers)),
        AsyncStorage.setItem(
          `${FRIEND_REQUESTS_KEY}_${user.id}`,
          JSON.stringify(data.friendRequests)
        ),
        AsyncStorage.setItem(
          `${REMINDERS_KEY}_${user.id}`,
          JSON.stringify(data.reminders)
        ),
      ]);
    },
    [user]
  );

  const load = useCallback(async () => {
    if (loading) return;
    if (!user) {
      setExpenses([]);
      setSettlements([]);
      setGroups([]);
      setFriends([]);
      setFriendRequests([]);
      setReminders([]);
      return;
    }
    try {
      const [expRaw, setRaw, grpRaw, frnRaw, usrRaw, reqRaw, remRaw] = await Promise.all([
        AsyncStorage.getItem(`${EXPENSES_KEY}_${user.id}`),
        AsyncStorage.getItem(`${SETTLEMENTS_KEY}_${user.id}`),
        AsyncStorage.getItem(`${GROUPS_KEY}_${user.id}`),
        AsyncStorage.getItem(`${FRIENDS_KEY}_${user.id}`),
        AsyncStorage.getItem(USERS_KEY),
        AsyncStorage.getItem(`${FRIEND_REQUESTS_KEY}_${user.id}`),
        AsyncStorage.getItem(`${REMINDERS_KEY}_${user.id}`),
      ]);
      if (expRaw) setExpenses(JSON.parse(expRaw));
      if (setRaw) setSettlements(JSON.parse(setRaw));
      if (grpRaw) setGroups(JSON.parse(grpRaw));
      if (frnRaw) setFriends(JSON.parse(frnRaw));
      if (usrRaw) setAllUsers(JSON.parse(usrRaw));
      if (reqRaw) setFriendRequests(JSON.parse(reqRaw));
      if (remRaw) setReminders(JSON.parse(remRaw));
    } catch (err) {
      console.warn("Firestore loading failed (using cached local data):", err);
    }
  }, [user, cacheLocally]);

  useEffect(() => {
    if (!user) return;
    load();

    const unsubscribe = subscribeUserData(
      user.id,
      (data) => {
        setExpenses(data.expenses);
        setSettlements(data.settlements);
        setGroups(data.groups);
        setFriends(data.friends);
        setAllUsers(data.allUsers);
        setFriendRequests(data.friendRequests);
        setReminders(data.reminders || []);
        cacheLocally(data);
      },
      (err) => console.warn("Firestore realtime subscription error:", err)
    );

    return unsubscribe;
  }, [user?.id]);

  const addExpense = useCallback(
    async (expense: Expense) => {
      if (!user) return;
      try {
        await saveExpense(expense, user.id);
      } catch (err) {
        console.error("Failed to sync expense to Firestore:", err);
      }
      setExpenses((prev) => {
        const next = Array.from(
          new Map([expense, ...prev].map((item) => [item.id, item])).values()
        );
        AsyncStorage.setItem(
          `${EXPENSES_KEY}_${user.id}`,
          JSON.stringify(next)
        );
        return next;
      });
    },
    [user]
  );

  const addSettlement = useCallback(
    async (settlement: Settlement) => {
      if (!user) return;
      try {
        await saveSettlement(settlement);
      } catch (err) {
        console.error("Failed to sync settlement to Firestore:", err);
      }
      setSettlements((prev) => {
        const next = Array.from(
          new Map([settlement, ...prev].map((item) => [item.id, item])).values()
        );
        AsyncStorage.setItem(
          `${SETTLEMENTS_KEY}_${user.id}`,
          JSON.stringify(next)
        );
        return next;
      });
    },
    [user]
  );

  const addGroup = useCallback(
    async (group: Group) => {
      if (!user) return;
      try {
        await createGroup(group);
      } catch (err) {
        console.error("Failed to sync group to Firestore:", err);
      }
      setGroups((prev) => {
        const next = [group, ...prev];
        AsyncStorage.setItem(`${GROUPS_KEY}_${user.id}`, JSON.stringify(next));
        return next;
      });
    },
    [user]
  );

  const removeGroup = useCallback(
    async (groupId: string) => {
      if (!user) return;
      try {
        await deleteGroup(groupId);
      } catch (err) {
        console.error("Failed to delete group from Firestore:", err);
      }

      setGroups((prev) => {
        const next = prev.filter((g) => g.id !== groupId);
        AsyncStorage.setItem(`${GROUPS_KEY}_${user.id}`, JSON.stringify(next));
        return next;
      });

      setExpenses((prev) => {
        const next = prev.filter((e) => e.groupId !== groupId);
        AsyncStorage.setItem(`${EXPENSES_KEY}_${user.id}`, JSON.stringify(next));
        return next;
      });

      setSettlements((prev) => {
        const next = prev.filter((s) => s.groupId !== groupId);
        AsyncStorage.setItem(`${SETTLEMENTS_KEY}_${user.id}`, JSON.stringify(next));
        return next;
      });
    },
    [user]
  );

  const addMemberToGroup = useCallback(
    async (groupId: string, identifier: string): Promise<boolean> => {
      const raw = identifier.trim();
      if (!raw) return false;

      const normalizePhone = (p: string) => p.replace(/[^\d]/g, "");
      const rawPhone = normalizePhone(raw);

      const foundUser = allUsers.find((u) => {
        if (raw.includes("@")) {
          return u.email.toLowerCase() === raw.toLowerCase();
        }
        const uPhone = u.phone ? normalizePhone(u.phone) : "";
        return uPhone !== "" && uPhone === rawPhone;
      });
      if (!foundUser) return false;

      try {
        await addGroupMember(groupId, foundUser);
      } catch (err) {
        console.error("Failed to sync new group member to Firestore:", err);
      }

      setGroups((prev) => {
        const next = prev.map((g) => {
          if (g.id !== groupId) return g;
          if (g.members.some((m) => m.id === foundUser.id)) return g;
          return {
            ...g,
            members: [
              ...g.members,
              {
                id: foundUser.id,
                name: foundUser.name,
                email: foundUser.email,
                phone: foundUser.phone,
              },
            ],
          };
        });
        if (user) {
          AsyncStorage.setItem(`${GROUPS_KEY}_${user.id}`, JSON.stringify(next));
        }
        return next;
      });
      return true;
    },
    [allUsers, user]
  );

  const addFriend = useCallback(
    async (friend: Friend) => {
      if (!user) return;
      try {
        await saveFriend(user.id, friend);
      } catch (err) {
        console.error("Failed to sync new friend to Firestore:", err);
      }
      setFriends((prev) => {
        if (prev.find((f) => f.id === friend.id)) return prev;
        const next = [...prev, friend];
        AsyncStorage.setItem(`${FRIENDS_KEY}_${user.id}`, JSON.stringify(next));
        return next;
      });
    },
    [user]
  );

  const removeFriend = useCallback(
    async (friendId: string) => {
      if (!user) return;
      try {
        await deleteFriend(user.id, friendId);
      } catch (err) {
        console.error("Failed to delete friend from Firestore:", err);
      }
      setFriends((prev) => {
        const next = prev.filter((f) => f.id !== friendId);
        AsyncStorage.setItem(`${FRIENDS_KEY}_${user.id}`, JSON.stringify(next));
        return next;
      });
    },
    [user]
  );

  const sendFriendReq = useCallback(
    async (identifier: string) => {
      if (!user) return { success: false, message: "User not logged in." };
      const foundUser = await findUserByIdentifier(identifier);
      if (!foundUser) {
        return {
          success: false,
          message: "No account found with this phone number or email.",
        };
      }
      if (foundUser.id === user.id) {
        return { success: false, message: "You cannot add yourself as a friend." };
      }
      return await sendFriendRequest(
        user.id,
        user.name,
        user.email,
        user.phone,
        foundUser.id,
        foundUser.name,
        foundUser.email,
        foundUser.phone
      );
    },
    [user]
  );

  const sendFriendReqByCode = useCallback(
    async (code: string) => {
      if (!user) return { success: false, message: "User not logged in." };
      const foundUser = await findUserByFriendCode(code);
      if (!foundUser) {
        return { success: false, message: "Invalid or expired friend code." };
      }
      if (foundUser.id === user.id) {
        return { success: false, message: "You cannot add yourself as a friend." };
      }
      return await sendFriendRequest(
        user.id,
        user.name,
        user.email,
        user.phone,
        foundUser.id,
        foundUser.name,
        foundUser.email,
        foundUser.phone
      );
    },
    [user]
  );

  const acceptFriendReq = useCallback(
    async (requestId: string) => {
      if (!user) return;
      try {
        await acceptFriendRequest(
          requestId,
          user.name,
          user.email,
          user.phone
        );
        setFriendRequests((prev) => {
          const next = prev.filter((r) => r.id !== requestId);
          AsyncStorage.setItem(
            `${FRIEND_REQUESTS_KEY}_${user.id}`,
            JSON.stringify(next)
          );
          return next;
        });
      } catch (err) {
        console.error("Failed to accept friend request:", err);
        throw err;
      }
    },
    [user]
  );

  const rejectFriendReq = useCallback(
    async (requestId: string) => {
      const removeLocal = () => {
        setFriendRequests((prev) => {
          const next = prev.filter((r) => r.id !== requestId);
          if (user) {
            AsyncStorage.setItem(
              `${FRIEND_REQUESTS_KEY}_${user.id}`,
              JSON.stringify(next)
            );
          }
          return next;
        });
      };

      try {
        await rejectFriendRequest(requestId);
        removeLocal();
      } catch (err: unknown) {
        const code =
          err && typeof err === "object" && "code" in err
            ? String((err as { code: string }).code)
            : "";
        if (code === "permission-denied" || code === "not-found") {
          removeLocal();
          return;
        }
        console.error("Failed to reject friend request:", err);
        throw err;
      }
    },
    [user]
  );

  const sendReminderNotification = useCallback(
    async (reminder: Reminder) => {
      if (!user) return;
      try {
        await saveReminder(reminder);
      } catch (err) {
        console.error("Failed to sync reminder to Firestore:", err);
      }
      setReminders((prev) => {
        const next = [reminder, ...prev];
        AsyncStorage.setItem(
          `${REMINDERS_KEY}_${user.id}`,
          JSON.stringify(next)
        );
        return next;
      });
    },
    [user]
  );

  return (
    <DataContext.Provider
      value={{
        expenses,
        settlements,
        groups,
        friends,
        allUsers,
        friendRequests,
        reminders,
        addExpense,
        addSettlement,
        addGroup,
        removeGroup,
        addMemberToGroup,
        addFriend,
        removeFriend,
        sendFriendReq,
        sendFriendReqByCode,
        acceptFriendReq,
        rejectFriendReq,
        sendReminderNotification,
        refresh: load,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
