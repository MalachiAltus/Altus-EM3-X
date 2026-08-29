import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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

import { supabase } from '@/lib/supabase/client';
import { colors, minTapTarget, radii, spacing, type } from '@/theme/tokens';

export default function AcceptInviteScreen() {
  const [status, setStatus] = useState<'checking' | 'ready' | 'error'>('checking');
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<'password' | 'name' | 'done'>('password');
  const [userId, setUserId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    async function establishSession() {
      if (Platform.OS !== 'web' || typeof window === 'undefined') {
        setError("Open the invite link from your email on this device's browser to continue.");
        setStatus('error');
        return;
      }
      const rawHash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
      const params = new URLSearchParams(rawHash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (!accessToken || !refreshToken) {
        setError('This invite link is invalid or has expired. Ask your admin to resend it.');
        setStatus('error');
        return;
      }
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) {
        setError(sessionError.message);
        setStatus('error');
        return;
      }
      setUserId(sessionData.user?.id ?? null);

      // Pre-fill from the signup request's name as a convenience — the
      // person still has to confirm/edit it in the next step, since that's
      // the whole point (nobody's typed their own name into this account
      // until now).
      if (sessionData.user?.id) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', sessionData.user.id)
          .maybeSingle();
        if (existingProfile?.full_name) {
          const [first, ...rest] = existingProfile.full_name.trim().split(/\s+/);
          setFirstName(first ?? '');
          setSurname(rest.join(' '));
        }
      }
      setStatus('ready');
    }
    establishSession();
  }, []);

  async function handleSetPassword() {
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setStep('name');
  }

  async function handleSaveName() {
    setNameError(null);
    if (!firstName.trim() || !surname.trim()) {
      setNameError('Enter your first name and surname.');
      return;
    }
    if (!userId) {
      setNameError('Your session expired — reopen the invite link and try again.');
      return;
    }
    setSavingName(true);
    const { error: nameUpdateError } = await supabase
      .from('profiles')
      .update({ full_name: `${firstName.trim()} ${surname.trim()}`, name_confirmed: true })
      .eq('id', userId);
    setSavingName(false);
    if (nameUpdateError) {
      setNameError(nameUpdateError.message);
      return;
    }
    setStep('done');
  }

  if (status === 'checking') {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={colors.navy} />
      </SafeAreaView>
    );
  }

  if (step === 'done') {
    return (
      <SafeAreaView style={styles.centered}>
        <Image source={require('../../assets/images/em3-logo.png')} style={styles.logo} contentFit="contain" />
        <Text style={styles.title}>You&apos;re all set!</Text>
        <Pressable
          onPress={() => router.replace('/')}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (step === 'name' && status === 'ready') {
    return (
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.safeArea}>
          <Image source={require('../../assets/images/em3-logo.png')} style={styles.logo} contentFit="contain" />
          <Text style={styles.title}>What&apos;s your name?</Text>
          <Text style={styles.subtitle}>This is the name your admin and colleagues will see.</Text>

          <View style={styles.form}>
            <Text style={styles.label}>First name</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              autoComplete="given-name"
              placeholder="First name"
              placeholderTextColor={colors.subtle}
            />

            <Text style={styles.label}>Surname</Text>
            <TextInput
              style={styles.input}
              value={surname}
              onChangeText={setSurname}
              autoComplete="family-name"
              placeholder="Surname"
              placeholderTextColor={colors.subtle}
            />

            {nameError && <Text style={styles.error}>{nameError}</Text>}

            <Pressable
              onPress={handleSaveName}
              disabled={savingName}
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, savingName && styles.buttonDisabled]}
            >
              {savingName ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Continue</Text>}
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.safeArea}>
        <Image source={require('../../assets/images/em3-logo.png')} style={styles.logo} contentFit="contain" />
        <Text style={styles.title}>Welcome to EM3 X</Text>
        <Text style={styles.subtitle}>Set a password to finish creating your account.</Text>

        {status === 'error' ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>New password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.subtle}
            />

            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.subtle}
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable
              onPress={handleSetPassword}
              disabled={submitting}
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, submitting && styles.buttonDisabled]}
            >
              {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Set Password &amp; Continue</Text>}
            </Pressable>
          </View>
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
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
  error: { ...type.small, color: colors.danger, marginTop: spacing.xs, textAlign: 'center' },
  button: {
    minHeight: minTapTarget,
    backgroundColor: colors.blue,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  buttonPressed: { backgroundColor: colors.blueDark },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: colors.white, ...type.bodyBold },
});
