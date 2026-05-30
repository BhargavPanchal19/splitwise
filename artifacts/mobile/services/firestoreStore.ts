import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { db, auth } from "@/config/firebase";
import type { User } from "@/context/AuthContext";
import type { Expense, Settlement, Group, Friend, FriendRequest, Reminder } from "@/context/DataContext";
import { generateFriendCode } from "@/utils/friendCode";

export interface UserDataBundle {
  expenses: Expense[];
  settlements: Settlement[];
  groups: Group[];
  friends: Friend[];
  allUsers: User[];
  friendRequests: FriendRequest[];
  reminders: Reminder[];
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

function userFromDoc(userId: string, data: Record<string, unknown>): User {
  return {
    id: userId,
    name: (data.name as string) || "User",
    email: (data.email as string) || "",
    phone: typeof data.phone === "string" ? (data.phone as string) : undefined,
    friendCode:
      typeof data.friendCode === "string" ? (data.friendCode as string) : undefined,
  };
}

/** Find user by their public friend code (QR / invite link). */
export async function findUserByFriendCode(code: string): Promise<User | null> {
  const normalized = code.trim().toLowerCase();
  if (!normalized) return null;

  const snap = await getDocs(
    query(collection(db, "users"), where("friendCode", "==", normalized))
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return userFromDoc(d.id, d.data() as Record<string, unknown>);
}

async function isFriendCodeTaken(code: string, excludeUserId?: string): Promise<boolean> {
  const snap = await getDocs(
    query(collection(db, "users"), where("friendCode", "==", code))
  );
  if (snap.empty) return false;
  if (excludeUserId && snap.docs.length === 1 && snap.docs[0].id === excludeUserId) {
    return false;
  }
  return true;
}

/** Ensure the user has a unique friend code (created on first open of My code). */
export async function ensureFriendCode(userId: string): Promise<string> {
  const ref = doc(db, "users", userId);
  const snap = await getDoc(ref);
  const existing =
    snap.exists() && typeof snap.data()?.friendCode === "string"
      ? (snap.data()!.friendCode as string)
      : null;
  if (existing) return existing;

  let code = generateFriendCode();
  let attempts = 0;
  while ((await isFriendCodeTaken(code)) && attempts < 8) {
    code = generateFriendCode();
    attempts += 1;
  }

  await setDoc(
    ref,
    { friendCode: code, updatedAt: serverTimestamp() },
    { merge: true }
  );
  return code;
}

/** Regenerate invite code (invalidates old QR / links). */
export async function regenerateFriendCode(userId: string): Promise<string> {
  let code = generateFriendCode();
  let attempts = 0;
  while ((await isFriendCodeTaken(code, userId)) && attempts < 8) {
    code = generateFriendCode();
    attempts += 1;
  }

  await setDoc(
    doc(db, "users", userId),
    { friendCode: code, updatedAt: serverTimestamp() },
    { merge: true }
  );
  return code;
}

/** Find registered user by email or phone number */
export async function findUserByIdentifier(
  identifier: string
): Promise<User | null> {
  const raw = identifier.trim();
  if (!raw) return null;

  if (raw.includes("@")) {
    const snap = await getDocs(
      query(collection(db, "users"), where("email", "==", raw.toLowerCase()))
    );
    if (snap.empty) return null;
    const d = snap.docs[0];
    return userFromDoc(d.id, d.data() as Record<string, unknown>);
  }

  const phoneNormalized = normalizePhone(raw);
  if (phoneNormalized.length < 10) return null;

  const snap = await getDocs(
    query(
      collection(db, "users"),
      where("phoneNormalized", "==", phoneNormalized)
    )
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return userFromDoc(d.id, d.data() as Record<string, unknown>);
}

function toIso(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (typeof value === "string") return value;
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

function expenseFromDoc(data: Record<string, unknown>, id: string): Expense {
  const involved =
    (data.involvedUsers as string[] | undefined) ??
    (data.participantIds as string[] | undefined) ??
    [];
  return {
    id: (data.id as string) || id,
    title: data.title as string,
    amount: data.amount as number,
    paidBy: data.paidBy as string,
    paidByName: (data.paidByName as string) || "",
    groupId: (data.groupId as string | null | undefined) ?? null,
    category: (data.category as string) || "Others",
    date: toIso(data.date),
    createdAt: toIso(data.createdAt ?? data.date),
    splits: (data.splits as Expense["splits"]) || [],
    involvedUsers: involved,
  };
}

function settlementFromDoc(data: Record<string, unknown>, id: string): Settlement {
  return {
    id: (data.id as string) || id,
    paidBy: data.paidBy as string,
    paidByName: (data.paidByName as string) || "",
    paidTo: data.paidTo as string,
    paidToName: (data.paidToName as string) || "",
    amount: data.amount as number,
    groupId: (data.groupId as string | null | undefined) ?? null,
    date: toIso(data.date),
  };
}

function memberFromDoc(memberId: string, data: Record<string, unknown>): User {
  return {
    id: (data.userId as string) || memberId,
    name: (data.displayName as string) || (data.name as string) || "User",
    email: (data.email as string) || "",
    phone: typeof data.phone === "string" ? (data.phone as string) : undefined,
  };
}

function groupFromDoc(
  groupId: string,
  data: Record<string, unknown>,
  members: User[]
): Group {
  return {
    id: groupId,
    name: data.name as string,
    createdBy: data.createdBy as string,
    members,
    createdAt: toIso(data.createdAt),
    ...(data.type ? { type: data.type as Group["type"] } : {}),
    ...(typeof data.simplifyDebts === "boolean"
      ? { simplifyDebts: data.simplifyDebts }
      : {}),
  };
}

function friendFromDoc(data: Record<string, unknown>): Friend {
  return {
    id: (data.friendId as string) || "",
    name: (data.name as string) || "",
    email: (data.email as string) || "",
    phone: typeof data.phone === "string" ? (data.phone as string) : undefined,
  };
}

function settlementParticipantIds(s: Settlement): string[] {
  return [s.paidBy, s.paidTo];
}

function expensePayload(expense: Expense, createdBy: string) {
  const participantIds = Array.from(
    new Set(
      [...expense.involvedUsers, createdBy, expense.paidBy].filter(
        (id): id is string => Boolean(id)
      )
    )
  );

  return {
    ...expense,
    involvedUsers: participantIds,
    scope: expense.groupId ? "group" : "personal",
    participantIds,
    createdBy,
    groupId: expense.groupId,
  };
}

function settlementPayload(settlement: Settlement) {
  return {
    ...settlement,
    participantIds: settlementParticipantIds(settlement),
    createdAt: settlement.date,
  };
}

/** Save user profile on signup */
export async function saveUserProfile(user: User): Promise<void> {
  const phone = user.phone?.trim();
  const phoneNormalized = phone ? normalizePhone(phone) : null;
  await setDoc(
    doc(db, "users", user.id),
    {
      ...user,
      phone: phone ?? null,
      phoneNormalized,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/** Load profile from Firestore (sign-in) */
export async function fetchUserProfile(userId: string): Promise<User | null> {
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: userId,
    name: (data.name as string) || "User",
    email: (data.email as string) || "",
    phone: typeof data.phone === "string" ? (data.phone as string) : undefined,
    friendCode:
      typeof data.friendCode === "string" ? (data.friendCode as string) : undefined,
  };
}

async function loadGroupWithMembers(
  groupId: string,
  data: Record<string, unknown>
): Promise<Group> {
  const membersSnap = await getDocs(collection(db, "groups", groupId, "members"));
  let members: User[] = membersSnap.docs.map((m) =>
    memberFromDoc(m.id, m.data() as Record<string, unknown>)
  );

  if (members.length === 0 && Array.isArray(data.members)) {
    members = (data.members as User[]).map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
    }));
  }

  return groupFromDoc(groupId, data, members);
}

async function loadLegacyFlatData(userId: string, loadedGroupIds: Set<string>) {
  try {
    const [legacyGrpSnap, legacyExpSnap, legacySetSnap, legacyFrSnap] =
      await Promise.all([
        getDocs(collection(db, "groups")),
        getDocs(collection(db, "expenses")),
        getDocs(collection(db, "settlements")),
        getDocs(collection(db, "friends")),
      ]);

    const legacyGroups: Group[] = [];
    for (const gDoc of legacyGrpSnap.docs) {
      if (loadedGroupIds.has(gDoc.id)) continue;
      const data = gDoc.data() as Record<string, unknown>;
      const members = (data.members as User[] | undefined) ?? [];
      const isMember =
        data.createdBy === userId || members.some((m) => m.id === userId);
      if (!isMember) continue;
      legacyGroups.push(groupFromDoc(gDoc.id, data, members));
    }

    const legacyGroupIds = new Set(legacyGroups.map((g) => g.id));

    const legacyExpenses = legacyExpSnap.docs
      .map((d) => expenseFromDoc(d.data() as Record<string, unknown>, d.id))
      .filter(
        (e) =>
          e.paidBy === userId ||
          e.involvedUsers.includes(userId) ||
          (e.groupId && legacyGroupIds.has(e.groupId))
      );

    const legacySettlements = legacySetSnap.docs
      .map((d) => settlementFromDoc(d.data() as Record<string, unknown>, d.id))
      .filter(
        (s) =>
          s.paidBy === userId ||
          s.paidTo === userId ||
          (s.groupId && legacyGroupIds.has(s.groupId))
      );

    const legacyFriends: Friend[] = [];
    for (const fDoc of legacyFrSnap.docs) {
      const data = fDoc.data() as Record<string, unknown>;
      if (data.ownerId === userId || data.userId === userId) {
        const friend = friendFromDoc(data);
        if (friend.id && friend.id !== userId) legacyFriends.push(friend);
      }
    }

    return { legacyGroups, legacyExpenses, legacySettlements, legacyFriends };
  } catch (_err) {
    return {
      legacyGroups: [] as Group[],
      legacyExpenses: [] as Expense[],
      legacySettlements: [] as Settlement[],
      legacyFriends: [] as Friend[],
    };
  }
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of items) map.set(item.id, item);
  return Array.from(map.values());
}

/** Load all data for the signed-in user */
export async function loadUserData(userId: string): Promise<UserDataBundle> {
  const usersSnap = await getDocs(collection(db, "users"));
  const allUsers = usersSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: (data.name as string) || "User",
      email: (data.email as string) || "",
      phone: typeof data.phone === "string" ? (data.phone as string) : undefined,
    };
  });

  const groupsQuery = query(
    collection(db, "groups"),
    where("memberIds", "array-contains", userId)
  );
  const [groupsSnap, friendsSnap, personalExpSnap, personalSetSnap, friendRequestsSnap, remindersSnap] =
    await Promise.all([
      getDocs(groupsQuery),
      getDocs(query(collection(db, "friends"), where("ownerId", "==", userId))),
      getDocs(
        query(
          collection(db, "userExpenses"),
          where("participantIds", "array-contains", userId)
        )
      ),
      getDocs(
        query(
          collection(db, "userSettlements"),
          where("participantIds", "array-contains", userId)
        )
      ),
      getDocs(
        query(
          collection(db, "friendRequests"),
          where("receiverId", "==", userId),
          where("status", "==", "pending")
        )
      ),
      getDocs(
        query(
          collection(db, "userReminders"),
          where("participantIds", "array-contains", userId)
        )
      ),
    ]);

  const loadedGroupIds = new Set<string>();
  const groups: Group[] = [];
  const groupExpenses: Expense[] = [];
  const groupSettlements: Settlement[] = [];

  await Promise.all(
    groupsSnap.docs.map(async (gDoc) => {
      loadedGroupIds.add(gDoc.id);
      const data = gDoc.data() as Record<string, unknown>;
      const group = await loadGroupWithMembers(gDoc.id, data);
      groups.push(group);

      const [expSnap, setSnap] = await Promise.all([
        getDocs(collection(db, "groups", gDoc.id, "expenses")),
        getDocs(collection(db, "groups", gDoc.id, "settlements")),
      ]);

      for (const eDoc of expSnap.docs) {
        groupExpenses.push(
          expenseFromDoc(eDoc.data() as Record<string, unknown>, eDoc.id)
        );
      }
      for (const sDoc of setSnap.docs) {
        groupSettlements.push(
          settlementFromDoc(sDoc.data() as Record<string, unknown>, sDoc.id)
        );
      }
    })
  );

  const personalExpenses = personalExpSnap.docs.map((d) =>
    expenseFromDoc(d.data() as Record<string, unknown>, d.id)
  );
  const personalSettlements = personalSetSnap.docs.map((d) =>
    settlementFromDoc(d.data() as Record<string, unknown>, d.id)
  );

  const friends = friendsSnap.docs
    .map((d) => friendFromDoc(d.data() as Record<string, unknown>))
    .filter((f) => f.id && f.id !== userId);

  const legacy = await loadLegacyFlatData(userId, loadedGroupIds);

  const allGroups = dedupeById([...groups, ...legacy.legacyGroups]);
  const allGroupIds = new Set(allGroups.map((g) => g.id));

  for (const g of legacy.legacyGroups) {
    if (loadedGroupIds.has(g.id)) continue;
    const [expSnap, setSnap] = await Promise.all([
      getDocs(collection(db, "groups", g.id, "expenses")).catch(() => null),
      getDocs(collection(db, "groups", g.id, "settlements")).catch(() => null),
    ]);
    if (expSnap) {
      for (const eDoc of expSnap.docs) {
        groupExpenses.push(
          expenseFromDoc(eDoc.data() as Record<string, unknown>, eDoc.id)
        );
      }
    }
    if (setSnap) {
      for (const sDoc of setSnap.docs) {
        groupSettlements.push(
          settlementFromDoc(sDoc.data() as Record<string, unknown>, sDoc.id)
        );
      }
    }
  }

  const legacyExpFiltered = legacy.legacyExpenses.filter(
    (e) => !e.groupId || allGroupIds.has(e.groupId)
  );
  const legacySetFiltered = legacy.legacySettlements.filter(
    (s) => !s.groupId || allGroupIds.has(s.groupId)
  );

  const expenses = dedupeById([
    ...groupExpenses,
    ...personalExpenses,
    ...legacyExpFiltered,
  ]);
  const settlements = dedupeById([
    ...groupSettlements,
    ...personalSettlements,
    ...legacySetFiltered,
  ]);
  const allFriends = dedupeById([...friends, ...legacy.legacyFriends]);

  const friendRequests: FriendRequest[] = friendRequestsSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      senderId: data.senderId as string,
      senderName: data.senderName as string,
      senderEmail: data.senderEmail as string,
      senderPhone:
        typeof data.senderPhone === "string" ? (data.senderPhone as string) : undefined,
      receiverId: data.receiverId as string,
      status: data.status as FriendRequest["status"],
      createdAt: toIso(data.createdAt),
    };
  });

  expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  settlements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  allGroups.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const reminders: Reminder[] = remindersSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      senderId: data.senderId as string,
      senderName: data.senderName as string,
      receiverId: data.receiverId as string,
      receiverName: data.receiverName as string,
      amount: data.amount as number,
      date: data.date as string,
      status: data.status as "unread" | "read",
    };
  });

  return {
    expenses,
    settlements,
    groups: allGroups,
    friends: allFriends,
    allUsers,
    friendRequests,
    reminders,
  };
}

