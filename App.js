import React, { useEffect, useMemo } from 'react';
import {
  StatusBar,
  View,
  ActivityIndicator,
  Alert,
  Text,
  StyleSheet,
  AppState,
  Pressable,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import SupportScreen from './src/screens/SupportScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import ToastHost from './src/components/Toast';
import UpdateHost from './src/components/UpdateHost';
import { UpdateProvider } from './src/contexts/UpdateContext';
import Icon from './src/components/Icon';
import Tutorial, { shouldShowTutorial } from './src/components/Tutorial';
import ErrorBoundary from './src/components/ErrorBoundary';
import { useTheme, barStyle } from './src/utils/colors';
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
  requestCallPermission,
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
  useTheme(); // re-render on theme change so contentStyle re-reads colors.bg
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
  useTheme(); // re-render on theme change so contentStyle re-reads colors.bg
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
      <Stack.Screen name="Reports" component={ReportsScreen} />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="SettingsHome" component={SettingsScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
    </Stack.Navigator>
  );
}

// ── Brand bottom nav ──────────────────────────────────────────────────────
// A floating warm "card" bar. The active tab expands into a filled leaf-green
// pill carrying the icon + label together; inactive tabs are quiet icons. The
// rounding + shadow + palette match the coop cards, so the whole app reads as
// one crafted product rather than a stock template.
const NAV_ONACC = '#fffdf7';
const TAB_META = {
  Dashboard: { icon: 'home',     key: 'dashboard' },
  Insights:  { icon: 'target',   key: 'insightsTab' },
  Alerts:    { icon: 'bell',     key: 'alerts' },
  Settings:  { icon: 'settings', key: 'settings' },
};

function BrandTabBar({ state, navigation }) {
  useTheme(); // re-render on theme switch
  const { t, alerts } = useApp();
  const insets = useSafeAreaInsets();
  const unack = useMemo(
    () => alerts.filter((a) => !a.acknowledged && a.type === 'ALERT').length,
    [alerts]
  );

  return (
    <View style={{
      paddingHorizontal: 14,
      paddingTop: 6,
      paddingBottom: Math.max(insets.bottom, 10),
      backgroundColor: colors.bg,
    }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgElevated,
        borderRadius: 26,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: 9,
        paddingHorizontal: 8,
        shadowColor: '#3a2c1a',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.10,
        shadowRadius: 14,
        elevation: 6,
      }}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const meta = TAB_META[route.name] || { icon: 'home', key: route.name };
          const label = t(meta.key) || route.name;
          const showBadge = route.name === 'Alerts' && unack > 0;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              android_ripple={{ color: colors.accent + '22', borderless: true, radius: 44 }}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            >
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: focused ? 15 : 12,
                paddingVertical: 9,
                borderRadius: 999,
                backgroundColor: focused ? colors.accent : 'transparent',
              }}>
                <View>
                  <Icon
                    name={meta.icon}
                    size={22}
                    color={focused ? NAV_ONACC : colors.textSecondary}
                    strokeWidth={focused ? 2.6 : 2}
                  />
                  {showBadge ? (
                    <View style={{
                      position: 'absolute', top: -6, right: -9,
                      minWidth: 16, height: 16, borderRadius: 8,
                      backgroundColor: colors.danger,
                      alignItems: 'center', justifyContent: 'center',
                      paddingHorizontal: 3,
                      borderWidth: 1.5, borderColor: colors.bgElevated,
                    }}>
                      <Text style={{ color: '#fff', fontSize: 9.5, fontWeight: '800' }}>
                        {unack > 9 ? '9+' : unack}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {focused ? (
                  <Text
                    numberOfLines={1}
                    style={{ color: NAV_ONACC, fontWeight: '800', fontSize: 12.5, marginStart: 7 }}
                  >
                    {label}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <BrandTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard" component={DashboardStack} />
      <Tab.Screen name="Insights" component={InsightsStack} />
      <Tab.Screen name="Alerts" component={AlertsScreen} />
      <Tab.Screen name="Settings" component={SettingsStack} />
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
        // Request the permissions the app actually uses now (SMS permissions
        // were removed for Google Play compliance — the device owns SMS/calls).
        await requestNotificationPermission();
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
          <StatusBar barStyle={barStyle()} backgroundColor={colors.bg} />
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

// NOTE: editing this file — or anything under src/**, index.js, or assets/** —
// on `master` triggers .github/workflows/ota-update.yml, which publishes a
// JS-only over-the-air update to the `production` channel. See RELEASE.md.
