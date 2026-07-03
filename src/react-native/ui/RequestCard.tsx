import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ApiLogEntry } from '../../core/types';
import { useInspectorTheme } from './inspector-theme';
import {
  formatRequestTime,
  MethodBadge,
  parseRequestUrl,
  StatusPill,
  useInspectorStyles
} from './inspector-ui';

type RequestCardProps = {
  entry: ApiLogEntry;
  selected?: boolean;
  onPress: (entry: ApiLogEntry) => void;
};

const RequestCard = ({ entry, selected, onPress }: RequestCardProps) => {
  const { colors } = useInspectorTheme();
  const inspectorText = useInspectorStyles(colors);
  const { host, path } = useMemo(() => parseRequestUrl(entry.url), [entry.url]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          paddingVertical: 12,
          paddingHorizontal: 12,
          marginBottom: 8,
          borderRadius: 10,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.stroke.subtle,
          backgroundColor: colors.background.default
        },
        cardSelected: {
          borderColor: colors.stroke.brand,
          backgroundColor: colors.background.muted
        },
        topRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8
        },
        metaRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between'
        }
      }),
    [colors]
  );

  return (
    <Pressable
      onPress={() => onPress(entry)}
      style={[styles.card, selected && styles.cardSelected]}
      accessibilityRole="button"
    >
      <View style={styles.topRow}>
        <MethodBadge method={entry.method} />
        <StatusPill entry={entry} />
        {entry.durationMs != null ? (
          <Text style={inspectorText.duration}>{entry.durationMs}ms</Text>
        ) : null}
      </View>
      <Text style={inspectorText.host} numberOfLines={1}>
        {host}
      </Text>
      <Text style={inspectorText.path} numberOfLines={2}>
        {path}
      </Text>
      <View style={styles.metaRow}>
        <Text style={inspectorText.meta}>
          {formatRequestTime(entry.startedAt)}
        </Text>
      </View>
    </Pressable>
  );
};

export default RequestCard;