type Unsubscribe = () => void;

/** Realtime subscription so new expenses appear for all members immediately. */
export function subscribeUserData(
  userId: string,
  onData: (data: UserDataBundle) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const unsubscribers: Unsubscribe[] = [];

  let allUsers: User[] = [];
  let groups: Group[] = [];
  let friends: Friend[] = [];
  let friendRequests: FriendRequest[] = [];
  let personalExpenses: Expense[] = [];
  let personalSettlements: Settlement[] = [];
  let personalReminders: Reminder[] = [];
  const groupExpensesByGroup = new Map<string, Expense[]>();
  const groupSettlementsByGroup = new Map<string, Settlement[]>();
  const groupSubs = new Map<string, Unsubscribe[]>();

  let emitTimeout: any = null;
  function emit() {
    if (emitTimeout) clearTimeout(emitTimeout);
    emitTimeout = setTimeout(() => {
      const groupExpenses = Array.from(groupExpensesByGroup.values()).flat();
      const groupSettlements = Array.from(groupSettlementsByGroup.values()).flat();

      const expenses = dedupeById([...groupExpenses, ...personalExpenses]);
      const settlements = dedupeById([...groupSettlements, ...personalSettlements]);

      expenses.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      settlements.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      groups.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      onData({
        expenses,
        settlements,
        groups,
        friends,
        allUsers,
        friendRequests,
        reminders: personalReminders,
      });
    }, 150);
  }

  function setGroupSubscriptions(nextGroupIds: string[]) {
    const keep = new Set(nextGroupIds);
    for (const [gid, unsubs] of groupSubs.entries()) {
      if (!keep.has(gid)) {
        for (const u of unsubs) u();
        groupSubs.delete(gid);
        groupExpensesByGroup.delete(gid);
        groupSettlementsByGroup.delete(gid);
      }
    }

    for (const gid of nextGroupIds) {
      if (groupSubs.has(gid)) continue;

      const unsubs: Unsubscribe[] = [];

      unsubs.push(
        onSnapshot(
          collection(db, "groups", gid, "expenses"),
          (snap) => {
            groupExpensesByGroup.set(
              gid,
              snap.docs.map((d) =>
                expenseFromDoc(d.data() as Record<string, unknown>, d.id)
              )
            );
            emit();
          },
          (err) => onError?.(err)
        )
      );

      unsubs.push(
        onSnapshot(
          collection(db, "groups", gid, "settlements"),
          (snap) => {
            groupSettlementsByGroup.set(
              gid,
              snap.docs.map((d) =>
                settlementFromDoc(d.data() as Record<string, unknown>, d.id)
              )
            );
            emit();
          },
          (err) => onError?.(err)
        )
      );

      unsubs.push(
        onSnapshot(
          collection(db, "groups", gid, "members"),
          (snap) => {
            const existing = groups.find((g) => g.id === gid);
            if (!existing) return;
            const members = snap.docs.map((m) =>
              memberFromDoc(m.id, m.data() as Record<string, unknown>)
            );
            groups = groups.map((g) => (g.id === gid ? { ...g, members } : g));
            emit();
          },
          (err) => onError?.(err)
        )
      );

      groupSubs.set(gid, unsubs);
    }
  }

  // users list (for lookups)
  unsubscribers.push(
    onSnapshot(
      collection(db, "users"),
      (snap) => {
        allUsers = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: (data.name as string) || "User",
            email: (data.email as string) || "",
            phone: typeof data.phone === "string" ? (data.phone as string) : undefined,
          };
        });
        emit();
      },
      (err) => onError?.(err)
    )
  );

  // groups
  unsubscribers.push(
    onSnapshot(
      query(collection(db, "groups"), where("memberIds", "array-contains", userId)),
      (snap) => {
        void (async () => {
          try {
            const baseGroups = await Promise.all(
              snap.docs.map(async (gDoc) => {
                const data = gDoc.data() as Record<string, unknown>;
                return await loadGroupWithMembers(gDoc.id, data);
              })
            );
            groups = baseGroups;
            setGroupSubscriptions(baseGroups.map((g) => g.id));
            emit();
          } catch (err) {
            onError?.(err);
          }
        })();
      },
      (err) => onError?.(err)
    )
  );

  // friends owned by user
  unsubscribers.push(
    onSnapshot(
      query(collection(db, "friends"), where("ownerId", "==", userId)),
      (snap) => {
        friends = snap.docs
          .map((d) => friendFromDoc(d.data() as Record<string, unknown>))
          .filter((f) => f.id && f.id !== userId);
        emit();
      },
      (err) => onError?.(err)
    )
  );

  // pending friend requests
  unsubscribers.push(
    onSnapshot(
      query(
        collection(db, "friendRequests"),
        where("receiverId", "==", userId),
        where("status", "==", "pending")
      ),
      (snap) => {
        friendRequests = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            senderId: data.senderId as string,
            senderName: data.senderName as string,
            senderEmail: data.senderEmail as string,
            senderPhone:
              typeof data.senderPhone === "string"
                ? (data.senderPhone as string)
                : undefined,
            receiverId: data.receiverId as string,
            status: data.status as FriendRequest["status"],
            createdAt: toIso(data.createdAt),
          };
        });
        emit();
      },
      (err) => onError?.(err)
    )
  );

  // personal expenses / settlements
  unsubscribers.push(
    onSnapshot(
      query(collection(db, "userExpenses"), where("participantIds", "array-contains", userId)),
      (snap) => {
        personalExpenses = snap.docs.map((d) =>
          expenseFromDoc(d.data() as Record<string, unknown>, d.id)
        );
        emit();
      },
      (err) => onError?.(err)
    )
  );
  unsubscribers.push(
    onSnapshot(
      query(collection(db, "userSettlements"), where("participantIds", "array-contains", userId)),
      (snap) => {
        personalSettlements = snap.docs.map((d) =>
          settlementFromDoc(d.data() as Record<string, unknown>, d.id)
        );
        emit();
      },
      (err) => onError?.(err)
    )
  );

  unsubscribers.push(
    onSnapshot(
      query(collection(db, "userReminders"), where("participantIds", "array-contains", userId)),
      (snap) => {
        personalReminders = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            senderId: data.senderId as string,
            senderName: data.senderName as string,
            receiverId: data.receiverId as string,
            receiverName: data.receiverName as string,
            amount: data.amount as number,
            date: data.date as string,
            status: data.status as "unread" | "read",
          };
        });
        emit();
      },
      (err) => onError?.(err)
    )
  );

  // First emit will happen as snapshots arrive.
  return () => {
    if (emitTimeout) clearTimeout(emitTimeout);
    for (const u of unsubscribers) u();
    for (const unsubs of groupSubs.values()) for (const u of unsubs) u();
  };
}

