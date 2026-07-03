import { useMemo } from 'react';
import {
  I18nManager,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle
} from 'react-native';
import type { ApiLogEntry } from '../../core/types';
import type { InspectorColors } from './inspector-theme';
import { useInspectorTheme } from './inspector-theme';
import { SearchIcon } from './icons';

export const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace'
});

export function parseRequestUrl(url: string): { host: string; path: string } {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.host,
      path: `${parsed.pathname}${parsed.search}`
    };
  } catch {
    const withoutProtocol = url.replace(/^https?:\/\//i, '');
    const slashIndex = withoutProtocol.indexOf('/');
    if (slashIndex === -1) {
      return { host: withoutProtocol || url, path: '/' };
    }
    return {
      host: withoutProtocol.slice(0, slashIndex),
      path: withoutProtocol.slice(slashIndex)
    };
  }
}

type MethodBadgeProps = {
  method: string;
};

const METHOD_COLORS: Record<string, { bg: string; text: string }> = {
  GET: { bg: '#E3F2FD', text: '#1565C0' },
  POST: { bg: '#E8F5E9', text: '#2E7D32' },
  PUT: { bg: '#FFF3E0', text: '#EF6C00' },
  PATCH: { bg: '#FFF8E1', text: '#F9A825' },
  DELETE: { bg: '#FFEBEE', text: '#C62828' }
};

const METHOD_COLORS_DARK: Record<string, { bg: string; text: string }> = {
  GET: { bg: '#1A237E', text: '#90CAF9' },
  POST: { bg: '#1B5E20', text: '#A5D6A7' },
  PUT: { bg: '#E65100', text: '#FFCC80' },
  PATCH: { bg: '#F57F17', text: '#FFF59D' },
  DELETE: { bg: '#B71C1C', text: '#EF9A9A' }
};

export const MethodBadge = ({ method }: MethodBadgeProps) => {
  const { isDark } = useInspectorTheme();
  const normalized = method.toUpperCase();
  const palette = isDark ? METHOD_COLORS_DARK : METHOD_COLORS;
  const colors = palette[normalized] ?? {
    bg: isDark ? '#424242' : '#F5F5F5',
    text: isDark ? '#E0E0E0' : '#616161'
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        badge: {
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 6,
          backgroundColor: colors.bg
        },
        text: {
          fontSize: 10,
          fontWeight: '800',
          color: colors.text,
          letterSpacing: 0.3
        }
      }),
    [colors.bg, colors.text]
  );

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{normalized}</Text>
    </View>
  );
};

type StatusPillProps = {
  entry: ApiLogEntry;
};

function resolveStatusStyle(
  entry: ApiLogEntry,
  isDark: boolean
): { label: string; bg: string; text: string } {
  if (entry.status === 'pending') {
    return {
      label: '…',
      bg: isDark ? '#424242' : '#EEEEEE',
      text: isDark ? '#BDBDBD' : '#757575'
    };
  }

  if (entry.status === 'failed' && entry.statusCode == null) {
    return {
      label: 'ERR',
      bg: isDark ? '#4A148C' : '#F3E5F5',
      text: isDark ? '#CE93D8' : '#6A1B9A'
    };
  }

  const code = entry.statusCode ?? 0;
  if (code >= 200 && code < 300) {
    return {
      label: String(code),
      bg: isDark ? '#1B5E20' : '#E8F5E9',
      text: isDark ? '#A5D6A7' : '#2E7D32'
    };
  }
  if (code >= 400 && code < 500) {
    return {
      label: String(code),
      bg: isDark ? '#E65100' : '#FFF3E0',
      text: isDark ? '#FFCC80' : '#EF6C00'
    };
  }
  if (code >= 500) {
    return {
      label: String(code),
      bg: isDark ? '#B71C1C' : '#FFEBEE',
      text: isDark ? '#EF9A9A' : '#C62828'
    };
  }

  return {
    label: entry.status === 'failed' ? 'ERR' : String(code || '—'),
    bg: isDark ? '#424242' : '#F5F5F5',
    text: isDark ? '#E0E0E0' : '#616161'
  };
}

export const StatusPill = ({ entry }: StatusPillProps) => {
  const { isDark } = useInspectorTheme();
  const status = resolveStatusStyle(entry, isDark);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        pill: {
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 6,
          backgroundColor: status.bg
        },
        text: {
          fontSize: 10,
          fontWeight: '700',
          color: status.text
        }
      }),
    [status.bg, status.text]
  );

  return (
    <View style={styles.pill}>
      <Text style={styles.text}>{status.label}</Text>
    </View>
  );
};

type InspectorSearchFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export const InspectorSearchField = ({
  value,
  onChangeText,
  placeholder = 'Search URL, method, status…',
  containerStyle
}: InspectorSearchFieldProps) => {
  const { colors } = useInspectorTheme();
  const isRTL = I18nManager.isRTL;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          height: 40,
          columnGap: 8,
          borderRadius: 8,
          borderWidth: StyleSheet.hairlineWidth,
          paddingHorizontal: 10,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          borderColor: colors.stroke.default,
          backgroundColor: colors.background.subtle
        },
        input: {
          flex: 1,
          padding: 0,
          margin: 0,
          fontSize: 12,
          textAlign: isRTL ? 'right' : 'left',
          color: colors.content.primary
        }
      }),
    [colors, isRTL]
  );

  return (
    <View style={[styles.container, containerStyle]}>
      <SearchIcon color={colors.content.secondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.content.tertiary}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
    </View>
  );
};

export function formatRequestTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export function filterApiLogEntries(
  entries: readonly ApiLogEntry[],
  query: string
): ApiLogEntry[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [...entries];

  return entries.filter(entry => {
    const haystack = [
      entry.method,
      entry.url,
      entry.statusCode != null ? String(entry.statusCode) : '',
      entry.status,
      entry.error?.message ?? ''
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(trimmed);
  });
}

export function useInspectorStyles(colors: InspectorColors) {
  return useMemo(
    () =>
      StyleSheet.create({
        host: {
          fontSize: 11,
          fontWeight: '600',
          color: colors.content.primary
        },
        path: {
          fontSize: 10,
          fontFamily: monoFont,
          color: colors.content.secondary,
          marginTop: 2
        },
        meta: {
          fontSize: 9,
          color: colors.content.tertiary,
          marginTop: 6
        },
        duration: {
          fontSize: 10,
          fontWeight: '600',
          color: colors.content.tertiary,
          marginLeft: 'auto'
        }
      }),
    [colors]
  );
}
