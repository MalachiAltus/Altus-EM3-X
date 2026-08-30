import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PRIVACY_POLICY, TERMS } from '@/lib/legal';
import { colors, minTapTarget, radii, spacing, type } from '@/theme/tokens';

// Public route — no auth required. This is the URL to give App Store Connect
// / Google Play Console at submission; the same text is also shown inside
// the app at Settings > Privacy Policy for logged-in users.
export default function PrivacyScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Image source={require('../../assets/images/em3-logo.png')} style={styles.logo} contentFit="contain" />
        <Text style={styles.title}>EM3 X Privacy Policy</Text>
        <Text style={styles.bodyText}>{PRIVACY_POLICY}</Text>

        <Text style={styles.title}>Terms</Text>
        <Text style={styles.bodyText}>{TERMS}</Text>

        <Link href="/login" asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>Back to Log In</Text>
          </Pressable>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.sm, maxWidth: 640, width: '100%', alignSelf: 'center' },
  logo: { width: 96, height: 82, marginBottom: spacing.md, alignSelf: 'center' },
  title: { ...type.h2, color: colors.ink, marginTop: spacing.lg, marginBottom: spacing.xs },
  bodyText: { ...type.body, color: colors.muted, lineHeight: 22 },
  button: {
    minHeight: minTapTarget,
    backgroundColor: colors.blue,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  buttonText: { color: colors.white, ...type.bodyBold },
});
