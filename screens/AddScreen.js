import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, Keyboard, TouchableWithoutFeedback, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '../context/DataContext';
import ScreenFade from '../utils/ScreenFade';

const CATEGORIES = [
  { id: 'essential', label: '刚需支出', icon: 'home-outline', color: '#3B82F6', selectedBg: '#EFF6FF', desc: '房租水电、伙食、交通等必要支出' },
  { id: 'planned',   label: '预计支出', icon: 'cart-outline', color: '#8B5CF6', selectedBg: '#F5F3FF', desc: '娱乐、购物、社交等计划内支出' },
  { id: 'other',     label: '其他支出', icon: 'ellipsis-horizontal-circle-outline', color: '#6B7280', selectedBg: '#F9FAFB', desc: '临时或计划外支出' },
];

const BUDGET_KEYS = { essential: 'essential' };
const CATEGORY_NAMES = { essential: '刚需支出', planned: '预计支出', other: '其他支出' };
const fmt = (n) => `¥${Number(n).toFixed(2)}`;

function dateToStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AddScreen() {
  const { addTransaction, transactions, budget } = useData();
  const insets = useSafeAreaInsets();

  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('essential');
  const [note, setNote] = useState('');
  const [pickerDate, setPickerDate] = useState(() => new Date());
  const [showPicker, setShowPicker] = useState(false);

  const dateStr = useMemo(() => dateToStr(pickerDate), [pickerDate]);

  const handleDateChange = useCallback((event, selected) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (event.type !== 'dismissed' && selected) setPickerDate(selected);
  }, []);

  const handleSave = useCallback(() => {
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num <= 0) {
      Alert.alert('提示', '请输入有效金额');
      return;
    }

    addTransaction({ amount: num, type, category: type === 'expense' ? category : 'other', note: note.trim(), date: dateStr });

    // Overspending check
    if (type === 'expense' && BUDGET_KEYS[category] && budget[category] > 0) {
      const monthKey = dateStr.slice(0, 7);
      const prevSpent = transactions
        .filter((t) => t.type === 'expense' && t.category === category && t.date.startsWith(monthKey))
        .reduce((s, t) => s + t.amount, 0);
      const newTotal = prevSpent + num;
      if (newTotal > budget[category]) {
        setTimeout(() => {
          Alert.alert(
            '💸 超出预算提醒',
            `本月${CATEGORY_NAMES[category]}已达 ${fmt(newTotal)}，超出预算 ${fmt(newTotal - budget[category])}`,
            [{ text: '知道了' }]
          );
        }, 300);
      } else if (newTotal > budget[category] * 0.8) {
        setTimeout(() => {
          Alert.alert(
            '⚠️ 预算预警',
            `本月${CATEGORY_NAMES[category]}已用 ${Math.round((newTotal / budget[category]) * 100)}%，请注意控制支出`,
            [{ text: '好的' }]
          );
        }, 300);
      }
    }

    setAmount('');
    setNote('');
    setPickerDate(new Date());
    Alert.alert('✅ 已记录', `${type === 'income' ? '收入' : CATEGORY_NAMES[category]} ${fmt(num)}`);
  }, [amount, type, category, note, dateStr, addTransaction, transactions, budget]);

  const selectedCat = useMemo(() => CATEGORIES.find((c) => c.id === category), [category]);

  return (
    <ScreenFade>
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Type Toggle */}
        <View style={styles.typeToggle}>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'expense' && styles.typeBtnExpense]}
            onPress={() => setType('expense')}
          >
            <Ionicons name="arrow-down-outline" size={16} color={type === 'expense' ? '#fff' : '#9CA3AF'} />
            <Text style={[styles.typeBtnText, type === 'expense' && styles.typeBtnTextActive]}>支出</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'income' && styles.typeBtnIncome]}
            onPress={() => setType('income')}
          >
            <Ionicons name="arrow-up-outline" size={16} color={type === 'income' ? '#fff' : '#9CA3AF'} />
            <Text style={[styles.typeBtnText, type === 'income' && styles.typeBtnTextActive]}>收入</Text>
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <View style={[styles.amountCard, { borderTopColor: type === 'income' ? '#10B981' : '#EF4444' }]}>
          <Text style={[styles.amountSign, { color: type === 'income' ? '#10B981' : '#EF4444' }]}>
            {type === 'income' ? '+¥' : '-¥'}
          </Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor="#D1D5DB"
            keyboardType="decimal-pad"
            autoFocus
          />
        </View>

        {/* Category (expense only) */}
        {type === 'expense' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>消费类别</Text>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catItem, category === cat.id && { borderColor: cat.color, backgroundColor: cat.selectedBg }]}
                onPress={() => setCategory(cat.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.catIcon, { backgroundColor: cat.color + '20' }]}>
                  <Ionicons name={cat.icon} size={20} color={cat.color} />
                </View>
                <View style={styles.catInfo}>
                  <Text style={[styles.catLabel, category === cat.id && { color: cat.color }]}>{cat.label}</Text>
                  <Text style={styles.catDesc}>{cat.desc}</Text>
                </View>
                {category === cat.id && <Ionicons name="checkmark-circle" size={20} color={cat.color} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Note */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>备注</Text>
          <TextInput
            style={styles.lineInput}
            value={note}
            onChangeText={setNote}
            placeholder={type === 'income' ? '收入来源（可选）' : `${selectedCat?.label || ''} 备注（可选）`}
            placeholderTextColor="#9CA3AF"
            maxLength={40}
          />
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>日期</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowPicker(true)} activeOpacity={0.7}>
            <Ionicons name="calendar-outline" size={18} color="#6B7280" />
            <Text style={styles.dateBtnText}>{dateStr}</Text>
            <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
          </TouchableOpacity>
        </View>

        {showPicker && (
          <DateTimePicker
            value={pickerDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: type === 'income' ? '#10B981' : '#3B82F6' }]}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text style={styles.saveBtnText}>保存记录</Text>
        </TouchableOpacity>
      </ScrollView>
    </TouchableWithoutFeedback>
    </ScreenFade>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  typeToggle: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9,
    gap: 5,
  },
  typeBtnExpense: { backgroundColor: '#EF4444', elevation: 2, shadowColor: '#EF4444', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  typeBtnIncome: { backgroundColor: '#10B981', elevation: 2, shadowColor: '#10B981', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  typeBtnText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  typeBtnTextActive: { color: '#fff' },
  amountCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderTopWidth: 3,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  amountSign: { fontSize: 28, fontWeight: '700', marginRight: 4 },
  amountInput: { flex: 1, fontSize: 40, fontWeight: '700', color: '#111827', paddingVertical: 18 },
  section: { marginHorizontal: 16, marginTop: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  catItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    gap: 12,
  },
  catIcon: { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  catInfo: { flex: 1 },
  catLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  catDesc: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  lineInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#111827',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
  },
  dateBtn: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
  },
  dateBtnText: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  saveBtn: {
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 16,
    gap: 8,
    elevation: 4,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
