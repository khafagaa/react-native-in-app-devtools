import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useInspectorTheme } from './inspector-theme';
import { monoFont } from './inspector-ui';

type JsonViewerProps = {
  value: unknown;
  maxHeight?: number;
  fill?: boolean;
};

function formatJson(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return value;
    }
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

type Token = {
  text: string;
  kind: 'key' | 'string' | 'number' | 'boolean' | 'null' | 'plain';
};

function tokenizeJsonLine(line: string): Token[] {
  const tokens: Token[] = [];
  const regex =
    /("(?:\\.|[^"\\])*")\s*:|("(?:\\.|[^"\\])*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b)|(\bnull\b)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: line.slice(lastIndex, match.index), kind: 'plain' });
    }

    if (match[1] && match[0].endsWith(':')) {
      tokens.push({ text: match[1], kind: 'key' });
      tokens.push({ text: ':', kind: 'plain' });
    } else if (match[2]) {
      tokens.push({ text: match[2], kind: 'string' });
    } else if (match[3]) {
      tokens.push({ text: match[3], kind: 'number' });
    } else if (match[4]) {
      tokens.push({ text: match[4], kind: 'boolean' });
    } else if (match[5]) {
      tokens.push({ text: match[5], kind: 'null' });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < line.length) {
    tokens.push({ text: line.slice(lastIndex), kind: 'plain' });
  }

  return tokens.length > 0 ? tokens : [{ text: line, kind: 'plain' }];
}

const JsonViewer = ({
  value,
  maxHeight = 220,
  fill = false
}: JsonViewerProps) => {
  const { colors, isDark } = useInspectorTheme();
  const text = useMemo(() => formatJson(value), [value]);
  const lines = useMemo(() => text.split('\n'), [text]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: fill ? { flex: 1 } : { maxHeight },
        line: {
          flexDirection: 'row',
          flexWrap: 'wrap'
        },
        text: {
          fontFamily: monoFont,
          fontSize: 10,
          lineHeight: 14
        },
        plain: { color: colors.content.primary },
        key: { color: colors.content.brand },
        string: { color: isDark ? '#81C784' : '#2e7d32' },
        number: { color: isDark ? '#64B5F6' : '#1565c0' },
        boolean: { color: isDark ? '#CE93D8' : '#6a1b9a' },
        null: { color: colors.content.tertiary }
      }),
    [colors, fill, isDark, maxHeight]
  );

  const colorForKind = (kind: Token['kind']) => {
    switch (kind) {
      case 'key':
        return styles.key;
      case 'string':
        return styles.string;
      case 'number':
        return styles.number;
      case 'boolean':
        return styles.boolean;
      case 'null':
        return styles.null;
      default:
        return styles.plain;
    }
  };

  const content = lines.map((line, index) => (
    <View key={`${index}-${line.slice(0, 8)}`} style={styles.line}>
      {tokenizeJsonLine(line).map((token, tokenIndex) => (
        <Text
          key={`${index}-${tokenIndex}`}
          style={[styles.text, colorForKind(token.kind)]}
        >
          {token.text}
        </Text>
      ))}
    </View>
  ));

  if (fill) {
    return (
      <View style={{ flex: 1 }}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ flexGrow: 1 }}
          nestedScrollEnabled
        >
          {content}
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} nestedScrollEnabled>
      {content}
    </ScrollView>
  );
};

export default JsonViewer;
