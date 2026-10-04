import React, { useContext, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AuthContext } from '../lib/auth-context';
import { colors, radius, spacing, typography } from '../lib/theme';
import AppLogo from '../lib/AppLogo';

export default function ForgotPasswordScreen({ navigation, route }: { navigation?: any; route?: any }) {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error('ForgotPasswordScreen must be used within AuthProvider');
  }

  const [email, setEmail] = useState(route?.params?.email || '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [loading, setLoading] = useState(false);

  const handleRequestCode = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      Alert.alert('Email required', 'Enter the email address for your account.');
      return;
    }

    setLoading(true);
    try {
      const message = await auth.requestPasswordReset(trimmedEmail);
      setEmail(trimmedEmail);
      setStep('reset');
      Alert.alert('Check your email', message);
    } catch (error: any) {
      Alert.alert('Could not send code', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!/^\d{6}$/.test(code.trim())) {
      Alert.alert('Code required', 'Enter the 6-digit reset code from your email.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Password too short', 'Your new password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Please confirm your new password.');
      return;
    }

    setLoading(true);
    try {
      const message = await auth.resetPassword(email.trim().toLowerCase(), code.trim(), newPassword);
      Alert.alert('Password reset', message, [
        { text: 'Sign in', onPress: () => navigation?.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Could not reset password', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Back to sign in"
          >
            <MaterialIcons name="arrow-back" size={22} color={colors.text} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <AppLogo size={86} showText={true} showSubtitle={false} />
            <Text style={styles.title}>Reset password</Text>
            <Text style={styles.subtitle}>
              {step === 'request'
                ? 'Enter your account email and we will send a 6-digit reset code.'
                : 'Enter the code from your email and choose a new password.'}
            </Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading && step === 'request'}
              placeholderTextColor={colors.textTertiary}
            />

            {step === 'reset' && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="6-digit code"
                  value={code}
                  onChangeText={(text: string) => setCode(text.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholderTextColor={colors.textTertiary}
                />

                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="New password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    placeholderTextColor={colors.textTertiary}
                  />
                  <TouchableOpacity
                    style={styles.passwordToggle}
                    onPress={() => setShowNewPassword((current: boolean) => !current)}
                    accessibilityRole="button"
                    accessibilityLabel={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    <MaterialIcons
                      name={showNewPassword ? 'visibility-off' : 'visibility'}
                      size={22}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showNewPassword}
                  placeholderTextColor={colors.textTertiary}
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={step === 'request' ? handleRequestCode : handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.submitBtnText}>
                  {step === 'request' ? 'Send reset code' : 'Reset password'}
                </Text>
              )}
            </TouchableOpacity>

            {step === 'reset' && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleRequestCode}
                disabled={loading}
              >
                <Text style={styles.secondaryBtnText}>Send a new code</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 560,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  backText: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.lg,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  form: {
    gap: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 52,
  },
  passwordToggle: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
  secondaryBtn: {
    alignItems: 'center',
    padding: spacing.sm,
  },
  secondaryBtnText: {
    ...typography.bodyMedium,
    color: colors.primary,
    fontWeight: '600',
  },
});
