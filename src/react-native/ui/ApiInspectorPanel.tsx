import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import {
  Animated,
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from 'react-native';
import { ApiInspector } from '../../core/api-inspector';
import { clearApiLogger } from '../../core/service';
import { useApiLogEntries } from '../../core/store';
import type { ApiLogEntry } from '../../core/types';
import ApiRequestDetails from './ApiRequestDetails';
import { GlobeIcon, MoonIcon, SunIcon } from './icons';
import { InspectorThemeProvider, useInspectorTheme } from './inspector-theme';
import { filterApiLogEntries, InspectorSearchField } from './inspector-ui';
import RequestCard from './RequestCard';

const FAB_ICON_SIZE = 30;
const FAB_SIZE = 44;
const EDGE_MARGIN = 16;
const TOP_SAFE_MARGIN = 44;
const BOTTOM_SAFE_MARGIN = 40;
const DRAG_THRESHOLD = 6;
const IDLE_FADE_DELAY_MS = 2500;
const IDLE_OPACITY = 0.15;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

type DraggableFabProps = {
  backgroundColor: string;
  icon?: ReactNode;
  onPress: () => void;
};

/**
 * Chat-head style FAB: draggable via PanResponder, snaps to the nearest
 * screen edge on release, and fades to a low opacity when idle. Tap vs.
 * drag is distinguished by movement distance so a plain tap still opens
 * the panel.
 */
const DraggableFab = ({
  backgroundColor,
  icon,
  onPress
}: DraggableFabProps) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const initialPosition = useMemo(
    () => ({
      x: screenWidth - FAB_SIZE - EDGE_MARGIN,
      y: screenHeight - FAB_SIZE - BOTTOM_SAFE_MARGIN - 28
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const pan = useRef(new Animated.ValueXY(initialPosition)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const positionRef = useRef(initialPosition);
  const draggedRef = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const scheduleIdleFade = useCallback(() => {
    clearIdleTimer();
    idleTimerRef.current = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: IDLE_OPACITY,
        duration: 400,
        // Must match `pan`'s driver (false) — a view cannot mix native-
        // and JS-driven animated values, and `pan` is JS-driven because
        // its position is updated via direct `setValue` calls while
        // dragging.
        useNativeDriver: false
      }).start();
    }, IDLE_FADE_DELAY_MS);
  }, [clearIdleTimer, opacity]);

  const wakeUp = useCallback(() => {
    clearIdleTimer();
    Animated.timing(opacity, {
      toValue: 1,
      duration: 150,
      useNativeDriver: false
    }).start();
  }, [clearIdleTimer, opacity]);

  useEffect(() => {
    const listenerId = pan.addListener(value => {
      positionRef.current = value;
    });
    scheduleIdleFade();
    return () => {
      pan.removeListener(listenerId);
      clearIdleTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const clampedX = clamp(
      positionRef.current.x,
      EDGE_MARGIN,
      screenWidth - FAB_SIZE - EDGE_MARGIN
    );
    const clampedY = clamp(
      positionRef.current.y,
      TOP_SAFE_MARGIN,
      screenHeight - FAB_SIZE - BOTTOM_SAFE_MARGIN
    );
    if (
      clampedX !== positionRef.current.x ||
      clampedY !== positionRef.current.y
    ) {
      pan.setValue({ x: clampedX, y: clampedY });
    }
  }, [pan, screenHeight, screenWidth]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        draggedRef.current = false;
        wakeUp();
        pan.setOffset(positionRef.current);
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_event, gesture) => {
        if (
          Math.abs(gesture.dx) > DRAG_THRESHOLD ||
          Math.abs(gesture.dy) > DRAG_THRESHOLD
        ) {
          draggedRef.current = true;
        }
        pan.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: () => {
        pan.flattenOffset();

        if (!draggedRef.current) {
          onPress();
          scheduleIdleFade();
          return;
        }

        const endX = positionRef.current.x;
        const endY = positionRef.current.y;
        const snapX =
          endX + FAB_SIZE / 2 < screenWidth / 2
            ? EDGE_MARGIN
            : screenWidth - FAB_SIZE - EDGE_MARGIN;
        const clampedY = clamp(
          endY,
          TOP_SAFE_MARGIN,
          screenHeight - FAB_SIZE - BOTTOM_SAFE_MARGIN
        );

        Animated.spring(pan, {
          toValue: { x: snapX, y: clampedY },
          useNativeDriver: false,
          friction: 8
        }).start(() => scheduleIdleFade());
      }
    })
  ).current;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        fabContainer: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: FAB_SIZE,
          height: FAB_SIZE,
          zIndex: 1000
        },
        fab: {
          borderRadius: 50,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 4,
          backgroundColor,
          width: 42,
          height: 42
        }
      }),
    [backgroundColor]
  );

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.fabContainer,
        { transform: pan.getTranslateTransform(), opacity }
      ]}
      accessibilityLabel="Open API inspector (dev). Draggable."
      accessibilityRole="button"
    >
      {icon != null ? (
        icon
      ) : (
        <View style={styles.fab}>
          <GlobeIcon size={FAB_ICON_SIZE} color="#FFFFFF" />
        </View>
      )}
    </Animated.View>
  );
};

type InspectorSheetProps = {
  onClose: () => void;
};

