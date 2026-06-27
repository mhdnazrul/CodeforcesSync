# Browser Abstraction Layer — Architecture QA

## 1. browserApi Implementation

**Verdict: ✅ Production-ready (with one note)**

`src/platform/browser.ts`:

```ts
export const browserApi: typeof chrome =
  (globalThis as { browser?: typeof chrome }).browser ??
  globalThis.chrome;
```

| Property | Status |
|----------|--------|
| Alias vs Wrapper | **Alias.** Direct reference — no Proxy, no wrapping, zero overhead. |
| Promise compatibility | ✅ Chrome MV3 and Firefox both return Promises from the same namespaces. |
| Fallback order | ✅ `browser` first (Firefox), `chrome` second (Chrome/Edge/Opera). |
| TypeScript cast | ✅ `(globalThis as { browser?: typeof chrome }).browser` — standard pattern in cross-browser extension tooling. |

---

## 2. TypeScript Typing

**Verdict: ✅ Safe — no unsafe casts, no runtime type mismatches**

| Check | Status | Notes |
|-------|--------|-------|
| Types preserved | ✅ | `browserApi` is `typeof chrome` — exact same types as original `chrome.*` |
| Unsafe `any` casts | ✅ None | The `globalThis as { browser?: typeof chrome }` cast is the only cast; it's a standard pattern |
| Runtime type mismatches | ✅ None | All runtime calls go through the same underlying API object |
| Compile-time type reference | ✅ | `chrome.scripting.ScriptInjection` in `adapter.ts:55` is a compile-time type assertion only, erased at runtime |

---

## 3. Runtime Compatibility

| Browser | Status | Notes |
|---------|--------|-------|
| Chrome MV3 | ✅ Full | `globalThis.chrome` is the Chrome API — identical behavior |
| Edge (Chromium) | ✅ Full | Same `chrome.*` API surface as Chrome |
| Firefox | ✅ Will resolve | `globalThis.browser` is the Firefox WebExtensions API — Promise-based, same namespace structure |
| Opera (Chromium) | ✅ Full | Same as Chrome |
| Brave (Chromium) | ✅ Full | Same as Chrome |

---

## 4. Per-API Verification

### `runtime.sendMessage`

| Aspect | Status |
|--------|--------|
| Chrome MV3 | ✅ `chrome.runtime.sendMessage(msg)` → `Promise<any>` |
| Firefox | ✅ `browser.runtime.sendMessage(msg)` → `Promise<any>` |
| Response pattern | ✅ `await browserApi.runtime.sendMessage(msg)` captures response |
| Fire-and-forget | ✅ `.catch(() => {})` works identically |
| Files | `background.ts:140`, `ApiContext.tsx:85,133`, `RepositorySetupScreen.tsx:61`, `adapter.ts:63` |

### `runtime.onMessage`

| Aspect | Status |
|--------|--------|
| Chrome MV3 | ✅ `chrome.runtime.onMessage.addListener(cb)` — returns `true` to keep channel open |
| Firefox | ✅ `browser.runtime.onMessage.addListener(cb)` — can return Promise directly or `true` |
| Listener cleanup | ✅ `removeListener` works identically |
| Files | `background.ts:144`, `ApiContext.tsx:80-81`, `adapter.ts:68,71` |

### `storage.local`

| Aspect | Status |
|--------|--------|
| Chrome MV3 | ✅ `chrome.storage.local.get/set/clear` → Promise-based |
| Firefox | ✅ `browser.storage.local.get/set/clear` → Promise-based |
| Files | `cfstats/index.ts:35,45`, `adapter.ts:9,13,17` |

### `storage.session`

| Aspect | Status |
|--------|--------|
| Chrome MV3 | ✅ `chrome.storage.session.get/set/remove` → Promise-based (Chrome 102+) |
| Firefox | ✅ `browser.storage.session.get/set/remove` → Promise-based (Firefox 128+) |
| Files | `background.ts:87,129,137` |

### `tabs.create`

