import React, { useState, useContext } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  View,
  Text,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../lib/config';
import { AuthContext } from '../lib/auth-context';
import { colors, spacing, radius } from '../lib/theme';

type TermsType = 'terms' | 'privacy' | 'acceptable_use' | 'data_protection';

const TERMS_TYPES: { type: TermsType; title: string }[] = [
  { type: 'terms', title: 'Terms of Service' },
  { type: 'privacy', title: 'Privacy Policy' },
  { type: 'acceptable_use', title: 'Acceptable Use Policy' },
  { type: 'data_protection', title: 'Data Protection' },
];

export function TermsAndConditionsScreen({ navigation }: any) {
  const auth = useContext(AuthContext);
  const [selectedType, setSelectedType] = useState<TermsType>('terms');
  const [acknowledged, setAcknowledged] = useState(new Set<TermsType>());

  // Fetch active terms for selected type
  const activeTerms = useQuery(api.termsConditions.getActiveTerms, {
    type: selectedType,
  });

  // Check if user acknowledged current version
  const hasAcknowledged = useQuery(api.termsConditions.hasUserAcknowledgedTerms, {
    userId: auth.user?.userId || '',
    type: selectedType,
  });

  const acknowledgeTermsMutation = useMutation(api.termsConditions.acknowledgeTerms);

  if (!auth.user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.text }}>Please log in</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleAcknowledge = async () => {
    if (!activeTerms) {
      Alert.alert('Error', 'Terms not found');
      return;
    }

    try {
      await acknowledgeTermsMutation({
        userId: auth.user.userId,
        termsId: activeTerms._id,
      });

      const newAcknowledged = new Set(acknowledged);
      newAcknowledged.add(selectedType);
      setAcknowledged(newAcknowledged);

      Alert.alert('Success', 'Terms acknowledged');
    } catch (error) {
      Alert.alert('Error', 'Failed to acknowledge terms');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1, padding: spacing.lg }}>
        {/* Header */}
        <Text
          style={{
            fontSize: 24,
            fontWeight: '700',
            color: colors.text,
            marginBottom: spacing.lg,
          }}
        >
          Terms & Conditions
        </Text>

        {/* Type Selector */}
        <View style={{ marginBottom: spacing.lg }}>
          {TERMS_TYPES.map((item) => (
            <TouchableOpacity
              key={item.type}
              style={{
                padding: spacing.md,
                marginBottom: spacing.sm,
                borderRadius: radius.md,
                backgroundColor:
                  selectedType === item.type
                    ? colors.primary
                    : colors.card,
                borderWidth: 1,
                borderColor:
                  selectedType === item.type ? colors.primary : colors.border,
              }}
              onPress={() => setSelectedType(item.type)}
            >
              <Text
                style={{
                  color:
                    selectedType === item.type ? '#FFF' : colors.text,
                  fontWeight: '600',
                }}
              >
                {item.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Terms Content */}
        {activeTerms === undefined ? (
          <View style={{ justifyContent: 'center', alignItems: 'center', padding: spacing.lg }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : activeTerms ? (
          <>
            <View style={{ marginBottom: spacing.lg }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: colors.text,
                  marginBottom: spacing.sm,
                }}
              >
                {activeTerms.title}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  marginBottom: spacing.md,
                }}
              >
                Version {activeTerms.version} • Effective{' '}
                {new Date(activeTerms.effectiveDate).toLocaleDateString()}
              </Text>

              {/* Content */}
              <View
                style={{
                  padding: spacing.md,
                  backgroundColor: colors.card,
                  borderRadius: radius.md,
                  marginBottom: spacing.lg,
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    lineHeight: 20,
                    fontSize: 14,
                  }}
                >
                  {activeTerms.content}
                </Text>
              </View>

              {/* Acknowledgment Button */}
              {hasAcknowledged ? (
                <View
                  style={{
                    padding: spacing.md,
                    backgroundColor: colors.success,
                    borderRadius: radius.md,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#FFF', fontWeight: '600' }}>
                    ✓ Acknowledged
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={{
                    padding: spacing.md,
                    backgroundColor: colors.primary,
                    borderRadius: radius.md,
                    alignItems: 'center',
                  }}
                  onPress={handleAcknowledge}
                >
                  <Text style={{ color: '#FFF', fontWeight: '600' }}>
                    I Acknowledge These Terms
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        ) : (
          <View style={{ justifyContent: 'center', alignItems: 'center', padding: spacing.lg }}>
            <Text style={{ color: colors.textSecondary }}>
              No {selectedType} published yet
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}