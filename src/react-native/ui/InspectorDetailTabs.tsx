import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { ApiInspector } from '../../core/api-inspector';
import type { ApiLogEntry } from '../../core/types';
import { useInspectorTheme } from './inspector-theme';
import JsonViewer from './JsonViewer';

export type DetailTab =
  | 'response'
  | 'body'
  | 'reqHeaders'
  | 'resHeaders'
  | 'error';

type TabConfig = {
  id: DetailTab;
  label: string;
};

const BASE_TABS: TabConfig[] = [
  { id: 'response', label: 'Response' },
  { id: 'body', label: 'Body' },
  { id: 'reqHeaders', label: 'Req Headers' },
  { id: 'resHeaders', label: 'Res Headers' }
];

type TabPayload = {
  value: unknown;
  emptyMessage: string;
  copyLabel: string;
  isEmpty: boolean;
};

function stringifyForCopy(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function isEmptyValue(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (typeof value === 'object' && !Array.isArray(value)) {
    return Object.keys(value as Record<string, unknown>).length === 0;
  }
  return false;
}

function getTabPayload(entry: ApiLogEntry, tab: DetailTab): TabPayload {
  switch (tab) {
    case 'response':
      return {
        value: entry.response?.body,
        emptyMessage: 'No response yet',
        copyLabel: 'response',
        isEmpty: !entry.response || isEmptyValue(entry.response.body)
      };
    case 'body':
      return {
        value: entry.request.body,
        emptyMessage: 'No request body',
        copyLabel: 'request body',
        isEmpty: isEmptyValue(entry.request.body)
      };
    case 'reqHeaders':
      return {
        value: entry.request.headers,
        emptyMessage: 'No request headers',
        copyLabel: 'request headers',
        isEmpty: isEmptyValue(entry.request.headers)
      };
    case 'resHeaders':
      return {
        value: entry.response?.headers,
        emptyMessage: 'No response headers',
        copyLabel: 'response headers',
        isEmpty: !entry.response || isEmptyValue(entry.response.headers)
      };
    case 'error':
      return {
        value: entry.error,
        emptyMessage: 'No error details',
        copyLabel: 'error',
        isEmpty: !entry.error
      };
  }
}

type InspectorDetailTabsProps = {
  entry: ApiLogEntry;
};

const InspectorDetailTabs = ({ entry }: InspectorDetailTabsProps) => {
  const { colors } = useInspectorTheme();
  const tabs = useMemo(
    () =>
      entry.error
        ? [...BASE_TABS, { id: 'error' as const, label: 'Error' }]
        : BASE_TABS,
    [entry.error]
  );
  const [activeTab, setActiveTab] = useState<DetailTab>('response');

  const payload = useMemo(
    () => getTabPayload(entry, activeTab),
    [entry, activeTab]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1
        },
        tabBar: {
          marginBottom: 10,
          flexGrow: 0,
          flexShrink: 0,
          maxHeight: 40
        },
        tabBarContent: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingRight: 4
        },
        tab: {
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: 8,
          backgroundColor: colors.background.muted,
          alignSelf: 'center'
        },
        tabActive: {
          backgroundColor: colors.brand[600]
        },
        tabText: {
          fontSize: 12,
          fontWeight: '600',
          color: colors.content.secondary
        },
        tabTextActive: {
          color: colors.content.inverse
        },
        panel: {
          flex: 1,
          borderRadius: 10,
          backgroundColor: colors.background.subtle,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.stroke.subtle,
          overflow: 'hidden'
        },
        panelToolbar: {
          flexDirection: 'row',
          justifyContent: 'flex-end',
          paddingHorizontal: 10,
          paddingTop: 8,
          paddingBottom: 4
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
        panelBody: {
          flex: 1,
          paddingHorizontal: 10,
          paddingBottom: 10
        },
        empty: {
          fontSize: 12,
          color: colors.content.tertiary,
          paddingVertical: 16
        }
      }),
    [colors]
  );

  const handleCopy = useCallback(async () => {
    if (payload.isEmpty) {
      ApiInspector.notifyCopied('Nothing to copy');
      return;
    }

    await Clipboard.setStringAsync(stringifyForCopy(payload.value));
    ApiInspector.notifyCopied(payload.copyLabel);
  }, [payload]);

  return (
    <View style={styles.root}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
        nestedScrollEnabled
      >
        {tabs.map(tab => {
          const isActive = tab.id === activeTab;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[styles.tab, isActive && styles.tabActive]}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.panel}>
        <View style={styles.panelToolbar}>
          <Pressable style={styles.copyBtn} onPress={() => void handleCopy()}>
            <Text style={styles.copyText}>Copy</Text>
          </Pressable>
        </View>
        <View style={styles.panelBody}>
          {payload.isEmpty ? (
            <Text style={styles.empty}>{payload.emptyMessage}</Text>
          ) : (
            <JsonViewer value={payload.value} fill />
          )}
        </View>
      </View>
    </View>
  );
};

export default InspectorDetailTabs;
