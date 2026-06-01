import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loadTransactions, saveTransactions, loadBudgets, saveBudgets } from '../utils/storage';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState({});

  useEffect(() => {
    Promise.all([loadTransactions(), loadBudgets()]).then(([txns, bdgts]) => {
      setTransactions(txns);
      setBudgets(bdgts);
    });
  }, []);

  const addTransaction = useCallback((transaction) => {
    const entry = { ...transaction, id: Date.now().toString() };
    setTransactions((prev) => {
      const next = [entry, ...prev];
      saveTransactions(next);
      return next;
    });
    return entry;
  }, []);

  const deleteTransaction = useCallback((id) => {
    setTransactions((prev) => {
      const next = prev.filter((t) => t.id !== id);
      saveTransactions(next);
      return next;
    });
  }, []);

  const updateBudget = useCallback(async (monthKey, newBudget) => {
    setBudgets((prev) => {
      const next = { ...prev, [monthKey]: newBudget };
      saveBudgets(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setTransactions([]);
    setBudgets({});
    saveTransactions([]);
    saveBudgets({});
  }, []);

  // mode: 'replace' | 'merge'
  const importData = useCallback((txns, bdgts, mode) => {
    if (mode === 'replace') {
      setTransactions(txns);
      setBudgets(bdgts);
      saveTransactions(txns);
      saveBudgets(bdgts);
    } else {
      // merge: 去重（按 id），预算以导入为准覆盖同月
      setTransactions((prev) => {
        const existingIds = new Set(prev.map((t) => t.id));
        const merged = [...prev, ...txns.filter((t) => !existingIds.has(t.id))];
        saveTransactions(merged);
        return merged;
      });
      setBudgets((prev) => {
        const merged = { ...prev, ...bdgts };
        saveBudgets(merged);
        return merged;
      });
    }
  }, []);

  return (
    <DataContext.Provider value={{ transactions, budgets, addTransaction, deleteTransaction, updateBudget, clearAll, importData }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
