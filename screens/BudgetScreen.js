import React, { useState, useEffect, useCallback, useMemo, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, Keyboard, TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useData } from '../context/DataContext';
import { DEFAULT_BUDGET } from '../utils/storage';
import ScreenFade from '../utils/ScreenFade';

const FIELDS = [
  { key: 'income',    label: '月收入（税后）',  icon: 'wallet-outline',       color: '#10B981', desc: '每月固定工资或主要收入' },
  { key: 'essential', label: '刚需支出上限',    icon: 'home-outline',          color: '#3B82F6', desc: '房租、水电煤、伙食、交通等必须支出' },
  { key: 'savings',   label: '攒钱目标',        icon: 'trending-up-outline',   color: '#F59E0B', desc: '每月期望存入储蓄的金额' },
];

export default function BudgetScreen() {
  const navigation = useNavigation();
  const { budgets, updateBudget } = useData();
  const insets = useSafeAreaInsets();
  const [offset, setOffset] = useState(0);

  const targetDate = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + offset);
    return d;
  }, [offset]);

  const monthKey = useMemo(() => {
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, [targetDate]);
  const monthLabel = useMemo(
    () => `${targetDate.getFullYear()}年${targetDate.getMonth() + 1}月`,
    [targetDate]
  );

  const [form, setForm] = useState({ income: '', essential: '', savings: '' });

  useEffect(() => {
    const b = budgets[monthKey] || DEFAULT_BUDGET;
    setForm({
      income:    b.income    > 0 ? String(b.income)    : '',
      essential: b.essential > 0 ? String(b.essential) : '',
      savings:   b.savings   > 0 ? String(b.savings)   : '',
    });
  }, [monthKey, budgets]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => <Text style={styles.headerTitleText}>预算</Text>,
      headerTitle: () => (
        <View style={styles.monthRow}>
          <TouchableOpacity onPress={() => setOffset((o) => o - 1)} style={styles.monthBtn}>
            <Ionicons name="chevron-back" size={20} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <TouchableOpacity onPress={() => setOffset((o) => o + 1)} style={styles.monthBtn}>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
      ),
      headerTitleAlign: 'center',
      headerRight: () => <View style={styles.headerSpacer} />,
    });
  }, [navigation, monthLabel]);

  const freeAmount = useMemo(() => {
    const income    = parseFloat(form.income)    || 0;
    const essential = parseFloat(form.essential) || 0;
    const savings   = parseFloat(form.savings)   || 0;
    return income - essential - savings;
  }, [form]);

  const totalBudget = useMemo(() => {
    return (parseFloat(form.essential) || 0) + (parseFloat(form.savings) || 0);
  }, [form]);

  const handleSave = useCallback(async () => {
    const newBudget = {
      income:    parseFloat(form.income)    || 0,
      essential: parseFloat(form.essential) || 0,
      planned:   0,
      savings:   parseFloat(form.savings)   || 0,
    };
    await updateBudget(monthKey, newBudget);
    Keyboard.dismiss();
    Alert.alert('✅ 已保存', `${monthLabel}预算设置已更新，超出时将即时提醒`);
  }, [form, updateBudget, monthKey, monthLabel]);

  const freeOk = freeAmount >= 0;

  return (
    <ScreenFade>
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headerDesc}>
          设置 {monthLabel} 月度预算，记账时自动检测超支并提醒你
        </Text>

        {FIELDS.map((field) => (
          <View key={field.key} style={styles.card}>
            <View style={styles.fieldHeader}>
              <View style={[styles.iconWrap, { backgroundColor: field.color + '18' }]}>
                <Ionicons name={field.icon} size={20} color={field.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <Text style={styles.fieldDesc}>{field.desc}</Text>
              </View>
            </View>
            <View style={[styles.inputRow, { borderTopColor: field.color + '30' }]}>
              <Text style={[styles.currency, { color: field.color }]}>¥</Text>
              <TextInput
                style={styles.input}
                value={form[field.key]}
                onChangeText={(v) => setForm((f) => ({ ...f, [field.key]: v }))}
                placeholder="0"
                placeholderTextColor="#D1D5DB"
                keyboardType="decimal-pad"
              />
              {form[field.key] !== '' && (
                <TouchableOpacity onPress={() => setForm((f) => ({ ...f, [field.key]: '' }))}>
                  <Ionicons name="close-circle" size={18} color="#D1D5DB" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        {/* Summary */}
        <View style={[styles.summaryCard, {
          backgroundColor: freeOk ? '#F0FDF4' : '#FFF1F2',
          borderColor: freeOk ? '#10B981' : '#EF4444',
        }]}>
          <View style={styles.summaryRow}>
            <Ionicons
              name={freeOk ? 'checkmark-circle' : 'alert-circle'}
              size={18}
              color={freeOk ? '#10B981' : '#EF4444'}
            />
            <Text style={styles.summaryLabel}>可自由支配</Text>
            <Text style={[styles.summaryValue, { color: freeOk ? '#10B981' : '#EF4444' }]}>
              {freeOk ? '+' : '-'}¥{Math.abs(freeAmount).toFixed(0)}
            </Text>
          </View>
          <Text style={[styles.summaryDesc, { color: freeOk ? '#059669' : '#DC2626' }]}>
            {freeOk
              ? `月收入 ¥${parseFloat(form.income) || 0} - 总预算 ¥${totalBudget.toFixed(0)}`
              : '⚠️ 各类预算总和超出月收入！建议重新规划'}
          </Text>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
          <Ionicons name="save-outline" size={20} color="#fff" />
          <Text style={styles.saveBtnText}>保存 {monthLabel} 预算</Text>
        </TouchableOpacity>
      </ScrollView>
    </TouchableWithoutFeedback>
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
  headerDesc: { fontSize: 13, color: '#6B7280', marginHorizontal: 16, marginTop: 12, marginBottom: 4 },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  iconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  fieldDesc: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 4,
  },
  currency: { fontSize: 22, fontWeight: '700', marginRight: 2 },
  input: { flex: 1, fontSize: 28, fontWeight: '700', color: '#111827', padding: 0 },
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  summaryLabel: { fontSize: 14, fontWeight: '600', color: '#374151', flex: 1 },
  summaryValue: { fontSize: 22, fontWeight: '700' },
  summaryDesc: { fontSize: 12, marginLeft: 26 },
  saveBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 16,
    gap: 8,
    elevation: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
