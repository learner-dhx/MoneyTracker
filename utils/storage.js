import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TRANSACTIONS: '@mt_txns',
  BUDGET: '@mt_budget',
};

const DEFAULT_BUDGET = { income: 0, essential: 0, planned: 0, savings: 0 };

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

export async function loadBudget() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.BUDGET);
    return raw ? JSON.parse(raw) : DEFAULT_BUDGET;
  } catch {
    return DEFAULT_BUDGET;
  }
}

export async function saveBudget(budget) {
  await AsyncStorage.setItem(KEYS.BUDGET, JSON.stringify(budget));
}
