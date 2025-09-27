import type { PropsWithChildren, ReactElement } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { ThemedView } from '@/components/ThemedView';

type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: { dark: string; light: string };
}>;

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
}: Props) {
  return (
    <ThemedView style={styles.container}>
      <ScrollView>
        <ThemedView style={[styles.header, { backgroundColor: headerBackgroundColor.dark }]}>
          {headerImage}
        </ThemedView>
        <ThemedView style={styles.content}>{children}</ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 250,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    padding: 32,
    gap: 16,
    overflow: 'hidden',
  },
});