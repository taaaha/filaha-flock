import React, { useEffect, useMemo } from 'react';
import {
  StatusBar,
  View,
  ActivityIndicator,
  Alert,
  Text,
  StyleSheet,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  NavigationContainer,
  DarkTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { AppProvider, useApp } from './src/contexts/AppContext';
import OnboardingScreen from './src/screens/OnboardingScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CoopDetailScreen from './src/screens/CoopDetailScreen';
import AlertsScreen from './src/screens/AlertsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import GuideScreen from './src/screens/GuideScreen';
import ToastHost from './src/components/Toast';
import Icon from './src/components/Icon';
import Tutorial, { shouldShowTutorial } from './src/components/Tutorial';
import ErrorBoundary from './src/components/ErrorBoundary';
import { useTheme } from './src/utils/colors';
import { colors } from './src/utils/colors';
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
        name="Guide"
        component={GuideScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <TabBarLabel focused={focused} label={t('guide')} />
          ),
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="book" focused={focused} />
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
    <NavigationContainer theme={{
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
            <RootNav />
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
