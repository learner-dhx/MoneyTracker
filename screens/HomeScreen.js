import React, { useMemo, useState, useCallback, useLayoutEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '../context/DataContext';
import ScreenFade from '../utils/ScreenFade';

const CATEGORY_COLORS = { essential: '#3B82F6', planned: '#8B5CF6', other: '#6B7280' };
const CATEGORY_LABELS = { essential: '刚需', planned: '预计', other: '其他' };

const fmt = (n) => `¥${Number(n).toFixed(2)}`;

function ProgressBar({ current, max, color, noOver }) {
  const pct = max > 0 ? Math.min(current / max, 1) : 0;
  const over = !noOver && max > 0 && current > max;
  return (
    <View style={[styles.track, over && styles.trackOver]}>
      <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: over ? '#EF4444' : color }]} />
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const { transactions, budget } = useData();
  const insets = useSafeAreaInsets();
  const [offset, setOffset] = useState(0);

  useFocusEffect(useCallback(() => {
    setOffset(0);
  }, []));

  const targetDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + offset);
    return d;
  }, [offset]);

  const monthKey = useMemo(() => targetDate.toISOString().slice(0, 7), [targetDate]);
  const monthLabel = useMemo(
    () => `${targetDate.getFullYear()}年${targetDate.getMonth() + 1}月`,
    [targetDate]
  );

  const monthTxns = useMemo(
    () => transactions.filter((t) => t.date.startsWith(monthKey)),
    [transactions, monthKey]
  );

  const stats = useMemo(() => {
    const extraIncome = monthTxns
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);
    const essentialSpent = monthTxns
      .filter((t) => t.type === 'expense' && t.category === 'essential')
      .reduce((s, t) => s + t.amount, 0);
    const plannedSpent = monthTxns
      .filter((t) => t.type === 'expense' && t.category === 'planned')
      .reduce((s, t) => s + t.amount, 0);
    const otherSpent = monthTxns
      .filter((t) => t.type === 'expense' && t.category === 'other')
      .reduce((s, t) => s + t.amount, 0);
    const totalIncome = budget.income + extraIncome;
    const totalSpent = essentialSpent + plannedSpent + otherSpent;
    const balance = totalIncome - totalSpent;
    const savingsAvailable = totalIncome - budget.essential - essentialSpent - plannedSpent - otherSpent;
    const displayTotalSpent = budget.essential + totalSpent;
    const disposable = totalIncome - displayTotalSpent - budget.savings;
    return { extraIncome, essentialSpent, plannedSpent, otherSpent, totalIncome, totalSpent, balance, savingsAvailable, displayTotalSpent, disposable };
  }, [monthTxns, budget]);

  const alerts = useMemo(() => {
    const result = [];
    if (budget.essential > 0 && stats.essentialSpent > budget.essential)
      result.push({ key: 'e', msg: `刚需支出超出预算 ${fmt(stats.essentialSpent - budget.essential)}` });
    if (budget.savings > 0 && stats.savingsAvailable < budget.savings)
      result.push({ key: 's', msg: `可攒金额不足目标，差 ${fmt(budget.savings - stats.savingsAvailable)}` });
    return result;
  }, [stats, budget]);

  const recent = useMemo(() => monthTxns.slice(0, 6), [monthTxns]);
  const budgetSet = budget.income > 0 || budget.essential > 0 || budget.savings > 0;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerLeft: () => (
        <Text style={styles.headerTitleText}>首页</Text>
      ),
      headerTitle: () => (
        <View style={styles.monthRow}>
          <TouchableOpacity onPress={() => setOffset((o) => o - 1)} style={styles.monthBtn}>
            <Ionicons name="chevron-back" size={20} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <TouchableOpacity
            onPress={() => setOffset((o) => Math.min(o + 1, 0))}
            style={styles.monthBtn}
            disabled={offset === 0}
          >
            <Ionicons name="chevron-forward" size={20} color={offset === 0 ? '#D1D5DB' : '#6B7280'} />
          </TouchableOpacity>
        </View>
      ),
      headerTitleAlign: 'center',
      headerRight: () => <View style={styles.headerSpacer} />,
    });
  }, [navigation, monthLabel, offset]);

  return (
    <ScreenFade>
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Setup Tip */}
      {!budgetSet && (
        <View style={styles.tipCard}>
          <Ionicons name="information-circle-outline" size={16} color="#3B82F6" />
          <Text style={styles.tipText}>前往「预算」标签页设置月收入和各类预算，开启花超提醒</Text>
        </View>
      )}

      {/* Alerts */}
      {alerts.map((a) => (
        <View key={a.key} style={styles.alertCard}>
          <Ionicons name="warning" size={15} color="#DC2626" />
          <Text style={styles.alertText}>{a.msg}</Text>
        </View>
      ))}

      {/* Summary */}
      <View style={styles.card}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>总收入</Text>
            <Text style={[styles.summaryValue, { color: '#10B981' }]}>{fmt(stats.totalIncome)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>总支出</Text>
            <Text style={[styles.summaryValue, { color: '#EF4444' }]}>{fmt(stats.displayTotalSpent)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>可自由支配</Text>
            <Text style={[styles.summaryValue, { color: stats.disposable >= 0 ? '#10B981' : '#EF4444' }]}>
              {fmt(stats.disposable)}
            </Text>
          </View>
        </View>
      </View>

      {/* Budget Progress */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>预算进度</Text>

        {[
          { key: 'essential', label: '刚需支出', spent: budget.essential + stats.essentialSpent, limit: budget.essential, color: '#3B82F6' },
          { key: 'savings', label: '攒钱目标', spent: Math.max(0, stats.savingsAvailable), limit: budget.savings, color: '#F59E0B', noOver: true },
        ].map((item, idx) => (
          <View key={item.key} style={[styles.budgetItem, idx === 1 && { marginBottom: 0 }]}>
            <View style={styles.budgetLabelRow}>
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <Text style={styles.budgetLabel}>{item.label}</Text>
              <Text style={styles.budgetAmt}>
                {item.reverse ? fmt(item.spent) : fmt(item.spent)} / {item.limit > 0 ? fmt(item.limit) : '未设置'}
              </Text>
            </View>
            {item.limit > 0 && (
              <ProgressBar current={item.spent} max={item.limit} color={item.color} noOver={item.noOver} />
            )}
          </View>
        ))}
      </View>

      {/* Recent Transactions */}
      {recent.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>最近记录</Text>
          {recent.map((tx, i) => (
            <View key={tx.id} style={[styles.txRow, i === recent.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[styles.txDot, {
                backgroundColor: tx.type === 'income' ? '#10B981' : CATEGORY_COLORS[tx.category] || '#6B7280',
              }]} />
              <View style={styles.txInfo}>
                <Text style={styles.txNote} numberOfLines={1}>
                  {tx.note || (tx.type === 'income' ? '收入' : CATEGORY_LABELS[tx.category])}
                </Text>
                <Text style={styles.txMeta}>{tx.date}{tx.type === 'expense' ? ` · ${CATEGORY_LABELS[tx.category]}` : ''}</Text>
              </View>
              <Text style={[styles.txAmt, { color: tx.type === 'income' ? '#10B981' : '#EF4444' }]}>
                {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={52} color="#D1D5DB" />
          <Text style={styles.emptyText}>本月暂无记录</Text>
          <Text style={styles.emptySubText}>点击下方「记账」添加第一笔</Text>
        </View>
      )}
    </ScrollView>
    </ScreenFade>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  headerTitleText: { fontSize: 17, fontWeight: '700', color: '#111827', marginLeft: 16 },
  monthRow: { flexDirection: 'row', alignItems: 'center' },
  monthBtn: { padding: 6 },
  monthLabel: { fontSize: 15, fontWeight: '600', color: '#111827', marginHorizontal: 8 },
  headerSpacer: { width: 70 },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  tipText: { color: '#1D4ED8', fontSize: 12, flex: 1 },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  alertText: { color: '#DC2626', fontSize: 13, fontWeight: '500', flex: 1 },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  divider: { width: StyleSheet.hairlineWidth, height: 40, backgroundColor: '#E5E7EB' },
  summaryLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: '700' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 14 },
  budgetItem: { marginBottom: 14 },
  budgetLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 7 },
  budgetLabel: { fontSize: 13, color: '#374151', flex: 1 },
  budgetAmt: { fontSize: 12, color: '#6B7280' },
  track: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  trackOver: { backgroundColor: '#FEE2E2' },
  fill: { height: '100%', borderRadius: 3 },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
    gap: 10,
  },
  txDot: { width: 8, height: 8, borderRadius: 4 },
  txInfo: { flex: 1 },
  txNote: { fontSize: 14, color: '#111827', fontWeight: '500' },
  txMeta: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  txAmt: { fontSize: 14, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 56, paddingBottom: 16 },
  emptyText: { fontSize: 16, color: '#9CA3AF', marginTop: 12, fontWeight: '500' },
  emptySubText: { fontSize: 13, color: '#D1D5DB', marginTop: 4 },
});
