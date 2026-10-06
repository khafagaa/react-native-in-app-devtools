import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { copyToClipboard } from './clipboard';
import { ApiInspector } from '../../core/api-inspector';
import { buildCopyAllFromLogEntry } from './inspector-copy';
import { buildCurlFromLogEntry } from '../../core/curl';
import type { ApiLogEntry } from '../../core/types';
import InspectorDetailTabs from './InspectorDetailTabs';
import { useInspectorTheme } from './inspector-theme';
import { MethodBadge, StatusPill, monoFont } from './inspector-ui';

type ApiRequestDetailsProps = {
  entry: ApiLogEntry;
  onBack: () => void;
};

const ApiRequestDetails = ({ entry, onBack }: ApiRequestDetailsProps) => {
  const { colors } = useInspectorTheme();

  const handleCopyCurl = useCallback(async () => {
    await copyToClipboard(buildCurlFromLogEntry(entry));
    ApiInspector.notifyCopied('cURL');
  }, [entry]);

  const handleCopyAll = useCallback(async () => {
    await copyToClipboard(buildCopyAllFromLogEntry(entry));
    ApiInspector.notifyCopied('cURL + body + response');
  }, [entry]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1
        },
        summaryRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
          flexWrap: 'wrap'
        },
        back: {
          fontSize: 12,
          color: colors.content.link,
          fontWeight: '600'
        },
        duration: {
          fontSize: 11,
          fontWeight: '600',
          color: colors.content.secondary
        },
        urlRow: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 8,
          marginBottom: 10
        },
        url: {
          flex: 1,
          fontSize: 11,
          fontFamily: monoFont,
          color: colors.content.primary,
          lineHeight: 16
        },
        copyCurlBtn: {
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 6,
          backgroundColor: colors.brand[600],
          flexShrink: 0
        },
        copyCurlText: {
          fontSize: 11,
          fontWeight: '700',
          color: colors.content.inverse
        },
        actionsRow: {
          flexDirection: 'row',
          gap: 8,
          marginBottom: 10
        },
        copyAllBtn: {
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: colors.brand[600]
        },
        copyAllText: {
          fontSize: 11,
          fontWeight: '700',
          color: colors.brand[600]
        }
      }),
    [colors]
  );

  return (
    <View style={styles.container}>
      <View style={styles.summaryRow}>
        <Pressable onPress={onBack} hitSlop={8}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <MethodBadge method={entry.method} />
        <StatusPill entry={entry} />
        {entry.durationMs != null ? (
          <Text style={styles.duration}>{entry.durationMs}ms</Text>
        ) : null}
      </View>
      <View style={styles.urlRow}>
        <Text style={styles.url} numberOfLines={3}>
          {entry.url}
        </Text>
        <Pressable
          style={styles.copyCurlBtn}
          onPress={() => void handleCopyCurl()}
          hitSlop={4}
        >
          <Text style={styles.copyCurlText}>Copy cURL</Text>
        </Pressable>
      </View>
      <View style={styles.actionsRow}>
        <Pressable
          style={styles.copyAllBtn}
          onPress={() => void handleCopyAll()}
          hitSlop={4}
        >
          <Text style={styles.copyAllText}>Copy C + B + R</Text>
        </Pressable>
      </View>
      <InspectorDetailTabs entry={entry} />
    </View>
  );
};

export default ApiRequestDetails;
