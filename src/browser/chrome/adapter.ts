import type {
  StorageService, TabsService, ScriptingService,
  RuntimeService, AlarmsService, Alarm, Tab,
} from "../../shared/types/browser";

class ChromeStorageService implements StorageService {
  async get(keys: string | string[] | Record<string, unknown>): Promise<Record<string, unknown>> {
    return chrome.storage.local.get(keys);
  }

  async set(items: Record<string, unknown>): Promise<void> {
    return chrome.storage.local.set(items);
  }

  async clear(): Promise<void> {
    return chrome.storage.local.clear();
  }
}

class ChromeTabsService implements TabsService {
  async create(createProperties: { url: string; active: boolean }): Promise<Tab> {
    return chrome.tabs.create(createProperties);
  }

  async get(tabId: number): Promise<Tab> {
    return chrome.tabs.get(tabId);
  }

  async query(queryInfo: { url: string }): Promise<Tab[]> {
    return chrome.tabs.query(queryInfo);
  }

  async remove(tabId: number): Promise<void> {
    return chrome.tabs.remove(tabId);
  }

  onUpdated = {
    addListener: (callback: (tabId: number, changeInfo: { status?: string }) => void): void => {
      chrome.tabs.onUpdated.addListener(callback);
    },
    removeListener: (callback: (...args: unknown[]) => void): void => {
      chrome.tabs.onUpdated.removeListener(callback as (...args: unknown[]) => void);
    },
  };
}

class ChromeScriptingService implements ScriptingService {
  async executeScript(injection: {
    target: { tabId: number };
    func: (...args: unknown[]) => unknown;
    args?: unknown[];
  }): Promise<{ result?: unknown }[]> {
    const results = await chrome.scripting.executeScript<unknown[], unknown>(
      injection as chrome.scripting.ScriptInjection<unknown[], unknown>,
    );
    return results.map((r) => ({ result: r.result }));
  }
}

class ChromeRuntimeService implements RuntimeService {
  async sendMessage(message: unknown): Promise<void> {
    await chrome.runtime.sendMessage(message);
  }

  onMessage = {
    addListener: (callback: (message: unknown) => void): void => {
      chrome.runtime.onMessage.addListener(callback);
    },
    removeListener: (callback: (...args: unknown[]) => void): void => {
      chrome.runtime.onMessage.removeListener(callback);
    },
  };
}

class ChromeAlarmsService implements AlarmsService {
  create(name: string, alarmInfo: { periodInMinutes: number }): void {
    chrome.alarms.create(name, alarmInfo);
  }

  get(name: string): Promise<Alarm | undefined> {
    return new Promise((resolve) => {
      chrome.alarms.get(name, (alarm) => {
        resolve(alarm ? { name: alarm.name } : undefined);
      });
    });
  }

  onAlarm = {
    addListener: (callback: (alarm: Alarm) => void): void => {
      chrome.alarms.onAlarm.addListener(callback);
    },
  };
}

export {
  ChromeStorageService, ChromeTabsService, ChromeScriptingService,
  ChromeRuntimeService, ChromeAlarmsService,
};
