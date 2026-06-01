import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, Image, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useData } from '../context/DataContext';
import ScreenFade from '../utils/ScreenFade';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const NAME_KEY   = '@mt_username';
const AVATAR_KEY = '@mt_avatar';
const BG_KEY     = '@mt_avatar_bg'; // color string or 'image'
const BG_IMG_KEY = '@mt_avatar_bg_img';

const THEMES = [
  { id: 'green',    color: '#10B981' },
  { id: 'emerald',  color: '#059669' },
  { id: 'blue',     color: '#3B82F6' },
  { id: 'indigo',   color: '#6366F1' },
  { id: 'purple',   color: '#8B5CF6' },
  { id: 'pink',     color: '#EC4899' },
  { id: 'orange',   color: '#F97316' },
  { id: 'slate',    color: '#475569' },
];

function Avatar({ photoUri, name, size = 80 }) {
  const initials = name?.trim() ? name.trim().slice(0, 2).toUpperCase() : '我';
  if (photoUri) {
    return (
      <Image
        source={{ uri: photoUri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#E5E7EB' }}
      />
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.36, color: '#fff', fontWeight: '800', letterSpacing: 1 }}>{initials}</Text>
    </View>
  );
}

function Row({ icon, label, value, onPress, color = '#374151', danger }) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <Ionicons name={icon} size={18} color={danger ? '#EF4444' : '#9CA3AF'} style={styles.rowIcon} />
      <Text style={[styles.rowLabel, danger && { color: '#EF4444' }]}>{label}</Text>
      {value != null && <Text style={[styles.rowValue, { color }]} numberOfLines={1}>{value}</Text>}
      {onPress && <Ionicons name="chevron-forward" size={15} color="#D1D5DB" style={{ marginLeft: 4 }} />}
    </TouchableOpacity>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      {title && <Text style={styles.sectionTitle}>{title}</Text>}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

export default function ProfileScreen() {
  const { clearAll } = useData();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [bgColor, setBgColor] = useState('#10B981');
  const [bgImageUri, setBgImageUri] = useState(null);

  const [editVisible, setEditVisible] = useState(false);
  const [bgPickerVisible, setBgPickerVisible] = useState(false);
  const [draft, setDraft] = useState('');
  const [updateMsg, setUpdateMsg] = useState('');

  useEffect(() => {
    AsyncStorage.multiGet([NAME_KEY, AVATAR_KEY, BG_KEY, BG_IMG_KEY]).then((pairs) => {
      const map = Object.fromEntries(pairs.map(([k, v]) => [k, v]));
      if (map[NAME_KEY])   setName(map[NAME_KEY]);
      if (map[AVATAR_KEY]) setPhotoUri(map[AVATAR_KEY]);
      if (map[BG_KEY])     setBgColor(map[BG_KEY]);
      if (map[BG_IMG_KEY]) setBgImageUri(map[BG_IMG_KEY]);
    });
  }, []);


  const pickPhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('需要权限', '请在系统设置中允许访问相册'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: false, quality: 0.8,
      });
      if (result.canceled) return;
      const dest = FileSystem.documentDirectory + 'avatar_' + Date.now() + '.jpg';
      if (photoUri) FileSystem.deleteAsync(photoUri, { idempotent: true }).catch(() => {});
      await FileSystem.copyAsync({ from: result.assets[0].uri, to: dest });
      setPhotoUri(dest);
      await AsyncStorage.setItem(AVATAR_KEY, dest);
    } catch (e) {
      Alert.alert('设置失败', e.message);
    }
  }, [photoUri]);

  const removePhoto = useCallback(async () => {
    if (photoUri) FileSystem.deleteAsync(photoUri, { idempotent: true }).catch(() => {});
    setPhotoUri(null);
    await AsyncStorage.removeItem(AVATAR_KEY);
  }, [photoUri]);

  const pickBgImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('需要权限', '请在系统设置中允许访问相册'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: false, quality: 0.7,
      });
      if (result.canceled) return;
      const dest = FileSystem.documentDirectory + 'avatar_bg_' + Date.now() + '.jpg';
      if (bgImageUri) FileSystem.deleteAsync(bgImageUri, { idempotent: true }).catch(() => {});
      await FileSystem.copyAsync({ from: result.assets[0].uri, to: dest });
      setBgImageUri(dest);
      setBgColor(null);
      await AsyncStorage.multiSet([[BG_IMG_KEY, dest], [BG_KEY, '']]);
      setBgPickerVisible(false);
    } catch (e) {
      Alert.alert('设置失败', e.message);
    }
  }, [bgImageUri]);

  const selectThemeColor = useCallback(async (color) => {
    setBgColor(color);
    setBgImageUri(null);
    if (bgImageUri) FileSystem.deleteAsync(bgImageUri, { idempotent: true }).catch(() => {});
    await AsyncStorage.multiSet([[BG_KEY, color], [BG_IMG_KEY, '']]);
    setBgPickerVisible(false);
  }, [bgImageUri]);

  const openEdit = useCallback(() => { setDraft(name); setEditVisible(true); }, [name]);
  const saveName = useCallback(async () => {
    const trimmed = draft.trim();
    setName(trimmed);
    await AsyncStorage.setItem(NAME_KEY, trimmed);
    setEditVisible(false);
  }, [draft]);

  const checkUpdate = useCallback(() => {
    setUpdateMsg('');
    setTimeout(() => setUpdateMsg(`当前已是最新版本 v${APP_VERSION}`), 800);
  }, []);

  const handleClearData = useCallback(() => {
    Alert.alert('清除所有数据', '将删除全部记账记录和预算设置，此操作不可恢复。', [
      { text: '取消', style: 'cancel' },
      { text: '确认清除', style: 'destructive', onPress: () => clearAll?.() },
    ]);
  }, [clearAll]);

  return (
    <ScreenFade>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 头像区域 */}
        <View style={[styles.profileHeader, { paddingTop: insets.top + 24 }]}>
          {/* header 背景图 */}
          {bgImageUri ? (
            <Image source={{ uri: bgImageUri }} style={[StyleSheet.absoluteFill, { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: bgColor || '#fff' }]} />
          )}

          {/* 右上角换背景按钮 */}
          <TouchableOpacity
            style={[styles.bgEditBtn, { top: insets.top + 10 }]}
            onPress={() => setBgPickerVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="color-palette-outline" size={20} color={bgImageUri || (bgColor && bgColor !== '#fff') ? '#fff' : '#9CA3AF'} />
          </TouchableOpacity>

          <TouchableOpacity onPress={pickPhoto} activeOpacity={0.8}>
            <Avatar photoUri={photoUri} name={name || '我'} size={84} />
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={11} color="#fff" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={openEdit} activeOpacity={0.7} style={{ marginTop: 14 }}>
            <Text style={[styles.displayName, { color: bgImageUri || (bgColor && bgColor !== '#fff') ? '#fff' : '#111827' }]}>
              {name || '点击设置昵称'}
            </Text>
          </TouchableOpacity>
        </View>

        <Section title="用户信息">
          <Row icon="person-outline"         label="昵称"   value={name || '未设置'} onPress={openEdit} />
          <Row icon="phone-portrait-outline" label="设备存储" value="本地" />
          <Row icon="lock-closed-outline"    label="隐私"    value="数据不上传" />
        </Section>

        <Section title="设置">
          <Row icon="shield-outline" label="数据存储"   value="仅本地 AsyncStorage" />
          <Row icon="trash-outline"  label="清除所有数据" onPress={handleClearData} danger />
        </Section>

        <Section title="关于">
          <Row icon="information-circle-outline" label="当前版本" value={`v${APP_VERSION}`} />
          <Row icon="refresh-outline"            label="检查更新" onPress={checkUpdate} />
        </Section>

        {updateMsg ? <Text style={styles.updateMsg}>{updateMsg}</Text> : null}
      </ScrollView>

      {/* 编辑昵称弹窗 */}
      <Modal visible={editVisible} transparent statusBarTranslucent animationType="fade" onRequestClose={() => setEditVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setEditVisible(false)}>
          <TouchableOpacity style={styles.editModal} activeOpacity={1} onPress={() => {}}>
            <Text style={styles.editTitle}>编辑昵称</Text>
            <TextInput
              style={styles.editInput}
              value={draft}
              onChangeText={setDraft}
              placeholder="请输入昵称"
              placeholderTextColor="#D1D5DB"
              maxLength={12}
              autoFocus
            />
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.editCancel} onPress={() => setEditVisible(false)}>
                <Text style={styles.editCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editSave} onPress={saveName}>
                <Text style={styles.editSaveText}>保存</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 背景主题选择 — 直接绝对定位，避免 Modal 抖动 */}
      {bgPickerVisible && (
        <TouchableOpacity style={styles.overlayAbs} activeOpacity={1} onPress={() => setBgPickerVisible(false)}>
          <TouchableOpacity style={styles.bgModal} activeOpacity={1} onPress={() => {}}>
            <Text style={styles.editTitle}>选择背景</Text>

            <Text style={styles.bgSubtitle}>预设颜色</Text>
            <View style={styles.colorGrid}>
              {THEMES.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => selectThemeColor(t.color)}
                  style={[styles.colorSwatch, { backgroundColor: t.color }]}
                  activeOpacity={0.75}
                >
                  {bgColor === t.color && !bgImageUri && (
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.bgSubtitle}>自定义背景图片</Text>
            <TouchableOpacity style={styles.bgImageBtn} onPress={pickBgImage} activeOpacity={0.7}>
              {bgImageUri ? (
                <Image source={{ uri: bgImageUri }} style={styles.bgImagePreview} resizeMode="cover" />
              ) : (
                <View style={styles.bgImagePlaceholder}>
                  <Ionicons name="image-outline" size={24} color="#9CA3AF" />
                  <Text style={styles.bgImagePlaceholderText}>从相册选择</Text>
                </View>
              )}
              {bgImageUri && (
                <View style={styles.bgImageOverlay}>
                  <Ionicons name="camera" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 12, marginLeft: 4 }}>重新选择</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.editCancel} onPress={() => setBgPickerVisible(false)}>
              <Text style={styles.editCancelText}>取消</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </ScreenFade>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },

  profileHeader: {
    alignItems: 'center',
    paddingBottom: 28,
    marginBottom: 4,
    overflow: 'hidden',
  },
  bgEditBtn: {
    position: 'absolute', top: 12, right: 12,
  },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: '#059669', borderRadius: 10, width: 22, height: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  displayName: { fontSize: 18, fontWeight: '700', color: '#111827' },

  section: { marginHorizontal: 16, marginTop: 20 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: '#9CA3AF',
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8,
  },
  card: { backgroundColor: '#fff', borderRadius: 14, elevation: 1, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6',
  },
  rowIcon: { marginRight: 10 },
  rowLabel: { flex: 1, fontSize: 14, color: '#374151' },
  rowValue: { fontSize: 13, fontWeight: '500', color: '#6B7280', maxWidth: 160 },

  updateMsg: { textAlign: 'center', fontSize: 13, color: '#10B981', marginTop: 16, fontWeight: '500' },

  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  overlayAbs: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 100,
  },
  editModal: { width: 300, backgroundColor: '#fff', borderRadius: 16, padding: 24 },
  bgModal:   { width: 320, backgroundColor: '#fff', borderRadius: 20, padding: 24 },
  editTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  editInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#111827',
  },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  editCancel: {
    flex: 1, paddingVertical: 11, borderRadius: 10,
    backgroundColor: '#F3F4F6', alignItems: 'center', marginTop: 8,
  },
  editCancelText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  editSave: {
    flex: 1, paddingVertical: 11, borderRadius: 10,
    backgroundColor: '#10B981', alignItems: 'center',
  },
  editSaveText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  bgSubtitle: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginBottom: 10, marginTop: 4 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  colorSwatch: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },

  bgImageBtn: {
    height: 80, borderRadius: 12, overflow: 'hidden',
    backgroundColor: '#F3F4F6', marginBottom: 12,
  },
  bgImagePreview: { width: '100%', height: '100%' },
  bgImagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  bgImagePlaceholderText: { fontSize: 13, color: '#9CA3AF' },
  bgImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row',
  },
});