/** Create group + member subcollection */
export async function createGroup(group: Group): Promise<void> {
  const memberIds = group.members.map((m) => m.id);
  const groupRef = doc(db, "groups", group.id);
  // Important: members/{memberId} writes are protected by security rules
  // that read `groups/{groupId}.memberIds` via `get()`.
  // So we must create the parent group doc first, then create member docs.
  await setDoc(groupRef, {
    id: group.id,
    name: group.name,
    createdBy: group.createdBy,
    memberIds,
    memberCount: memberIds.length,
    type: group.type ?? "other",
    simplifyDebts: group.simplifyDebts ?? false,
    createdAt: group.createdAt,
    updatedAt: serverTimestamp(),
  });

  await Promise.all(
    group.members.map((member) => {
      const memberRef = doc(db, "groups", group.id, "members", member.id);
      return setDoc(memberRef, {
        userId: member.id,
        displayName: member.name,
        email: member.email,
        role: member.id === group.createdBy ? "admin" : "member",
        joinedAt: serverTimestamp(),
      });
    })
  );
}

export async function addGroupMember(
  groupId: string,
  member: User
): Promise<boolean> {
  const groupRef = doc(db, "groups", groupId);
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) return false;

  const data = groupSnap.data();
  const memberIds = (data.memberIds as string[] | undefined) ?? [];
  if (memberIds.includes(member.id)) return true;

  const memberRef = doc(db, "groups", groupId, "members", member.id);
  await setDoc(memberRef, {
    userId: member.id,
    displayName: member.name,
    email: member.email,
    role: "member",
    joinedAt: serverTimestamp(),
  });

  await updateDoc(groupRef, {
    memberIds: [...memberIds, member.id],
    memberCount: memberIds.length + 1,
    updatedAt: serverTimestamp(),
  });

  return true;
}

