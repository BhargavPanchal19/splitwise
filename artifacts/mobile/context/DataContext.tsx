import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { User } from "@/context/AuthContext";

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
}

export interface Friend extends User {}

const EXPENSES_KEY = "splitwise_expenses";
const SETTLEMENTS_KEY = "splitwise_settlements";
const GROUPS_KEY = "splitwise_groups";
const FRIENDS_KEY = "splitwise_friends";
const USERS_KEY = "splitwise_users";

interface DataContextType {
  expenses: Expense[];
  settlements: Settlement[];
  groups: Group[];
  friends: Friend[];
  allUsers: (User & { password: string })[];
  addExpense: (expense: Expense) => Promise<void>;
  addSettlement: (settlement: Settlement) => Promise<void>;
  addGroup: (group: Group) => Promise<void>;
  addFriend: (friend: Friend) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [allUsers, setAllUsers] = useState<(User & { password: string })[]>([]);

  const load = useCallback(async () => {
    const [expRaw, setRaw, grpRaw, frnRaw, usrRaw] = await Promise.all([
      AsyncStorage.getItem(EXPENSES_KEY),
      AsyncStorage.getItem(SETTLEMENTS_KEY),
      AsyncStorage.getItem(GROUPS_KEY),
      AsyncStorage.getItem(FRIENDS_KEY),
      AsyncStorage.getItem(USERS_KEY),
    ]);
    setExpenses(expRaw ? JSON.parse(expRaw) : []);
    setSettlements(setRaw ? JSON.parse(setRaw) : []);
    setGroups(grpRaw ? JSON.parse(grpRaw) : []);
    setFriends(frnRaw ? JSON.parse(frnRaw) : []);
    setAllUsers(usrRaw ? JSON.parse(usrRaw) : []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addExpense = useCallback(async (expense: Expense) => {
    setExpenses((prev) => {
      const next = [expense, ...prev];
      AsyncStorage.setItem(EXPENSES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const addSettlement = useCallback(async (settlement: Settlement) => {
    setSettlements((prev) => {
      const next = [settlement, ...prev];
      AsyncStorage.setItem(SETTLEMENTS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const addGroup = useCallback(async (group: Group) => {
    setGroups((prev) => {
      const next = [group, ...prev];
      AsyncStorage.setItem(GROUPS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const addFriend = useCallback(async (friend: Friend) => {
    setFriends((prev) => {
      if (prev.find((f) => f.id === friend.id)) return prev;
      const next = [...prev, friend];
      AsyncStorage.setItem(FRIENDS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeFriend = useCallback(async (friendId: string) => {
    setFriends((prev) => {
      const next = prev.filter((f) => f.id !== friendId);
      AsyncStorage.setItem(FRIENDS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <DataContext.Provider
      value={{
        expenses,
        settlements,
        groups,
        friends,
        allUsers,
        addExpense,
        addSettlement,
        addGroup,
        addFriend,
        removeFriend,
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
