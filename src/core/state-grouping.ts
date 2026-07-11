import type { StateLogEntry, StateLogSource } from './types';

export type ParsedStateLabel = {
  parent: string;
  child: string;
};

export type StateSourceFilter = StateLogSource | 'all';

/**
 * Splits a state log label into parent and child segments.
 * - redux/zustand: `profile/setName` → parent `profile`, child `setName`
 * - jotai: `demo:profile/name` → parent `demo:profile`, child `name`
 */
export function parseParentLabel(
  _source: StateLogSource,
  label: string
): ParsedStateLabel {
  const slashIndex = label.lastIndexOf('/');
  if (slashIndex === -1) {
    return { parent: label, child: label };
  }
  return {
    parent: label.slice(0, slashIndex),
    child: label.slice(slashIndex + 1)
  };
}

export type ParentGroup = {
  id: string;
  source: StateLogSource;
  parent: string;
  latestTimestamp: number;
  /** Child segment of the most recently updated entry in this group. */
  lastChangedChild: string;
  entries: StateLogEntry[];
};

export function filterEntriesBySource(
  entries: readonly StateLogEntry[],
  sourceFilter: StateSourceFilter
): StateLogEntry[] {
  if (sourceFilter === 'all') return [...entries];
  return entries.filter(entry => entry.source === sourceFilter);
}

export function groupStateEntriesByParent(
  entries: readonly StateLogEntry[]
): ParentGroup[] {
  const map = new Map<string, ParentGroup>();

  for (const entry of entries) {
    const { parent, child } = parseParentLabel(entry.source, entry.label);
    const id = `${entry.source}:${parent}`;
    const existing = map.get(id);

    if (existing) {
      existing.entries.push(entry);
      if (entry.timestamp > existing.latestTimestamp) {
        existing.latestTimestamp = entry.timestamp;
        existing.lastChangedChild = child;
      }
    } else {
      map.set(id, {
        id,
        source: entry.source,
        parent,
        latestTimestamp: entry.timestamp,
        lastChangedChild: child,
        entries: [entry]
      });
    }
  }

  for (const group of map.values()) {
    group.entries.sort((a, b) => b.timestamp - a.timestamp);
    const latest = group.entries[0];
    if (latest) {
      group.lastChangedChild = parseParentLabel(
        latest.source,
        latest.label
      ).child;
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => b.latestTimestamp - a.latestTimestamp
  );
}

export function filterParentGroups(
  groups: readonly ParentGroup[],
  query: string
): ParentGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...groups];
  return groups.filter(group => {
    const childLabels = group.entries
      .map(entry => parseParentLabel(entry.source, entry.label).child)
      .join(' ');
    const haystack = [
      group.parent,
      group.source,
      group.lastChangedChild,
      childLabels,
      String(group.entries.length)
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}
