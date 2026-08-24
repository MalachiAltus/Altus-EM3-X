import { Redirect } from 'expo-router';
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

import { useSession } from '@/lib/auth/SessionProvider';
import { supabase } from '@/lib/supabase/client';
import { colors, minTapTarget, radii, spacing, type } from '@/theme/tokens';

export default function LoginScreen() {
  const { session, loading: sessionLoading } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!sessionLoading && session) {
    return <Redirect href="/" />;
  }

  async function handleLogin() {
    setError(null);
    if (!email || !password) {
      setError('Enter your email and password.');
      return;
    }
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (signInError) {
      setError(signInError.message);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>EM3</Text>
        </View>

        <Text style={styles.title}>Your shifts, records, and time off — all in one place</Text>
        <Text style={styles.subtitle}>
          Check your rota, clock in, request leave, and keep your details up to date.
        </Text>

        <View style={styles.form}>
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

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            placeholder="••••••••"
            placeholderTextColor={colors.subtle}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            onPress={handleLogin}
            disabled={submitting}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              submitting && styles.buttonDisabled,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Log In</Text>
            )}
          </Pressable>

          <Text style={styles.hint}>New here? Your manager will send you an invite.</Text>
        </View>
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
  logo: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoText: { color: colors.white, fontWeight: '700', fontSize: 18 },
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