export async function saveExpense(expense: Expense, createdBy: string): Promise<void> {
  const payload = expensePayload(expense, createdBy);

  if (expense.groupId) {
    await setDoc(doc(db, "groups", expense.groupId, "expenses", expense.id), payload);
  } else {
    await setDoc(doc(db, "userExpenses", expense.id), payload);
  }
}

export async function saveSettlement(settlement: Settlement): Promise<void> {
  const payload = settlementPayload(settlement);

  if (settlement.groupId) {
    await setDoc(
      doc(db, "groups", settlement.groupId, "settlements", settlement.id),
      payload
    );
  } else {
    await setDoc(doc(db, "userSettlements", settlement.id), payload);
  }
}

export async function saveFriend(ownerId: string, friend: Friend): Promise<void> {
  const relationshipId = `${ownerId}_${friend.id}`;
  await setDoc(doc(db, "friends", relationshipId), {
    id: relationshipId,
    ownerId,
    friendId: friend.id,
    name: friend.name,
    email: friend.email,
    phone: friend.phone ?? null,
    createdAt: serverTimestamp(),
  });
}

export async function deleteFriend(ownerId: string, friendId: string): Promise<void> {
  await deleteDoc(doc(db, "friends", `${ownerId}_${friendId}`));
}

async function deleteCollectionDocs(colRef: ReturnType<typeof collection>): Promise<void> {
  const snap = await getDocs(colRef);
  if (snap.empty) return;

  // Firestore batch limit is 500 operations; keep buffer.
  let batch = writeBatch(db);
  let ops = 0;

  for (const d of snap.docs) {
    batch.delete(d.ref);
    ops += 1;
    if (ops >= 450) {
      await batch.commit();
      batch = writeBatch(db);
      ops = 0;
    }
  }

  if (ops > 0) await batch.commit();
}

