import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { submitSignupRequest } from '@/hooks/useSignupRequest';
import { colors, minTapTarget, radii, spacing, type } from '@/theme/tokens';

export default function SignupScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!fullName.trim() || !email.trim()) {
      setError('Enter your full name and email.');
      return;
    }
    setSubmitting(true);
    const { error: submitError } = await submitSignupRequest(fullName.trim(), email.trim());
    setSubmitting(false);
    if (submitError) {
      setError(submitError);
      return;
    }
    setSubmitted(true);
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.safeArea}>
        <Image source={require('../../assets/images/em3-logo.png')} style={styles.logo} contentFit="contain" />

        {submitted ? (
          <View style={styles.form}>
            <Text style={styles.title}>Request sent</Text>
            <Text style={styles.subtitle}>
              An admin needs to approve your request. You&apos;ll get an email invite to set your password once
              they do.
            </Text>
            <Link href="/login" asChild>
              <Pressable style={styles.button}>
                <Text style={styles.buttonText}>Back to Log In</Text>
              </Pressable>
            </Link>
          </View>
        ) : (
          <>
            <Text style={styles.title}>Request access</Text>
            <Text style={styles.subtitle}>An admin will review your request before you can log in.</Text>

            <View style={styles.form}>
              <Text style={styles.label}>Full name</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                autoComplete="name"
                placeholder="Your full name"
                placeholderTextColor={colors.subtle}
              />

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="you@em3kidsclub.co.uk"
                placeholderTextColor={colors.subtle}
              />

              {error && <Text style={styles.error}>{error}</Text>}

              <Pressable
                onPress={handleSubmit}
                disabled={submitting}
                style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, submitting && styles.buttonDisabled]}
              >
                {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Request Access</Text>}
              </Pressable>

              <Pressable onPress={() => router.replace('/login')} hitSlop={8}>
                <Text style={styles.hint}>Already have an account? Log in.</Text>
              </Pressable>
            </View>
          </>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  subtitle: { ...type.body, color: colors.muted, textAlign: 'center', marginBottom: spacing.md },
  form: { width: '100%', maxWidth: 360, gap: spacing.xs },
  label: { ...type.bodyBold, color: colors.ink, marginTop: spacing.sm },
  input: {
    minHeight: minTapTarget,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    color: colors.ink,
    fontSize: 16,
  },
  error: { ...type.small, color: colors.danger, marginTop: spacing.xs },
  button: {
    minHeight: minTapTarget,
    backgroundColor: colors.blue,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  buttonPressed: { backgroundColor: colors.blueDark },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: colors.white, ...type.bodyBold },
  hint: { ...type.small, color: colors.muted, textAlign: 'center', marginTop: spacing.md },
});
