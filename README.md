# In-App Devtools

A flexible, in-app devtools library for React Native. Inspect HTTP traffic with redaction-by-default, search, a draggable FAB, and adapter-first integration for Axios and RTK Query. **State logger coming soon.**

## Demo

![API Inspector Demo](./docs/demo.gif)

Short walkthrough at 1.5x: draggable FAB, request list, search, detail tabs, redaction, and copy cURL.

See [DEMO.md](./DEMO.md) for the recording script.

## Installation

```bash
npm install react-native-in-app-devtools
```

OR

```bash
yarn add react-native-in-app-devtools
```

### Dependencies

Make sure you have these peer dependencies installed:

```bash
# npm
npm install axios expo-clipboard react-native-svg

# or yarn
yarn add axios expo-clipboard react-native-svg
```

## Quick Start

### 1. Initialize (once, before render)

```typescript
// App.tsx or index.ts
import { ApiInspector } from 'react-native-in-app-devtools';

ApiInspector.init({
  enabled: __DEV__,
  maxEntries: 50
});
```

**Copy feedback is optional.** The inspector copies to the clipboard but does not show a toast by default. Wire `onCopied` if you want user-visible confirmation:

```typescript
import Toast from 'react-native-toast-message';
import { ApiInspector } from 'react-native-in-app-devtools';

ApiInspector.init({
  enabled: __DEV__,
  maxEntries: 50,
  onCopied: label =>
    Toast.show({
      type: label === 'Nothing to copy' ? 'info' : 'success',
      text1:
        label === 'Nothing to copy' ? 'Nothing to copy' : `Copied ${label}`,
      visibilityTime: 1500
    })
});
```

`react-native-toast-message` is not a library peer dependency — use any snackbar or toast you prefer, or omit `onCopied` entirely.

### 2. Render the panel

```tsx
import { ApiInspectorPanel } from 'react-native-in-app-devtools';

// App root (behind __DEV__)
<ApiInspectorPanel />;
```

That's it for the UI. To see network traffic, do the one-time HTTP client setup below (Step 3). Zero props on the panel by default.

### Panel props (optional visuals)

```tsx
<ApiInspectorPanel
  fabColor="#B8860B"
  fabIcon={<YourSvgIcon width={22} height={22} />}
/>
```

| Prop       | Type        | Description                                                        |
| ---------- | ----------- | ------------------------------------------------------------------ |
| `fabColor` | `string`    | Overrides `init({ fabColor })`. Applies to default globe FAB only. |
| `fabIcon`  | `ReactNode` | Custom FAB content. Replaces default `View` + globe when set.      |

### Copy feedback (optional)

The library copies via `expo-clipboard` internally. To show feedback after copy (cURL, request body, headers, etc.), pass `onCopied` in `init()` — see Step 1 above.

- `onCopied` receives labels such as `'cURL'`, `'Request'`, `'Response'`, `'Headers'`, or `'Nothing to copy'`
- Render `<Toast />` (or your toast root) at the app root **above** any fullscreen overlays so it stays visible

### 3. Connect your HTTP client (one-time)

Adapter wiring is **one-time**, typically in your HTTP client factory — not at every API call site. If your factory already attaches the interceptor, you are done. Manual per-instance wrapping is only for clients created **outside** that factory.

#### Using Axios?

**Shared factory (recommended)** — attach once; every instance created there is logged automatically:

```typescript
// createHttpClient.ts — one place for your whole app
import axios from 'axios';
import { attachApiInspectorInterceptor } from 'react-native-in-app-devtools/axios';
import { ApiInspector } from 'react-native-in-app-devtools';

export function createHttpClient({ baseURL, ...options }) {
  const instance = axios.create({ baseURL, ...options });

  if (ApiInspector.isEnabled()) {
    attachApiInspectorInterceptor(instance, baseURL);
  }

  return instance;
}
```

If all your API modules use this factory, you don't need anything else for Axios.

**Ad-hoc instances (manual)** — only if you create Axios instances outside your shared factory:

```typescript
import axios from 'axios';
import { ApiInspector } from 'react-native-in-app-devtools';

export const client = ApiInspector.withAxios(axios.create({ baseURL: '/api' }));
```

#### Using RTK Query?

If your app uses RTK Query, wrap your inner `fetchBaseQuery` with `ApiInspector.withBaseQuery()`. Your outer `baseQuery` (401 handling, session refresh, etc.) stays unchanged.

> **`withBaseQuery()` is coming soon.** Until it ships, RTK Query traffic will not appear in the inspector. The pattern below is the intended integration.

```typescript
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ApiInspector } from 'react-native-in-app-devtools';

// Inner query — wrapped for logging
const instrumentedFetch = ApiInspector.withBaseQuery(
  fetchBaseQuery({ baseUrl: '/api' })
);

export const api = createApi({
  reducerPath: 'api',
  // Outer wrapper — your auth/session logic stays here
  baseQuery: async (args, api, extraOptions) => {
    const result = await instrumentedFetch(args, api, extraOptions);
    // handle 401, refresh token, etc.
    return result;
  },
  endpoints: () => ({})
});
```

## API Reference

### `ApiInspector.init(config)`

| Option       | Type                      | Default   | Description                                                                                                             |
| ------------ | ------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------- |
| `enabled`    | `boolean`                 | `false`   | When false, interceptors and UI are no-ops                                                                              |
| `maxEntries` | `number`                  | `50`      | Max in-memory log entries                                                                                               |
| `onCopied`   | `(label: string) => void` | —         | Optional callback after copy actions. Not a built-in toast — wire your own UI (e.g. `Toast.show`) if you want feedback. |
| `fabColor`   | `string`                  | `#B8860B` | FAB background color override                                                                                           |

### `ApiInspector` methods

| Method                          | Description                                         |
| ------------------------------- | --------------------------------------------------- |
| `isEnabled()`                   | Whether the inspector is active                     |
| `withAxios(instance, baseURL?)` | Attach interceptor to an Axios instance             |
| `withBaseQuery(baseQuery)`      | Wrap RTK `fetchBaseQuery` for logging (coming soon) |
| `notifyCopied(label)`           | Trigger the `onCopied` callback                     |

## Exports

```typescript
import {
  // Core API
  ApiInspector,
  isApiInspectorEnabled,

  // UI
  ApiInspectorPanel,
  ApiInspectorPanelProps,

  // Store hook
  useApiLogEntries,

  // Utilities
  buildCurlFromLogEntry,
  attachApiInspectorInterceptor,

  // Types
  ApiInspectorConfig,
  ApiLogEntry,
  ApiLogStatus
} from 'react-native-in-app-devtools';

// Axios subpath
import { attachApiInspectorInterceptor } from 'react-native-in-app-devtools/axios';
```

## License

MIT
