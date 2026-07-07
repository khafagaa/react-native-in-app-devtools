import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { ApiInspector } from '../../core/api-inspector';
import type { StateLogEntry } from '../../core/types';
import { isEmptyCopyValue, stringifyForCopy } from './inspector-copy';
import { useInspectorTheme } from './inspector-theme';
import { monoFont } from './inspector-ui';

type StateLogCardProps = {
  entry: StateLogEntry;
  onPress?: (entry: StateLogEntry) => void;
  selected?: boolean;
};

const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  redux: { bg: '#EDE7F6', text: '#4527A0' },
  zustand: { bg: '#E0F2F1', text: '#00695C' },
  jotai: { bg: '#FFF3E0', text: '#E65100' }
};

export function filterStateLogEntries(
  entries: readonly StateLogEntry[],
  query: string
): StateLogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...entries];
  return entries.filter(entry => {
    const haystack = [
      entry.label,
      entry.source,
      entry.changedKeys?.join(' '),
      JSON.stringify(entry.after ?? ''),
      JSON.stringify(entry.before ?? '')
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export const StateLogCard = ({
  entry,
  onPress,
  selected
}: StateLogCardProps) => {
  const { colors } = useInspectorTheme();
  const palette = SOURCE_COLORS[entry.source] ?? {
    bg: colors.background.muted,
    text: colors.content.secondary
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          padding: 12,
          borderRadius: 10,
          backgroundColor: selected
            ? colors.background.muted
            : colors.background.default,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.stroke.subtle,
          marginBottom: 8
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginBottom: 4
        },
        badge: {
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 6,
          backgroundColor: palette.bg
        },
        badgeText: {
          fontSize: 10,
          fontWeight: '700',
          color: palette.text,
          textTransform: 'uppercase'
        },
        label: {
          flex: 1,
          fontSize: 13,
          fontWeight: '600',
          color: colors.content.primary
        },
        count: {
          fontSize: 10,
          fontWeight: '700',
          color: palette.text,
          backgroundColor: palette.bg,
          paddingHorizontal: 6,
          paddingVertical: 1,
          borderRadius: 8,
          overflow: 'hidden'
        },
        time: {
          fontSize: 10,
          color: colors.content.tertiary
        },
        keys: {
          fontSize: 11,
          color: colors.content.secondary,
          fontFamily: monoFont
        }
      }),
    [colors, palette.bg, palette.text, selected]
  );

  const content = (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{entry.source}</Text>
        </View>
        <Text style={styles.label} numberOfLines={1}>
          {entry.label}
        </Text>
        {entry.count && entry.count > 1 ? (
          <Text style={styles.count}>{`×${entry.count}`}</Text>
        ) : null}
        <Text style={styles.time}>
          {new Date(entry.timestamp).toLocaleTimeString()}
        </Text>
      </View>
      {entry.changedKeys?.length ? (
        <Text style={styles.keys} numberOfLines={1}>
          {entry.changedKeys.join(', ')}
        </Text>
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={() => onPress(entry)} accessibilityRole="button">
      {content}
    </Pressable>
  );
};

export function StateLogDetails({
  entry,
  onBack
}: {
  entry: StateLogEntry;
  onBack: () => void;
}) {
  const { colors } = useInspectorTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1 },
        scrollContent: {
          paddingBottom: 24
        },
        back: {
          fontSize: 12,
          fontWeight: '600',
          color: colors.content.link,
          marginBottom: 10
        },
        title: {
          fontSize: 15,
          fontWeight: '700',
          color: colors.content.primary,
          marginBottom: 8
        },
        section: {
          marginBottom: 12
        },
        sectionHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 4
        },
        sectionTitle: {
          fontSize: 11,
          fontWeight: '700',
          color: colors.content.secondary,
          textTransform: 'uppercase'
        },
        copyBtn: {
          paddingHorizontal: 12,
          paddingVertical: 5,
          borderRadius: 6,
          backgroundColor: colors.background.muted,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.stroke.subtle
        },
        copyText: {
          fontSize: 11,
          fontWeight: '600',
          color: colors.content.primary
        },
        body: {
          fontSize: 12,
          fontFamily: monoFont,
          color: colors.content.primary,
          lineHeight: 18
        }
      }),
    [colors]
  );

  const format = (value: unknown) => {
    if (value == null) return '—';
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  };

  const handleCopy = useCallback(async (value: unknown, label: string) => {
    if (isEmptyCopyValue(value)) {
      ApiInspector.notifyCopied('Nothing to copy');
      return;
    }
    await Clipboard.setStringAsync(stringifyForCopy(value));
    ApiInspector.notifyCopied(label);
  }, []);

  return (
    <View style={styles.root}>
      <Pressable onPress={onBack} hitSlop={8}>
        <Text style={styles.back}>← Back</Text>
      </Pressable>
      <Text style={styles.title}>{entry.label}</Text>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled
        showsVerticalScrollIndicator
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Before</Text>
            <Pressable
              style={styles.copyBtn}
              onPress={() => void handleCopy(entry.before, 'Before')}
            >
              <Text style={styles.copyText}>Copy</Text>
            </Pressable>
          </View>
          <Text style={styles.body}>{format(entry.before)}</Text>
        </View>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>After</Text>
            <Pressable
              style={styles.copyBtn}
              onPress={() => void handleCopy(entry.after, 'After')}
            >
              <Text style={styles.copyText}>Copy</Text>
            </Pressable>
          </View>
          <Text style={styles.body}>{format(entry.after)}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
