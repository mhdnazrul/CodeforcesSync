import { browserApi } from "../../platform/browser";
import type {
  StorageService, TabsService, ScriptingService,
  RuntimeService, AlarmsService, Alarm, Tab,
} from "../../shared/types/browser";

class ChromeStorageService implements StorageService {
  async get(keys: string | string[] | Record<string, unknown>): Promise<Record<string, unknown>> {
    return browserApi.storage.local.get(keys);
  }

  async set(items: Record<string, unknown>): Promise<void> {
    return browserApi.storage.local.set(items);
  }

  async clear(): Promise<void> {
    return browserApi.storage.local.clear();
  }
}

class ChromeTabsService implements TabsService {
  async create(createProperties: { url: string; active: boolean }): Promise<Tab> {
    return browserApi.tabs.create(createProperties);
  }

  async get(tabId: number): Promise<Tab> {
    return browserApi.tabs.get(tabId);
  }

  async query(queryInfo: { url: string }): Promise<Tab[]> {
    return browserApi.tabs.query(queryInfo);
  }

  async remove(tabId: number): Promise<void> {
    return browserApi.tabs.remove(tabId);
  }

  onUpdated = {
    addListener: (callback: (tabId: number, changeInfo: { status?: string }) => void): void => {
      browserApi.tabs.onUpdated.addListener(callback);
    },
    removeListener: (callback: (...args: unknown[]) => void): void => {
      browserApi.tabs.onUpdated.removeListener(callback as (...args: unknown[]) => void);
    },
  };
}

class ChromeScriptingService implements ScriptingService {
  async executeScript(injection: {
    target: { tabId: number };
    func: (...args: unknown[]) => unknown;
    args?: unknown[];
  }): Promise<{ result?: unknown }[]> {
    const results = await browserApi.scripting.executeScript<unknown[], unknown>(
      injection as chrome.scripting.ScriptInjection<unknown[], unknown>,
    );
    return results.map((r) => ({ result: r.result }));
  }
}

class ChromeRuntimeService implements RuntimeService {
  async sendMessage(message: unknown): Promise<void> {
    await browserApi.runtime.sendMessage(message);
  }

  onMessage = {
    addListener: (callback: (message: unknown) => void): void => {
      browserApi.runtime.onMessage.addListener(callback);
    },
    removeListener: (callback: (...args: unknown[]) => void): void => {
      browserApi.runtime.onMessage.removeListener(callback);
    },
  };
}

class ChromeAlarmsService implements AlarmsService {
  create(name: string, alarmInfo: { periodInMinutes: number }): void {
    browserApi.alarms.create(name, alarmInfo);
  }

  get(name: string): Promise<Alarm | undefined> {
    return browserApi.alarms.get(name).then(alarm =>
      alarm ? { name: alarm.name } : undefined
    );
  }

  onAlarm = {
    addListener: (callback: (alarm: Alarm) => void): void => {
      browserApi.alarms.onAlarm.addListener(callback);
    },
  };
}

export {
  ChromeStorageService, ChromeTabsService, ChromeScriptingService,
  ChromeRuntimeService, ChromeAlarmsService,
};
