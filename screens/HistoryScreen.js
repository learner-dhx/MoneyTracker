import React, { useMemo, useCallback, useLayoutEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useData } from '../context/DataContext';
import ScreenFade from '../utils/ScreenFade';
import ExportModal from './ExportModal';

const CATEGORY_LABELS = { essential: '刚需', planned: '预计', other: '其他' };
const CATEGORY_COLORS = { essential: '#3B82F6', planned: '#8B5CF6', other: '#6B7280' };

const fmt = (n) => `¥${Number(n).toFixed(2)}`;

export default function HistoryScreen() {
  const navigation = useNavigation();
  const { transactions, deleteTransaction } = useData();
  const insets = useSafeAreaInsets();
  const [showExport, setShowExport] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => setShowExport(true)} style={{ paddingRight: 16 }}>
          <Ionicons name="share-outline" size={22} color="#6B7280" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const grouped = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      const m = t.date.slice(0, 7);
      if (!map[m]) map[m] = [];
      map[m].push(t);
    });
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, items]) => {
        const [y, m] = month.split('-');
        const expense = items.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const income  = items.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        return { key: month, label: `${y}年${parseInt(m)}月`, items, expense, income };
      });
  }, [transactions]);

  const handleDelete = useCallback(
    (id, label) => {
      Alert.alert('删除记录', `确认删除「${label}」？`, [
        { text: '取消', style: 'cancel' },
        { text: '删除', style: 'destructive', onPress: () => deleteTransaction(id) },
      ]);
    },
    [deleteTransaction]
  );

  const renderGroup = useCallback(
    ({ item }) => (
      <View style={styles.group}>
        {/* Month Header */}
        <View style={styles.groupHeader}>
          <Text style={styles.groupTitle}>{item.label}</Text>
          <View style={styles.groupStats}>
            {item.income > 0 && <Text style={styles.statIncome}>+{fmt(item.income)}</Text>}
            <Text style={styles.statExpense}>-{fmt(item.expense)}</Text>
          </View>
        </View>

        {/* Transactions */}
        {item.items.map((tx, idx) => {
          const dotColor = tx.type === 'income' ? '#10B981' : (CATEGORY_COLORS[tx.category] || '#6B7280');
          const label = tx.note || (tx.type === 'income' ? '收入' : CATEGORY_LABELS[tx.category]);
          return (
            <View
              key={tx.id}
              style={[styles.txRow, idx === item.items.length - 1 && { borderBottomWidth: 0 }]}
            >
              <View style={[styles.dot, { backgroundColor: dotColor }]} />
              <View style={styles.txInfo}>
                <Text style={styles.txLabel} numberOfLines={1}>{label}</Text>
                <Text style={styles.txMeta}>
                  {tx.date}
                  {tx.type === 'expense' ? ` · ${CATEGORY_LABELS[tx.category]}` : ''}
                </Text>
              </View>
              <Text style={[styles.txAmt, { color: tx.type === 'income' ? '#10B981' : '#EF4444' }]}>
                {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
              </Text>
              <TouchableOpacity
                style={styles.delBtn}
                onPress={() => handleDelete(tx.id, label)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={14} color="#D1D5DB" />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    ),
    [handleDelete]
  );

  if (transactions.length === 0) {
    return (
      <ScreenFade style={styles.empty}>
        <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
        <Text style={styles.emptyText}>暂无记录</Text>
        <Text style={styles.emptySubText}>在「记账」标签页添加第一笔</Text>
      </ScreenFade>
    );
  }

  return (
    <ScreenFade>
      <ExportModal visible={showExport} onClose={() => setShowExport(false)} />
      <FlatList
        data={grouped}
        keyExtractor={(item) => item.key}
        renderItem={renderGroup}
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        showsVerticalScrollIndicator={false}
      />
    </ScreenFade>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  group: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  groupTitle: { fontSize: 13, fontWeight: '700', color: '#374151' },
  groupStats: { flexDirection: 'row', gap: 10 },
  statIncome: { fontSize: 12, color: '#10B981', fontWeight: '600' },
  statExpense: { fontSize: 12, color: '#EF4444', fontWeight: '600' },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
    gap: 10,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  txInfo: { flex: 1 },
  txLabel: { fontSize: 14, color: '#111827', fontWeight: '500' },
  txMeta: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  txAmt: { fontSize: 14, fontWeight: '600' },
  delBtn: { padding: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6', paddingBottom: 80 },
  emptyText: { fontSize: 16, color: '#9CA3AF', marginTop: 12, fontWeight: '500' },
  emptySubText: { fontSize: 13, color: '#D1D5DB', marginTop: 4 },
});
