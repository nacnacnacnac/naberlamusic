import { StyleSheet, Text, type TextProps, Platform } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Platform.OS === 'web' ? 'Funnel Display, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' : undefined,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Funnel Display, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' : undefined,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
    fontFamily: Platform.OS === 'web' ? 'Funnel Display, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' : undefined,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'web' ? 'Funnel Display, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' : undefined,
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: '#0a7ea4',
    fontFamily: Platform.OS === 'web' ? 'Funnel Display, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' : undefined,
  },
});