const InspectorSheet = ({ onClose }: InspectorSheetProps) => {
  const { colors, isDark, toggleMode } = useInspectorTheme();
  const entries = useApiLogEntries();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedEntry = useMemo(
    () => entries.find(entry => entry.id === selectedId),
    [entries, selectedId]
  );

  const filteredEntries = useMemo(
    () => filterApiLogEntries(entries, searchQuery),
    [entries, searchQuery]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        sheet: {
          height: '82%',
          backgroundColor: colors.background.default,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          paddingHorizontal: 14,
          paddingTop: 8,
          paddingBottom: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.stroke.subtle
        },
        sheetBody: {
          flex: 1
        },
        handle: {
          alignSelf: 'center',
          width: 36,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.stroke.default,
          marginBottom: 12
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 4
        },
        title: {
          fontSize: 16,
          fontWeight: '700',
          color: colors.content.primary,
          flex: 1
        },
        headerActions: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10
        },
        iconBtn: {
          // padding: 4
        },
        link: {
          fontSize: 12,
          fontWeight: '600',
          color: colors.content.link
        },
        closeBtn: {
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 6,
          backgroundColor: colors.background.muted
        },
        closeText: {
          fontSize: 12,
          fontWeight: '600',
          color: colors.content.primary
        },
        subtitle: {
          fontSize: 11,
          color: colors.content.secondary,
          marginBottom: 10
        },
        search: {
          marginBottom: 10
        },
        empty: {
          fontSize: 13,
          color: colors.content.tertiary,
          textAlign: 'center',
          paddingVertical: 32,
          lineHeight: 20
        },
        list: {
          flex: 1
        }
      }),
    [colors]
  );

  const handleSelect = useCallback((entry: ApiLogEntry) => {
    setSelectedId(entry.id);
  }, []);

  const handleClear = useCallback(() => {
    clearApiLogger();
    setSelectedId(null);
    setSearchQuery('');
  }, []);

  const handleBack = useCallback(() => {
    setSelectedId(null);
  }, []);

  const subtitle =
    searchQuery.trim().length > 0
      ? `${filteredEntries.length} of ${entries.length} requests · sensitive data hidden`
      : `${entries.length} requests · sensitive data hidden`;

  return (
    <View style={styles.sheet}>
      <View style={styles.handle} />
      <View style={styles.header}>
        <Text style={styles.title}>API Inspector</Text>
        <View style={styles.headerActions}>
          {!selectedEntry ? (
            <>
              <Pressable
                onPress={toggleMode}
                hitSlop={8}
                style={styles.iconBtn}
                accessibilityLabel={
                  isDark
                    ? 'Switch inspector to light mode'
                    : 'Switch inspector to dark mode'
                }
              >
                {isDark ? (
                  <SunIcon size={20} color={colors.content.secondary} />
                ) : (
                  <MoonIcon size={20} color={colors.content.secondary} />
                )}
              </Pressable>
              <Pressable onPress={handleClear} hitSlop={8}>
                <Text style={styles.link}>Clear</Text>
              </Pressable>
            </>
          ) : null}
          <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.sheetBody}>
        {selectedEntry ? (
          <ApiRequestDetails entry={selectedEntry} onBack={handleBack} />
        ) : (
          <>
            <Text style={styles.subtitle}>{subtitle}</Text>
            <InspectorSearchField
              value={searchQuery}
              onChangeText={setSearchQuery}
              containerStyle={styles.search}
            />
            <FlatList
              data={filteredEntries}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <RequestCard entry={item} onPress={handleSelect} />
              )}
              style={styles.list}
              nestedScrollEnabled
              ListEmptyComponent={
                <Text style={styles.empty}>
                  {entries.length === 0
                    ? 'No requests captured yet.\nHTTP traffic from wired clients will appear here.'
                    : 'No requests match your search.\nTry method, URL, or status code.'}
                </Text>
              }
              initialNumToRender={12}
              maxToRenderPerBatch={8}
              windowSize={5}
            />
          </>
        )}
      </View>
    </View>
  );
};

export type ApiInspectorPanelProps = {
  /** Overrides `ApiInspector.init({ fabColor })`. Used for default globe FAB only. */
  fabColor?: string;
  /** Custom FAB content (e.g. app SVG). Replaces default View + GlobeIcon when set. */
  fabIcon?: ReactNode;
};

const ApiInspectorPanel = ({
  fabColor: fabColorProp,
  fabIcon
}: ApiInspectorPanelProps = {}) => {
  const [open, setOpen] = useState(false);
  const resolvedFabColor =
    fabColorProp ?? ApiInspector.getConfig().fabColor ?? '#B8860B';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        modalRoot: {
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0,0,0,0.35)'
        }
      }),
    []
  );

  const handleOpen = useCallback(() => {
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  if (!ApiInspector.isEnabled()) {
    return null;
  }

  return (
    <>
      <DraggableFab
        backgroundColor={resolvedFabColor}
        icon={fabIcon}
        onPress={handleOpen}
      />

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={handleClose}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleClose}
            accessibilityLabel="Dismiss API inspector"
          />
          <InspectorThemeProvider>
            <InspectorSheet onClose={handleClose} />
          </InspectorThemeProvider>
        </View>
      </Modal>
    </>
  );
};

export default ApiInspectorPanel;
