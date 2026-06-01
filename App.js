import React, { useRef } from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { DataProvider } from './context/DataContext';
import HomeScreen from './screens/HomeScreen';
import AddScreen from './screens/AddScreen';
import BudgetScreen from './screens/BudgetScreen';
import HistoryScreen from './screens/HistoryScreen';
import ProfileScreen from './screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const SCREENS = [
  { name: 'Home',    component: HomeScreen,    label: '首页',    icon: 'home',       iconOff: 'home-outline' },
  { name: 'Add',     component: AddScreen,     label: '记账',    icon: 'add-circle', iconOff: 'add-circle-outline' },
  { name: 'Budget',  component: BudgetScreen,  label: '预算',    icon: 'pie-chart',  iconOff: 'pie-chart-outline' },
  { name: 'History', component: HistoryScreen, label: '历史',    icon: 'list',       iconOff: 'list-outline' },
  { name: 'Profile', component: ProfileScreen, label: '我的',    icon: 'person',     iconOff: 'person-outline' },
];

const TAB_ORDER = SCREENS.map((s) => s.name);

export default function App() {
  const navigationRef = useNavigationContainerRef();

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 20,
      onPanResponderRelease: (_, { dx }) => {
        if (!navigationRef.isReady()) return;
        const current = navigationRef.getCurrentRoute()?.name;
        const idx = TAB_ORDER.indexOf(current);
        if (dx < -60 && idx < TAB_ORDER.length - 1) {
          navigationRef.navigate(TAB_ORDER[idx + 1]);
        } else if (dx > 60 && idx > 0) {
          navigationRef.navigate(TAB_ORDER[idx - 1]);
        }
      },
    })
  ).current;

  return (
    <SafeAreaProvider>
      <DataProvider>
        <StatusBar style="dark" />
        <View style={styles.root} {...panResponder.panHandlers}>
          <NavigationContainer ref={navigationRef}>
            <Tab.Navigator
              screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                  const screen = SCREENS.find((s) => s.name === route.name);
                  return <Ionicons name={focused ? screen.icon : screen.iconOff} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#10B981',
                tabBarInactiveTintColor: '#9CA3AF',
                tabBarStyle: styles.tabBar,
                tabBarLabelStyle: styles.tabLabel,
                headerStyle: styles.header,
                headerTitleStyle: styles.headerTitle,
                headerShadowVisible: false,
              })}
            >
              {SCREENS.map((s) => (
                <Tab.Screen
                  key={s.name}
                  name={s.name}
                  component={s.component}
                  options={{ title: s.label, tabBarLabel: s.label, headerShown: s.name !== 'Profile' }}
                />
              ))}
            </Tab.Navigator>
          </NavigationContainer>
        </View>
      </DataProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    height: 62,
    paddingBottom: 8,
    paddingTop: 4,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  header: { backgroundColor: '#fff' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
});
