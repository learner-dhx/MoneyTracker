import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loadTransactions, saveTransactions, loadBudget, saveBudget } from '../utils/storage';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [transactions, setTransactions] = useState([]);
  const [budget, setBudget] = useState({ income: 0, essential: 0, planned: 0, savings: 0 });

  useEffect(() => {
    Promise.all([loadTransactions(), loadBudget()]).then(([txns, bdgt]) => {
      setTransactions(txns);
      setBudget(bdgt);
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

  const updateBudget = useCallback(async (newBudget) => {
    setBudget(newBudget);
    await saveBudget(newBudget);
  }, []);

  return (
    <DataContext.Provider value={{ transactions, budget, addTransaction, deleteTransaction, updateBudget }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
