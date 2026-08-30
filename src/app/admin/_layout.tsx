import { Redirect, router, Tabs } from 'expo-router';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useProfile } from '@/hooks/useProfile';
import { colors, minTapTarget, webContentMaxWidth } from '@/theme/tokens';

function BackToStaffLink() {
  return (
    <Pressable
      hitSlop={8}
      onPress={() => router.replace('/(tabs)')}
      style={{ minWidth: minTapTarget, minHeight: minTapTarget, justifyContent: 'center', paddingLeft: 12, paddingRight: 4 }}
    >
      <Text style={{ color: colors.white, fontSize: 15 }}>‹ My Shifts</Text>
    </Pressable>
  );
}

export default function AdminLayout() {
  const { profile, loading } = useProfile();

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.navy} />
      </SafeAreaView>
    );
  }

  if (!profile || (profile.role !== 'admin' && profile.role !== 'manager')) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: colors.white,
        headerLeft: () => <BackToStaffLink />,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.muted,
        sceneStyle: { backgroundColor: colors.background, width: '100%', maxWidth: webContentMaxWidth, alignSelf: 'center' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarLabel: 'Dashboard' }} />
      <Tabs.Screen name="rota" options={{ title: 'Rota Builder', tabBarLabel: 'Rota' }} />
      <Tabs.Screen name="approvals" options={{ title: 'Approvals Inbox', tabBarLabel: 'Approvals' }} />
      <Tabs.Screen name="staff" options={{ title: 'Single Central Record', tabBarLabel: 'Staff' }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports & Payroll', tabBarLabel: 'Reports' }} />
    </Tabs>
  );
}