/** Delete a group and its subcollections (members/expenses/settlements). */
export async function deleteGroup(groupId: string): Promise<void> {
  await Promise.all([
    deleteCollectionDocs(collection(db, "groups", groupId, "expenses")),
    deleteCollectionDocs(collection(db, "groups", groupId, "settlements")),
    deleteCollectionDocs(collection(db, "groups", groupId, "members")),
  ]);
  await deleteDoc(doc(db, "groups", groupId));
}

export async function sendFriendRequest(
  senderId: string,
  senderName: string,
  senderEmail: string,
  senderPhone: string | undefined,
  receiverId: string,
  receiverName: string,
  receiverEmail: string,
  receiverPhone: string | undefined
): Promise<{ success: boolean; message: string }> {
  // Check if already friends
  const friendCheck = await getDoc(doc(db, "friends", `${senderId}_${receiverId}`));
  if (friendCheck.exists()) {
    return { success: false, message: "You are already friends with this user." };
  }

  // Check if request already pending
  const reqId = `${senderId}_${receiverId}`;
  const reverseReqId = `${receiverId}_${senderId}`;

  const [reqCheck, reverseReqCheck] = await Promise.all([
    getDoc(doc(db, "friendRequests", reqId)),
    getDoc(doc(db, "friendRequests", reverseReqId)),
  ]);

  if (reqCheck.exists() && reqCheck.data()?.status === "pending") {
    return { success: false, message: "You have already sent a pending request to this user." };
  }
  if (reverseReqCheck.exists() && reverseReqCheck.data()?.status === "pending") {
    return { success: false, message: "This user has already sent you a pending friend request." };
  }

  // Create pending request
  await setDoc(doc(db, "friendRequests", reqId), {
    id: reqId,
    senderId,
    senderName,
    senderEmail,
    senderPhone: senderPhone ?? null,
    receiverId,
    receiverName,
    receiverEmail,
    receiverPhone: receiverPhone ?? null,
    status: "pending",
    createdAt: serverTimestamp(),
  });

  return { success: true, message: `Friend request sent to ${receiverName || receiverEmail}!` };
}

