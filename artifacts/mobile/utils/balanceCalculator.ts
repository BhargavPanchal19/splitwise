import { Expense, Settlement } from "@/context/DataContext";

export interface Balance {
  userId: string;
  userName: string;
  netAmount: number;
}

export function calculateNetBalance(
  currentUserId: string,
  expenses: Expense[],
  settlements: Settlement[]
): number {
  let net = 0;
  for (const expense of expenses) {
    if (expense.paidBy === currentUserId) {
      for (const split of expense.splits) {
        if (split.userId !== currentUserId) {
          net += split.amountOwed;
        }
      }
    } else {
      const mySplit = expense.splits.find((s) => s.userId === currentUserId);
      if (mySplit) {
        net -= mySplit.amountOwed;
      }
    }
  }
  for (const s of settlements) {
    if (s.paidBy === currentUserId) {
      net -= s.amount;
    } else if (s.paidTo === currentUserId) {
      net += s.amount;
    }
  }
  return net;
}

export function calculatePairBalance(
  currentUserId: string,
  friendId: string,
  expenses: Expense[],
  settlements: Settlement[]
): number {
  let net = 0;
  for (const expense of expenses) {
    const isPayer = expense.paidBy === currentUserId;
    const isFriendPayer = expense.paidBy === friendId;
    if (isPayer) {
      const friendSplit = expense.splits.find((s) => s.userId === friendId);
      if (friendSplit) net += friendSplit.amountOwed;
    } else if (isFriendPayer) {
      const mySplit = expense.splits.find((s) => s.userId === currentUserId);
      if (mySplit) net -= mySplit.amountOwed;
    }
  }
  for (const s of settlements) {
    const involves =
      (s.paidBy === currentUserId && s.paidTo === friendId) ||
      (s.paidBy === friendId && s.paidTo === currentUserId);
    if (!involves) continue;
    if (s.paidBy === currentUserId) {
      net += s.amount;
    } else {
      net -= s.amount;
    }
  }
  return net;
}

export function calculateGroupBalances(
  currentUserId: string,
  groupId: string,
  expenses: Expense[],
  settlements: Settlement[],
  memberIds: string[],
  memberNames: Record<string, string>
): Balance[] {
  const groupExpenses = expenses.filter((e) => e.groupId === groupId);
  const groupSettlements = settlements.filter((s) => s.groupId === groupId);
  return memberIds
    .filter((id) => id !== currentUserId)
    .map((id) => ({
      userId: id,
      userName: memberNames[id] ?? "Unknown",
      netAmount: calculatePairBalance(
        currentUserId,
        id,
        groupExpenses,
        groupSettlements
      ),
    }))
    .filter((b) => b.netAmount !== 0);
}
