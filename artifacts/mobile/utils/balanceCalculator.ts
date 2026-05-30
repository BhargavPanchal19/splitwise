import { Expense, Settlement } from "@/context/DataContext";

export interface Balance {
  userId: string;
  userName: string;
  netAmount: number;
}

export interface SettlementTransaction {
  fromUser: string;
  fromUserName?: string;
  toUser: string;
  toUserName?: string;
  amount: number;
}

export interface UserBalanceReport {
  totalSpent: number;
  totalOwed: number;
  netBalance: number;
}

/**
 * Calculates each participant's exact share in cents based on the split type.
 */
export function calculateSplitAmounts(
  totalAmount: number,
  participants: string[],
  splitType: "equal" | "exact" | "percentage",
  values?: Record<string, number> // Holds exact amounts or percentages per user ID
): Record<string, number> {
  const shares: Record<string, number> = {};
  if (participants.length === 0) return shares;

  switch (splitType) {
    case "equal": {
      const share = Math.round(totalAmount / participants.length);
      // Adjust the last person's share to account for rounding errors
      let sum = 0;
      participants.forEach((uid, index) => {
        if (index === participants.length - 1) {
          shares[uid] = totalAmount - sum;
        } else {
          shares[uid] = share;
          sum += share;
        }
      });
      break;
    }

    case "exact": {
      let sum = 0;
      participants.forEach((uid) => {
        const val = values?.[uid] ?? 0;
        shares[uid] = val;
        sum += val;
      });
      // Handle rounding/residual differences if total doesn't match exactly
      const diff = totalAmount - sum;
      if (diff !== 0 && participants.length > 0) {
        shares[participants[0]] += diff;
      }
      break;
    }

    case "percentage": {
      let sum = 0;
      participants.forEach((uid, index) => {
        const pct = values?.[uid] ?? 0;
        if (index === participants.length - 1) {
          shares[uid] = totalAmount - sum;
        } else {
          const share = Math.round((totalAmount * pct) / 100);
          shares[uid] = share;
          sum += share;
        }
      });
      break;
    }
  }

  return shares;
}

/**
 * Calculates the individual net balance of a single user.
 */
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

/**
 * Calculates pairwise balance between the current user and a specific friend.
 */
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

/**
 * Calculates running balances for all group members relative to the current user.
 */
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

/**
 * Generates comprehensive balance metrics (spent, owed, net) for each user.
 */
export function getUserBalancesReport(
  expenses: Expense[],
  settlements: Settlement[],
  memberIds: string[]
): Record<string, UserBalanceReport> {
  const reports: Record<string, UserBalanceReport> = {};

  memberIds.forEach((uid) => {
    reports[uid] = { totalSpent: 0, totalOwed: 0, netBalance: 0 };
  });

  // Process all expenses
  expenses.forEach((expense) => {
    const payer = expense.paidBy;

    // Add full amount to payer's total spent
    if (reports[payer]) {
      reports[payer].totalSpent += expense.amount;
      reports[payer].netBalance += expense.amount;
    }

    // Add owed shares to each participant's total owed and subtract from net
    expense.splits.forEach((split) => {
      const participant = split.userId;
      if (reports[participant]) {
        reports[participant].totalOwed += split.amountOwed;
        reports[participant].netBalance -= split.amountOwed;
      }
    });
  });

  // Process all settlements
  settlements.forEach((s) => {
    if (reports[s.paidBy]) {
      reports[s.paidBy].netBalance -= s.amount;
    }
    if (reports[s.paidTo]) {
      reports[s.paidTo].netBalance += s.amount;
    }
  });

  return reports;
}

/**
 * Debt Simplification Algorithm (Greedy matching of highest debtor and highest creditor).
 * Minimizes the total number of transactions required to settle up.
 */
export function simplifyDebts(
  netBalances: Record<string, number>,
  memberNames: Record<string, string> = {}
): SettlementTransaction[] {
  const transactions: SettlementTransaction[] = [];

  const debtors: { userId: string; amount: number }[] = [];
  const creditors: { userId: string; amount: number }[] = [];

  Object.entries(netBalances).forEach(([userId, balance]) => {
    if (balance < -1) {
      debtors.push({ userId, amount: -balance });
    } else if (balance > 1) {
      creditors.push({ userId, amount: balance });
    }
  });

  // Sort: highest debtors (descending debt), highest creditors (descending credit)
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  let debtorIdx = 0;
  let creditorIdx = 0;

  while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
    const debtor = debtors[debtorIdx];
    const creditor = creditors[creditorIdx];

    const settledAmount = Math.min(debtor.amount, creditor.amount);

    transactions.push({
      fromUser: debtor.userId,
      fromUserName: memberNames[debtor.userId] ?? "Unknown",
      toUser: creditor.userId,
      toUserName: memberNames[creditor.userId] ?? "Unknown",
      amount: settledAmount,
    });

    debtor.amount -= settledAmount;
    creditor.amount -= settledAmount;

    if (debtor.amount <= 1) {
      debtorIdx++;
    }
    if (creditor.amount <= 1) {
      creditorIdx++;
    }
  }

  return transactions;
}
