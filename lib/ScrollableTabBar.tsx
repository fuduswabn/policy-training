import React, { useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from './theme';

interface ScrollableTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
  isTablet: boolean;
  showLabels: boolean;
}

export const ScrollableTabBar = ({
  state,
  descriptors,
  navigation,
  isTablet,
  showLabels,
}: ScrollableTabBarProps) => {
  const scrollViewRef = useRef<any>(null);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabBarBottom = Math.max(insets.bottom, spacing.sm);

  useEffect(() => {
    // Scroll to active tab
    const focusedIndex = state.index;
    const tabWidth = Math.max(width / 5, 70); // Minimum tab width
    const scrollPosition = Math.max(0, focusedIndex * tabWidth - width / 2 + tabWidth / 2);
    
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        x: scrollPosition,
        animated: true,
      });
    }, 100);
  }, [state.index, width]);

  return (
    <View
      style={{
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        height: (isTablet ? 72 : 62) + tabBarBottom,
        paddingTop: 6,
        paddingBottom: (isTablet ? 20 : 16) + tabBarBottom,
      }}
    >
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: spacing.sm }}
      >
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              preventDefault: false,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const icon = options.tabBarIcon?.({
            focused: isFocused,
            color: isFocused ? colors.primary : colors.textTertiary,
            size: 24,
          });

          const label = options.tabBarLabel || route.name;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                minWidth: 60,
              }}
            >
              {icon}
              {showLabels && (
                <Text
                  style={{
                    color: isFocused ? colors.primary : colors.textTertiary,
                    fontSize: isTablet ? 12 : 11,
                    marginTop: 4,
                    fontWeight: isFocused ? '600' : '400',
                  }}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};