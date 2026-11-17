export const SLOW_PING_LOG_KEY = 'prompterSlowPingLog';
export const PING_LOG_RETENTION_MS = 3 * 24 * 60 * 60 * 1000;
export const PING_LOG_MAX_ENTRIES = 500;
// At most 128 KiB of UTF-16 JSON text.
export const PING_LOG_MAX_CHARS = 64 * 1024;
// Keep total estimated usage below 4 MiB, reserving 1 MiB under the usual 5 MiB quota.
// This is a conservative budget, not a measurement of the browser's actual quota.
export const LOCAL_STORAGE_TARGET_CHARS = 2 * 1024 * 1024;

export default class SlowPingLog {
  constructor() {
    this.entries = [];
    this.storageWarningShown = false;
    try {
      const stored = JSON.parse(localStorage.getItem(SLOW_PING_LOG_KEY) || '[]');
      if (Array.isArray(stored)) {
        this.entries = stored.filter(entry => entry && Number.isFinite(entry.time) &&
          typeof entry.server === 'string' && Number.isFinite(entry.pingMs) && entry.pingMs > 5000)
          .map(({ time, server, pingMs }) => ({ time, server, pingMs }));
      }
    } catch (error) {
      console.warn('Cannot read ping log:', error.message);
    }
    this.save();
  }

  prune() {
    const cutoff = Date.now() - PING_LOG_RETENTION_MS;
    this.entries = this.entries.filter(entry => entry.time >= cutoff).slice(-PING_LOG_MAX_ENTRIES);
    this.entries = this.fitEntries(this.entries, PING_LOG_MAX_CHARS);
  }

  fitEntries(entries, maxChars) {
    let chars = 2; // JSON array brackets.
    let firstKept = entries.length;
    for (let i = entries.length - 1; i >= 0; i--) {
      const entryChars = JSON.stringify(entries[i]).length + (firstKept < entries.length ? 1 : 0);
      if (chars + entryChars > maxChars) break;
      chars += entryChars;
      firstKept = i;
    }
    return entries.slice(firstKept);
  }

  getStorageBudgetChars() {
    let otherChars = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key !== null && key !== SLOW_PING_LOG_KEY) {
        otherChars += key.length + (localStorage.getItem(key) || '').length;
      }
    }
    return Math.max(0, Math.min(PING_LOG_MAX_CHARS,
      LOCAL_STORAGE_TARGET_CHARS - otherChars - SLOW_PING_LOG_KEY.length));
  }

  save() {
    this.prune();
    try {
      let candidate = this.fitEntries(this.entries, this.getStorageBudgetChars());
      if (!candidate.length) {
        // Release this journal's disk space when other data needs the reserve.
        // Keep the bounded in-memory log downloadable until there is room again.
        localStorage.removeItem(SLOW_PING_LOG_KEY);
        this.storageWarningShown = false;
        return;
      }
      while (true) {
        try {
          localStorage.setItem(SLOW_PING_LOG_KEY, JSON.stringify(candidate));
          this.entries = candidate;
          this.storageWarningShown = false;
          return;
        } catch (error) {
          const quotaExceeded = error.name === 'QuotaExceededError' ||
            error.name === 'NS_ERROR_DOM_QUOTA_REACHED' || error.code === 22 || error.code === 1014;
          if (quotaExceeded && candidate.length > 1) {
            candidate = candidate.slice(Math.ceil(candidate.length / 2));
            continue;
          }
          if (quotaExceeded) localStorage.removeItem(SLOW_PING_LOG_KEY);
          throw error;
        }
      }
    } catch (error) {
      // Even if one record cannot fit, keep a bounded session log available for download.
      if (!this.storageWarningShown) {
        console.warn('Cannot save ping log:', error.message);
        this.storageWarningShown = true;
      }
    }
  }

  record(server, pingMs, time = Date.now()) {
    if (!Number.isFinite(pingMs) || pingMs <= 5000) return;
    this.entries.push({ time, server, pingMs });
    this.save();
  }

  toText() {
    const header = 'Время получения ответа (местное) | Адрес подключения | Пинг';
    const rows = this.entries.map(({ time, server, pingMs }) => {
      const date = new Date(time);
      const pad = (value, length = 2) => String(value).padStart(length, '0');
      const timestamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
      return `${timestamp} | ${server} | пинг ${pingMs / 1000}с`;
    });
    return [header, ...rows].join('\r\n') + '\r\n';
  }
}
