import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase/client';
import { colors, minTapTarget, radii, spacing, type } from '@/theme/tokens';

export default function PendingApprovalScreen() {
  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Image source={require('../../assets/images/em3-logo.png')} style={styles.logo} contentFit="contain" />
      <Text style={styles.title}>Awaiting approval</Text>
      <Text style={styles.subtitle}>
        Your account has been created, but an admin still needs to approve your request before you can use the
        app. Check back later.
      </Text>
      <Pressable onPress={handleSignOut} style={styles.button}>
        <Text style={styles.buttonText}>Log Out</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  logo: { width: 96, height: 82, marginBottom: spacing.md },
  title: { ...type.h2, color: colors.ink, textAlign: 'center' },
  subtitle: { ...type.body, color: colors.muted, textAlign: 'center', maxWidth: 360 },
  button: {
    minHeight: minTapTarget,
    minWidth: 160,
    backgroundColor: colors.blue,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  buttonText: { color: colors.white, ...type.bodyBold },
});
