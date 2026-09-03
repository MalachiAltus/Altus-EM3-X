import { Link, Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useProfile } from '@/hooks/useProfile';
import { useSession } from '@/lib/auth/SessionProvider';
import { colors, minTapTarget, webContentMaxWidth } from '@/theme/tokens';

function SettingsLink() {
  return (
    <Link href="/settings" asChild>
      <Pressable hitSlop={8} style={{ minWidth: minTapTarget, minHeight: minTapTarget, alignItems: 'flex-end', justifyContent: 'center' }}>
        <Text style={{ color: colors.white, fontSize: 20 }}>⚙</Text>
      </Pressable>
    </Link>
  );
}

export default function TabsLayout() {
  const { session, loading: sessionLoading } = useSession();
  const { profile, loading: profileLoading } = useProfile();

  if (sessionLoading || (session && profileLoading)) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.navy} />
      </SafeAreaView>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (profile && profile.approval_status !== 'approved') {
    return <Redirect href="/pending-approval" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: colors.white,
        headerRight: () => <SettingsLink />,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.muted,
        sceneStyle: { backgroundColor: colors.background, width: '100%', maxWidth: webContentMaxWidth, alignSelf: 'center' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarLabel: 'Home' }} />
      <Tabs.Screen name="shifts" options={{ title: 'My Shifts', tabBarLabel: 'Shifts' }} />
      <Tabs.Screen name="clock" options={{ title: 'Clock In / Out', tabBarLabel: 'Clock' }} />
      <Tabs.Screen name="holiday" options={{ title: 'Holiday', tabBarLabel: 'Holiday' }} />
      <Tabs.Screen name="record" options={{ title: 'My Record', tabBarLabel: 'Record' }} />
    </Tabs>
  );
}