| Aspect | Status |
|--------|--------|
| Chrome MV3 | ✅ `chrome.tabs.create(props)` → `Promise<Tab>` |
| Firefox | ✅ `browser.tabs.create(props)` → `Promise<Tab>` |
| Files | `Header.tsx:16,21`, `adapter.ts:23` |

### `tabs.query`

| Aspect | Status |
|--------|--------|
| Chrome MV3 | ✅ `chrome.tabs.query(info)` → `Promise<Tab[]>` |
| Firefox | ✅ `browser.tabs.query(info)` → `Promise<Tab[]>` |
| Files | `CodeforcesAuthScreen.tsx:45`, `adapter.ts:31` |

### `scripting.executeScript`

| Aspect | Status |
|--------|--------|
| Chrome MV3 | ✅ `chrome.scripting.executeScript(inj)` → `Promise<InjectionResult[]>` |
| Firefox | ✅ `browser.scripting.executeScript(inj)` → `Promise<InjectionResult[]>` (Firefox 105+) |
| Type assertion | ✅ `as chrome.scripting.ScriptInjection` — compile-time only, runtime object is plain JS |
| Files | `CodeforcesAuthScreen.tsx:59`, `adapter.ts:54` |

### `identity.launchWebAuthFlow`

| Aspect | Status |
|--------|--------|
| Chrome MV3 | ✅ `chrome.identity.launchWebAuthFlow(options)` → `Promise<string>` |
| Firefox | ✅ `browser.identity.launchWebAuthFlow(options)` → `Promise<string>` |
| Files | `background.ts:110` |

### `identity.getRedirectURL`

| Aspect | Status |
|--------|--------|
| Chrome MV3 | ✅ `chrome.identity.getRedirectURL(path)` → string (synchronous) |
| Firefox | ✅ `browser.identity.getRedirectURL(path)` → string (synchronous) |
| Files | `background.ts:96` |

### `alarms`

| API | Status |
|-----|--------|
| `alarms.create` | ✅ Synchronous in both Chrome and Firefox — `adapter.ts:78` |
| `alarms.get` | ⚠️ See Issue #1 below — `adapter.ts:83` |
| `alarms.onAlarm` | ✅ Event listener — `adapter.ts:91` |

---

## 5. Issues Found

### Issue #1 — Medium: Callback-based `alarms.get` is not Firefox-compatible

**Location:** `src/browser/chrome/adapter.ts:82-85`

```ts
get(name: string): Promise<Alarm | undefined> {
  return new Promise((resolve) => {
    browserApi.alarms.get(name, (alarm) => {
      resolve(alarm ? { name: alarm.name } : undefined);
    });
  });
}
```

**Problem:** The Firefox `browser.*` API does not accept callbacks. `browser.alarms.get(name)` returns `Promise<Alarm>` directly. Passing a callback function as the second argument would be silently ignored — the inner Promise would never resolve, causing a hang.

**Chrome MV3:** `chrome.alarms.get(name, callback)` works (supports both callback and Promise forms).

**Firefox:** `browser.alarms.get(name)` returns a Promise — callback form is not part of the `browser.*` API standard.

**Impact:** When running on Firefox (where `browserApi` = `browser`), calling `ChromeAlarmsService.get()` would hang indefinitely. The scheduler uses this method to check alarm state.

**Fix (for Firefox implementation):** Replace with Promise form:

```ts
get(name: string): Promise<Alarm | undefined> {
  return browserApi.alarms.get(name).then(alarm =>
    alarm ? { name: alarm.name } : undefined
  );
}
```

**Note:** The original code also used a callback with `chrome.alarms.get` — on Firefox, the `chrome.*` compatibility shim supported callbacks. The abstraction layer changes the resolution target from `chrome` (callback-supporting shim) to `browser` (Promise-only native API), triggering this incompatibility.

### Issue #2 — Low: `storage.session` version gate needed for Firefox

**Location:** `src/background/background.ts:87,129,137`