export async function acceptFriendRequest(
  requestId: string,
  receiverName: string,
  receiverEmail: string,
  receiverPhone?: string
): Promise<void> {
  const reqRef = doc(db, "friendRequests", requestId);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) return;

  const data = reqSnap.data();
  const senderId = data.senderId as string;
  const senderName = data.senderName as string;
  const senderEmail = data.senderEmail as string;
  const senderPhone =
    (data.senderPhone as string | undefined) ??
    (typeof data.senderPhone === "string" ? data.senderPhone : undefined);
  const receiverId = data.receiverId as string;

  await updateDoc(reqRef, {
    status: "accepted",
    updatedAt: serverTimestamp(),
  });

  await Promise.all([
    setDoc(doc(db, "friends", `${senderId}_${receiverId}`), {
      id: `${senderId}_${receiverId}`,
      ownerId: senderId,
      friendId: receiverId,
      name: receiverName,
      email: receiverEmail,
      phone: receiverPhone ?? null,
      createdAt: serverTimestamp(),
    }),
    setDoc(doc(db, "friends", `${receiverId}_${senderId}`), {
      id: `${receiverId}_${senderId}`,
      ownerId: receiverId,
      friendId: senderId,
      name: senderName,
      email: senderEmail,
      phone: senderPhone ?? null,
      createdAt: serverTimestamp(),
    }),
  ]);
}

export async function rejectFriendRequest(requestId: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error("You must be signed in to decline a friend request.");
  }

  const reqRef = doc(db, "friendRequests", requestId);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) return;

  const data = reqSnap.data();
  const receiverId = data.receiverId as string | undefined;
  const senderId = data.senderId as string | undefined;

  if (receiverId !== uid && senderId !== uid) {
    throw new Error("You can only decline requests sent to you.");
  }

  await deleteDoc(reqRef);
}

export async function saveReminder(reminder: Reminder): Promise<void> {
  const reminderRef = doc(db, "userReminders", reminder.id);
  await setDoc(reminderRef, {
    id: reminder.id,
    senderId: reminder.senderId,
    senderName: reminder.senderName,
    receiverId: reminder.receiverId,
    receiverName: reminder.receiverName,
    amount: reminder.amount,
    date: reminder.date,
    status: reminder.status,
    participantIds: [reminder.senderId, reminder.receiverId],
    createdAt: serverTimestamp(),
  });
}
