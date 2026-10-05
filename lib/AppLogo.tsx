import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing } from './theme';

type Props = {
  size?: number;
  showText?: boolean;
  showSubtitle?: boolean;
  textColor?: string;
  logoUrl?: string;
};

export default function AppLogo({ size = 80, showText = true, showSubtitle = false, textColor, logoUrl }: Props) {
  const txtColor = textColor || colors.primary;
  const innerSize = Math.round(size * 0.76);
  const iconSize = Math.max(22, Math.round(size * 0.34));

  if (logoUrl) {
    return (
      <View style={logoStyles.container}>
        <Image
          source={{ uri: logoUrl }}
          style={{ width: size, height: size, borderRadius: spacing.md }}
          resizeMode="contain"
        />
        {showText && (
          <View style={logoStyles.textContainer}>
            <Text style={[logoStyles.title, { color: txtColor }]}>Policy Training</Text>
            {showSubtitle && (
              <Text style={[logoStyles.subtitle, { color: txtColor + '99' }]}>Wellness & Conflict Resolution</Text>
            )}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={logoStyles.container}>
      <View style={[logoStyles.badge, { width: size, height: size, borderRadius: size / 2 }]}>
        <View style={[logoStyles.innerBadge, { width: innerSize, height: innerSize, borderRadius: innerSize / 2 }]}>
          <MaterialIcons name="verified-user" size={iconSize} color={colors.primary} />
          <View style={logoStyles.iconRow}>
            <MaterialIcons name="balance" size={Math.max(12, Math.round(size * 0.16))} color={colors.secondary} />
            <MaterialIcons name="forum" size={Math.max(12, Math.round(size * 0.16))} color={colors.success} />
          </View>
        </View>
      </View>

      {showText && (
        <View style={logoStyles.textContainer}>
          <Text style={[logoStyles.title, { color: txtColor }]}>Policy Training</Text>
          {showSubtitle && (
            <Text style={[logoStyles.subtitle, { color: txtColor + '99' }]}>Wellness & Conflict Resolution</Text>
          )}
        </View>
      )}
    </View>
  );
}

const logoStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  innerBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  title: {
    ...typography.h2,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
    letterSpacing: 0.5,
  },
});