`browser.storage.session` requires Firefox 128+ (July 2024). Firefox < 128 would throw `TypeError: browser.storage.session is undefined` when OAuth is initiated.

**Fix (for Firefox implementation):** Add a feature-check guard or document minimum Firefox version (128+).

### Issue #3 — Low: `scripting` version gate needed for Firefox

**Location:** `src/ui/screens/CodeforcesAuthScreen.tsx:59`, `src/browser/chrome/adapter.ts:54`

`browser.scripting` requires Firefox 105+. Firefox < 105 would fail at `executeScript` calls.

**Fix (for Firefox implementation):** Document minimum Firefox version (105+).

---

## 6. Async Behavior

**Verdict: ✅ No regressions**

| Pattern | Chrome | Firefox | Status |
|---------|--------|---------|--------|
| `await api.method()` | ✅ Promise | ✅ Promise | ✅ |
| `api.method().catch()` | ✅ Promise | ✅ Promise | ✅ |
| `api.method()` fire-and-forget | ✅ void | ✅ void | ✅ |
| Event listeners | ✅ Same | ✅ Same | ✅ |

All `await` and `.catch()` usage is preserved exactly — only the `chrome` prefix was changed to `browserApi`.

---

## 7. Callback vs Promise Compatibility

**Verdict: ✅ Only one callback-based call remains (Issue #1)**

| API | Form Used | Chrome | Firefox | Status |
|-----|-----------|--------|---------|--------|
| `storage.local.get` | Promise | ✅ | ✅ | ✅ |
| `storage.local.set` | Promise | ✅ | ✅ | ✅ |
| `storage.local.clear` | Promise | ✅ | ✅ | ✅ |
| `storage.session.set` | Promise | ✅ | ✅ (128+) | ✅ |
| `storage.session.get` | Promise | ✅ | ✅ (128+) | ✅ |
| `storage.session.remove` | Promise | ✅ | ✅ (128+) | ✅ |
| `tabs.create` | Promise | ✅ | ✅ | ✅ |
| `tabs.get` | Promise | ✅ | ✅ | ✅ |
| `tabs.query` | Promise | ✅ | ✅ | ✅ |
| `tabs.remove` | Promise | ✅ | ✅ | ✅ |
| `tabs.onUpdated` | Event | ✅ | ✅ | ✅ |
| `scripting.executeScript` | Promise | ✅ | ✅ (105+) | ✅ |
| `runtime.sendMessage` | Promise | ✅ | ✅ | ✅ |
| `runtime.onMessage` | Event | ✅ | ✅ | ✅ |
| `alarms.create` | Sync (void) | ✅ | ✅ | ✅ |
| `alarms.get` | **Callback** | ✅ | ❌ | ⚠️ #1 |
| `alarms.onAlarm` | Event | ✅ | ✅ | ✅ |
| `identity.getRedirectURL` | Sync (string) | ✅ | ✅ | ✅ |
| `identity.launchWebAuthFlow` | Promise | ✅ | ✅ | ✅ |

---

## 8. Performance

**Verdict: ✅ Zero overhead**

`browserApi` is a direct reference (`const` alias) to the underlying `chrome` or `browser` object:

- No Proxy object
- No function wrapping
- No intercepted property access
- No extra function calls on the call path
- No memory allocation beyond a single pointer

The TypeScript compilation output is identical to the original `chrome.*` calls — the `browserApi` identifier resolves to the same runtime object.

---

## Summary

| Severity | Count | Issues |
|----------|-------|--------|
| **Critical** | 0 | — |
| **High** | 0 | — |
| **Medium** | 1 | `alarms.get` callback form incompatible with Firefox `browser.*` API |
| **Low** | 2 | `storage.session` / `scripting` require minimum Firefox versions |

**The abstraction layer is production-ready and safe to proceed with Firefox implementation.** The one Medium issue (`alarms.get` callback → Promise form) should be fixed during Firefox implementation. All other APIs are fully compatible with Chrome MV3, Edge, and Firefox.
