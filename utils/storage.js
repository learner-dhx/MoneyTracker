import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TRANSACTIONS: '@mt_txns',
  BUDGETS: '@mt_budgets',
};

export const DEFAULT_BUDGET = { income: 0, essential: 0, planned: 0, savings: 0 };

export async function loadTransactions() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.TRANSACTIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveTransactions(transactions) {
  await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
}

export async function loadBudgets() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.BUDGETS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function saveBudgets(budgets) {
  await AsyncStorage.setItem(KEYS.BUDGETS, JSON.stringify(budgets));
}
