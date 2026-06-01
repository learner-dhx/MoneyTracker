import React, { useRef, useMemo, useCallback, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, Switch,
  Alert, Dimensions, ActivityIndicator, ScrollView, SafeAreaView,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';

const W = Dimensions.get('window').width;
const CAT_LABELS = { essential: '刚需支出', planned: '预计支出', other: '其他支出' };
const CAT_COLORS = { essential: '#3B82F6', planned: '#8B5CF6', other: '#6B7280' };
const fmt      = (n) => `¥${Number(n).toFixed(2)}`;
const fmtK     = (n) => n >= 10000 ? `¥${(n / 10000).toFixed(2)}万` : `¥${Number(n).toFixed(2)}`;
const fmtKInt  = (n) => n >= 10000 ? `¥${(n / 10000).toFixed(1)}万` : `¥${Math.round(n)}`;

function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function Arrow({ dir, onPress, disabled }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{ opacity: disabled ? 0.3 : 1 }}
    >
      <Ionicons name={dir === 'left' ? 'chevron-back' : 'chevron-forward'} size={18} color="#374151" />
    </TouchableOpacity>
  );
}

function TxRow({ tx, last, compact }) {
  const label    = tx.note || (tx.type === 'income' ? '收入' : CAT_LABELS[tx.category]);
  const dotColor = tx.type === 'income' ? '#10B981' : (CAT_COLORS[tx.category] || '#6B7280');
  const amtStr   = (tx.type === 'income' ? '+' : '-') + (compact ? fmtKInt(tx.amount) : fmt(tx.amount));
  return (
    <View style={[s.txRow, last && { borderBottomWidth: 0 }]}>
      <Text style={s.txDate}>{tx.date.slice(5)}</Text>
      <View style={[s.txDot, { backgroundColor: dotColor }]} />
      <Text style={s.txNote} numberOfLines={1}>{label}</Text>
      <Text
        style={[s.txAmt, { color: tx.type === 'income' ? '#10B981' : '#EF4444' }]}
        numberOfLines={compact ? 1 : undefined}
        adjustsFontSizeToFit={compact}
        minimumFontScale={compact ? 0.78 : 1}
      >
        {amtStr}
      </Text>
    </View>
  );
}

