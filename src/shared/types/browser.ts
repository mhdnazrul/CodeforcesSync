interface Tab {
  id?: number;
  status?: string;
  url?: string;
}

interface Alarm {
  name: string;
}

interface StorageService {
  get(keys: string | string[] | Record<string, unknown>): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  clear(): Promise<void>;
}

interface TabsService {
  create(createProperties: { url: string; active: boolean }): Promise<Tab>;
  get(tabId: number): Promise<Tab>;
  query(queryInfo: { url: string }): Promise<Tab[]>;
  remove(tabId: number): Promise<void>;
  onUpdated: {
    addListener(callback: (tabId: number, changeInfo: { status?: string }) => void): void;
    removeListener(callback: (...args: unknown[]) => void): void;
  };
}

interface ScriptingService {
  executeScript(injection: {
    target: { tabId: number };
    func: (...args: unknown[]) => unknown;
    args?: unknown[];
  }): Promise<{ result?: unknown }[]>;
}

interface RuntimeService {
  sendMessage(message: unknown): Promise<void>;
  onMessage: {
    addListener(callback: (message: unknown) => void): void;
    removeListener(callback: (...args: unknown[]) => void): void;
  };
}

interface AlarmsService {
  create(name: string, alarmInfo: { periodInMinutes: number }): void;
  get(name: string): Promise<Alarm | undefined>;
  onAlarm: {
    addListener(callback: (alarm: Alarm) => void): void;
  };
}

export type { Tab, Alarm, StorageService, TabsService, ScriptingService, RuntimeService, AlarmsService };
