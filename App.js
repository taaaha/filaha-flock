import React, { useEffect, useMemo } from 'react';
import {
  StatusBar,
  View,
  ActivityIndicator,
  Alert,
  Text,
  StyleSheet,
  AppState,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  NavigationContainer,
  DarkTheme,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { AppProvider, useApp } from './src/contexts/AppContext';
import OnboardingScreen from './src/screens/OnboardingScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CoopDetailScreen from './src/screens/CoopDetailScreen';
import AlertsScreen from './src/screens/AlertsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import InsightsScreen from './src/screens/InsightsScreen';
import InsightDetailScreen from './src/screens/InsightDetailScreen';
import ToastHost from './src/components/Toast';
import UpdateHost from './src/components/UpdateHost';
import { UpdateProvider } from './src/contexts/UpdateContext';
import Icon from './src/components/Icon';
import Tutorial, { shouldShowTutorial } from './src/components/Tutorial';
import ErrorBoundary from './src/components/ErrorBoundary';
import { useTheme } from './src/utils/colors';
import { colors } from './src/utils/colors';
import { getPendingRoute } from './src/services/SmsService';

// Imperative navigation ref so a tapped notification can route the app
// even when it was launched cold from the background.
export const navigationRef = createNavigationContainerRef();

function consumePendingRoute() {
  getPendingRoute().then((route) => {
    if (!route || !navigationRef.isReady()) return;
    if (route === 'insights') {
      try { navigationRef.navigate('Insights'); } catch (e) {}
    }
  }).catch(() => {});
}
import {
  requestSmsPermissions,
  requestCallPermission,
  requestSendSmsPermission,
  requestNotificationPermission,
  isIgnoringBatteryOptimizations,
  requestIgnoreBatteryOptimizations,
} from './src/services/SmsService';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.accent,
    notification: colors.danger,
  },
};

function DashboardStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="DashboardHome" component={DashboardScreen} />
      <Stack.Screen name="CoopDetail" component={CoopDetailScreen} />
    </Stack.Navigator>
  );
}

function InsightsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="InsightsHome" component={InsightsScreen} />
      <Stack.Screen name="InsightDetail" component={InsightDetailScreen} />
      <Stack.Screen name="CoopDetail" component={CoopDetailScreen} />
    </Stack.Navigator>
  );
}

function TabBarLabel({ focused, color, label }) {
  return (
    <Text style={{
      color: focused ? colors.accent : colors.textSecondary,
      fontSize: 11,
      fontWeight: focused ? '800' : '600',
      marginTop: 2,
    }}>{label}</Text>
  );
}

function TabBarIcon({ name, focused }) {
  return (
    <Icon
      name={name}
      size={focused ? 24 : 22}
      color={focused ? colors.accent : colors.textSecondary}
      strokeWidth={focused ? 2.4 : 2}
    />
  );
}

function MainTabs() {
  const { t, alerts } = useApp();
  const unack = useMemo(
    () => alerts.filter((a) => !a.acknowledged && a.type === 'ALERT').length,
    [alerts]
  );

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgElevated,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          height: 70,
          paddingBottom: 10,
          paddingTop: 8,
          elevation: 0,             // no shadow → no ghost line under bar
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardStack}
        options={{
          tabBarLabel: ({ focused }) => (
            <TabBarLabel focused={focused} label={t('dashboard')} />
          ),
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="home" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Insights"
        component={InsightsStack}
        options={{
          tabBarLabel: ({ focused }) => (
            <TabBarLabel focused={focused} label={t('insightsTab')} />
          ),
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="target" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{
          tabBarBadge: unack > 0 ? unack : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.danger,
            color: '#fff',
            fontSize: 11,
            fontWeight: '800',
          },
          tabBarLabel: ({ focused }) => (
            <TabBarLabel focused={focused} label={t('alerts')} />
          ),
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="bell" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <TabBarLabel focused={focused} label={t('settings')} />
          ),
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="settings" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function StartupPermissions() {
  const { t, ready } = useApp();
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      try {
        // Request all critical permissions in sequence so the user
        // sees one prompt after another rather than missing one.
        await requestNotificationPermission();
        await requestSmsPermissions();
        await requestSendSmsPermission();
        await requestCallPermission();
        const ok = await isIgnoringBatteryOptimizations();
        if (cancelled) return;
        if (!ok) {
          Alert.alert(
            t('batteryOptimization'),
            t('batteryRationale'),
            [
              { text: t('cancel'), style: 'cancel' },
              {
                text: t('enable'),
                onPress: () => requestIgnoreBatteryOptimizations(),
              },
            ],
            { cancelable: true }
          );
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [ready, t]);
  return null;
}

function RootNav() {
  const { ready, onboardingDone, t } = useApp();
  const themeMode = useTheme(); // subscribes to theme changes
  const [showTutorial, setShowTutorial] = React.useState(false);

  React.useEffect(() => {
    if (onboardingDone) {
      shouldShowTutorial().then((should) => setShowTutorial(should));
    }
  }, [onboardingDone]);

  // A tapped notification can arrive while the app is backgrounded — catch
  // it on every foreground, not just cold start.
  React.useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') consumePendingRoute();
    });
    return () => sub.remove();
  }, []);

  if (!ready) {
    return (
      <View style={[styles.splash, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }
  // Theme is applied via the Proxy `colors` + useStyles hook. The screens
  // re-render when `themeMode` changes because they subscribe via useTheme.
  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={consumePendingRoute}
      theme={{
      ...navTheme,
      colors: {
        ...navTheme.colors,
        background: colors.bg,
        card: colors.bg,
        text: colors.textPrimary,
        border: colors.border,
        primary: colors.accent,
      },
    }}>
      <StartupPermissions />
      {onboardingDone ? <MainTabs /> : <OnboardingScreen />}
      <Tutorial
        visible={showTutorial}
        onClose={() => setShowTutorial(false)}
        t={t}
      />
      <ToastHost />
      <UpdateHost />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
          <AppProvider>
            {/* UpdateProvider is nested inside AppProvider because it reads
                useApp() (ready / onboardingDone / language) to gate and
                localize its update checks. */}
            <UpdateProvider>
              <RootNav />
            </UpdateProvider>
          </AppProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
