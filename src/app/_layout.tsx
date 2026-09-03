import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionProvider, useSession } from '@/lib/auth/SessionProvider';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Sentry } from '@/lib/sentry';
import { colors } from '@/theme/tokens';

function PushRegistrar() {
  const { session } = useSession();
  usePushNotifications(session?.user?.id ?? null);
  return null;
}

function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <PushRegistrar />
        <StatusBar style="light" />
        <OfflineBanner />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.navy },
            headerTintColor: colors.white,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="admin" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="signup" options={{ headerShown: false }} />
          <Stack.Screen name="accept-invite" options={{ headerShown: false }} />
          <Stack.Screen name="pending-approval" options={{ headerShown: false }} />
          <Stack.Screen name="privacy" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        </Stack>
      </SessionProvider>
    </SafeAreaProvider>
  );
}

// Sentry.wrap() is safe unconditionally — it's a passive instrumentation
// wrapper and does nothing until Sentry.init() has actually run (guarded by
// EXPO_PUBLIC_SENTRY_DSN in @/lib/sentry). Keeping this call unconditional
// (rather than choosing between two different default exports) matters:
// Metro's HMR/fast-refresh module resolution was flaky with a ternary here.
export default Sentry.wrap(RootLayout);