export default function ExportModal({ visible, onClose }) {
  const { transactions } = useData();
  const cardRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [scope,   setScope]   = useState('all'); // 'all' | 'year' | 'month'
  const [compact, setCompact] = useState(false);

  // derive available years from data
  const years = useMemo(() => {
    const s = new Set(transactions.map((t) => parseInt(t.date.slice(0, 4))));
    return Array.from(s).sort((a, b) => b - a);
  }, [transactions]);

  const now = new Date();
  const [selYear,  setSelYear]  = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);

  // filtered transactions based on scope
  const filtered = useMemo(() => {
    if (scope === 'year')  return transactions.filter((t) => t.date.startsWith(`${selYear}`));
    if (scope === 'month') {
      const prefix = `${selYear}-${String(selMonth).padStart(2, '0')}`;
      return transactions.filter((t) => t.date.startsWith(prefix));
    }
    return transactions;
  }, [transactions, scope, selYear, selMonth]);

  const stats = useMemo(() => {
    const totalIncome  = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance      = totalIncome - totalExpense;
    const months       = new Set(filtered.map(t => t.date.slice(0, 7))).size;

    const catMap = {};
    filtered.filter(t => t.type === 'expense').forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    });
    const categories = ['essential', 'planned', 'other']
      .map(key => ({
        key, label: CAT_LABELS[key], color: CAT_COLORS[key], amount: catMap[key] || 0,
        pct: totalExpense > 0 ? Math.round(((catMap[key] || 0) / totalExpense) * 100) : 0,
      }))
      .filter(c => c.amount > 0);

    // 按月分组，降序
    const monthMap = {};
    filtered.forEach(t => {
      const mk = t.date.slice(0, 7);
      if (!monthMap[mk]) monthMap[mk] = [];
      monthMap[mk].push(t);
    });
    const monthGroups = Object.entries(monthMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([mk, items]) => {
        const [y, m] = mk.split('-');
        return { key: mk, label: `${y}年${parseInt(m)}月`, items };
      });

    return { totalIncome, totalExpense, balance, months, categories, monthGroups, total: filtered.length };
  }, [filtered]);

  const scopeLabel = useMemo(() => {
    if (scope === 'year')  return `${selYear}年`;
    if (scope === 'month') return `${selYear}年${selMonth}月`;
    return '全部数据';
  }, [scope, selYear, selMonth]);

  const dateStr = useMemo(() => today(), [visible]);


  const handleShare = useCallback(async () => {
    setLoading(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png' });
      onClose();
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'MoneyTracker 数据报告' });
    } catch (e) {
      Alert.alert('导出失败', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.screen}>

        {/* Toolbar */}
        <View style={s.toolbar}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={22} color="#374151" />
          </TouchableOpacity>
          <Text style={s.toolbarTitle}>导出预览</Text>
          <TouchableOpacity style={s.shareBtn} onPress={handleShare} disabled={loading}>
            {loading
              ? <ActivityIndicator size="small" color="#fff" />
              : <>
                  <Ionicons name="share-outline" size={16} color="#fff" />
                  <Text style={s.shareBtnText}>分享图片</Text>
                </>
            }
          </TouchableOpacity>
        </View>

        {/* Scope selector + 精简开关 */}
        <View style={s.scopeBar}>
          {[['all', '全部'], ['year', '按年'], ['month', '按月']].map(([v, label]) => (
            <TouchableOpacity
              key={v}
              style={[s.scopeTab, scope === v && s.scopeTabActive]}
              onPress={() => setScope(v)}
            >
              <Text style={[s.scopeTabText, scope === v && s.scopeTabTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
          <View style={s.compactRow}>
            <Text style={s.compactLabel}>精简</Text>
            <Switch
              value={compact}
              onValueChange={setCompact}
              trackColor={{ false: '#E5E7EB', true: '#6EE7B7' }}
              thumbColor={compact ? '#10B981' : '#fff'}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>
        </View>

        {/* Time picker row */}
        {scope !== 'all' && (
          <View style={s.pickerRow}>
            <Arrow
              dir="left"
              onPress={() => setSelYear((y) => y - 1)}
            />
            <Text style={s.pickerLabel}>{selYear}年</Text>
            <Arrow
              dir="right"
              onPress={() => setSelYear((y) => y + 1)}
            />

            {scope === 'month' && (
              <>
                <View style={s.pickerDivider} />
                <Arrow
                  dir="left"
                  disabled={selMonth <= 1}
                  onPress={() => setSelMonth((m) => m - 1)}
                />
                <Text style={s.pickerLabel}>{selMonth}月</Text>
                <Arrow
                  dir="right"
                  disabled={selMonth >= 12}
                  onPress={() => setSelMonth((m) => m + 1)}
                />
              </>
            )}

            <Text style={s.pickerCount}>{stats.total} 笔</Text>
          </View>
        )}

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Card (captured as image) */}
          <View ref={cardRef} style={s.card} collapsable={false}>

            {/* Header */}
            <View style={s.header}>
              <View>
                <Text style={s.appName}>MoneyTracker</Text>
                <Text style={s.subTitle}>{scopeLabel}</Text>
              </View>
              <View style={s.chip}>
                <Text style={s.chipText}>{stats.months} 个月 · {stats.total} 笔</Text>
              </View>
            </View>

            {/* Summary */}
            <View style={s.summaryRow}>
              {[
                { label: '累计收入', value: (compact ? fmtKInt : fmtK)(stats.totalIncome),  color: '#10B981' },
                { label: '累计支出', value: (compact ? fmtKInt : fmtK)(stats.totalExpense), color: '#EF4444' },
                { label: '净结余',   value: (compact ? fmtKInt : fmtK)(stats.balance),      color: stats.balance >= 0 ? '#10B981' : '#EF4444' },
              ].map(item => (
                <View key={item.label} style={s.summaryBox}>
                  <Text
                    style={[s.summaryValue, { color: item.color }]}
                    numberOfLines={compact ? 1 : undefined}
                    adjustsFontSizeToFit={compact}
                    minimumFontScale={compact ? 0.78 : 1}
                  >{item.value}</Text>
                  <Text style={s.summaryLabel}>{item.label}</Text>
                </View>
              ))}
            </View>

            {/* Category breakdown */}
            {stats.categories.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>支出分类</Text>
                {stats.categories.map(cat => (
                  <View key={cat.key} style={s.catRow}>
                    <Text style={s.catName}>{cat.label}</Text>
                    <View style={s.barTrack}>
                      <View style={[s.barFill, { width: `${Math.max(cat.pct, 2)}%`, backgroundColor: cat.color }]} />
                    </View>
                    <Text style={[s.catPct, { color: cat.color }]}>{cat.pct}%</Text>
                    <Text
                      style={s.catVal}
                      numberOfLines={compact ? 1 : undefined}
                      adjustsFontSizeToFit={compact}
                      minimumFontScale={compact ? 0.78 : 1}
                    >{(compact ? fmtKInt : fmtK)(cat.amount)}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* 记录 */}
            {stats.monthGroups.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>记录</Text>
                {scope === 'month'
                  ? stats.monthGroups[0]?.items.map((tx, i, arr) => (
                      <TxRow key={tx.id} tx={tx} last={i === arr.length - 1} compact={compact} />
                    ))
                  : stats.monthGroups.map((group) => (
                      <View key={group.key}>
                        <Text style={s.monthHeader}>{group.label}</Text>
                        {group.items.map((tx, i, arr) => (
                          <TxRow key={tx.id} tx={tx} last={i === arr.length - 1} compact={compact} />
                        ))}
                      </View>
                    ))
                }
              </View>
            )}

            {/* Empty state inside card */}
            {stats.total === 0 && (
              <View style={s.emptyCard}>
                <Text style={s.emptyCardText}>该时段暂无记录</Text>
              </View>
            )}

            {/* Footer */}
            <View style={s.footer}>
              <Text style={s.footerText}>由 MoneyTracker 生成 · {dateStr}</Text>
            </View>

          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#E5E7EB' },

  toolbar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  toolbarTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600', color: '#111827' },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#10B981', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
  },
  shareBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  scopeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  scopeTab: {
    paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  scopeTabActive: { backgroundColor: '#10B981' },
  scopeTabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  scopeTabTextActive: { color: '#fff' },
  compactRow: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 },
  compactLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },

  pickerRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20, paddingBottom: 12,
    gap: 8,
  },
  pickerLabel: { fontSize: 15, fontWeight: '700', color: '#111827', minWidth: 44, textAlign: 'center' },
  pickerDivider: { width: 1, height: 18, backgroundColor: '#E5E7EB', marginHorizontal: 4 },
  pickerCount: { marginLeft: 'auto', fontSize: 12, color: '#9CA3AF' },

  scroll: { padding: 16 },

  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', width: W - 32 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#059669', paddingHorizontal: 20, paddingVertical: 18,
  },
  appName: { fontSize: 20, fontWeight: '800', color: '#fff' },
  subTitle: { fontSize: 12, color: '#A7F3D0', marginTop: 3 },
  chip: {
    marginLeft: 'auto', backgroundColor: '#047857',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  chipText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  summaryRow: { flexDirection: 'row', gap: 8, padding: 14 },
  summaryBox: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, alignItems: 'center' },
  summaryValue: { fontSize: 15, fontWeight: '800' },
  summaryLabel: { fontSize: 10, color: '#9CA3AF', marginTop: 4 },

  section: {
    paddingHorizontal: 16, paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F3F4F6', paddingTop: 12,
  },
  sectionTitle: {
    fontSize: 10, fontWeight: '700', color: '#9CA3AF',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
  },
  monthHeader: {
    fontSize: 11, fontWeight: '700', color: '#6B7280',
    marginTop: 10, marginBottom: 4,
  },

  catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 9, gap: 6 },
  catName: { width: 58, fontSize: 11, color: '#374151' },
  barTrack: { flex: 1, height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  catPct: { width: 30, fontSize: 11, fontWeight: '700', textAlign: 'right' },
  catVal: { width: 46, fontSize: 11, color: '#6B7280', textAlign: 'right' },

  txRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F9FAFB',
  },
  txDate: { fontSize: 11, color: '#9CA3AF', width: 34 },
  txDot: { width: 6, height: 6, borderRadius: 3 },
  txNote: { flex: 1, fontSize: 13, color: '#111827' },
  txAmt: { fontSize: 13, fontWeight: '600' },

  emptyCard: { paddingVertical: 32, alignItems: 'center' },
  emptyCardText: { fontSize: 14, color: '#D1D5DB' },

  footer: {
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F3F4F6',
    paddingVertical: 12, alignItems: 'center',
  },
  footerText: { fontSize: 11, color: '#C4C4C4' },
});
