import SlowPingLog, {
  SLOW_PING_LOG_KEY, PING_LOG_RETENTION_MS, PING_LOG_MAX_ENTRIES, PING_LOG_MAX_CHARS,
  LOCAL_STORAGE_TARGET_CHARS,
} from './slowPingLog';

beforeEach(() => {
  localStorage.clear();
  jest.spyOn(Date, 'now').mockReturnValue(1800000000000);
});

afterEach(() => jest.restoreAllMocks());

test('startup preserves recent records and removes only entries older than three days', () => {
  const boundary = { time: Date.now() - PING_LOG_RETENTION_MS, server: 'ws://old', pingMs: 8000 };
  const recent = { time: Date.now(), server: 'ws://recent', pingMs: 5001 };
  localStorage.setItem(SLOW_PING_LOG_KEY, JSON.stringify([
    { ...boundary, time: boundary.time - 1 }, boundary, recent, null, { bad: true },
  ]));
  const log = new SlowPingLog();
  expect(log.entries).toEqual([boundary, recent]);
  expect(JSON.parse(localStorage.getItem(SLOW_PING_LOG_KEY))).toEqual([boundary, recent]);
});

test('records survive a new instance and export readable times, addresses and seconds', () => {
  const time = new Date(2026, 8, 13, 14, 25, 36, 123).getTime();
  Date.now.mockReturnValue(time);
  const log = new SlowPingLog();
  log.record('ws://localhost:27992', 8000);
  log.record('ws://other:27991', 5123);
  const restored = new SlowPingLog();
  expect(restored.entries).toHaveLength(2);
  expect(restored.toText()).toContain('2026-09-13 14:25:36.123 | ws://localhost:27992 | пинг 8с');
  expect(restored.toText()).toContain('ws://other:27991 | пинг 5.123с');
});

test('corrupt storage does not break ping handling', () => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  localStorage.setItem(SLOW_PING_LOG_KEY, '{broken');
  const log = new SlowPingLog();
  log.record('ws://localhost:27992', 6000);
  expect(log.entries).toHaveLength(1);
});

test('storage failure preserves a downloadable session log', () => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded'); });
  const log = new SlowPingLog();
  log.record('ws://localhost:27992', 9000);
  expect(log.toText()).toContain('ws://localhost:27992 | пинг 9с');
});

test('startup and new records keep only the newest 500 entries', () => {
  const entries = Array.from({ length: PING_LOG_MAX_ENTRIES + 5 }, (_, index) => ({
    time: Date.now() - 10000 + index, server: 'ws://localhost:27992', pingMs: 6000,
  }));
  localStorage.setItem(SLOW_PING_LOG_KEY, JSON.stringify(entries));
  const log = new SlowPingLog();
  expect(log.entries).toEqual(entries.slice(5));
  log.record('ws://latest', 8000);
  expect(log.entries).toHaveLength(PING_LOG_MAX_ENTRIES);
  expect(log.entries[0]).toEqual(entries[6]);
  expect(log.entries[log.entries.length - 1].server).toBe('ws://latest');
});

test('other project data reduces the log budget before the storage quota is reached', () => {
  const log = new SlowPingLog();
  for (let i = 0; i < 8; i++) log.record('ws://localhost:27992', 6000 + i);
  const otherKey = 'projectData';
  const otherValue = 'x'.repeat(LOCAL_STORAGE_TARGET_CHARS - 140 - otherKey.length);
  localStorage.setItem(otherKey, otherValue);
  log.record('ws://newest', 9000);
  const saved = localStorage.getItem(SLOW_PING_LOG_KEY);
  expect(JSON.parse(saved)).toHaveLength(1);
  expect(JSON.parse(saved)[0].server).toBe('ws://newest');
  expect(otherKey.length + otherValue.length + SLOW_PING_LOG_KEY.length + saved.length)
    .toBeLessThanOrEqual(LOCAL_STORAGE_TARGET_CHARS);
  expect(localStorage.getItem(otherKey)).toBe(otherValue);
});

test('when the reserve is unavailable, releases only the persisted log and resumes later', () => {
  const log = new SlowPingLog();
  log.record('ws://localhost:27992', 8000);
  const otherValue = 'x'.repeat(LOCAL_STORAGE_TARGET_CHARS);
  localStorage.setItem('projectData', otherValue);
  log.record('ws://newest', 9000);
  expect(localStorage.getItem(SLOW_PING_LOG_KEY)).toBe(null);
  expect(localStorage.getItem('projectData')).toBe(otherValue);
  expect(log.toText()).toContain('ws://newest | пинг 9с');
  localStorage.removeItem('projectData');
  log.record('ws://recovered', 10000);
  expect(JSON.parse(localStorage.getItem(SLOW_PING_LOG_KEY))).toHaveLength(3);
});

test('long addresses cannot grow the serialized log beyond its size limit', () => {
  const entries = Array.from({ length: 100 }, (_, index) => ({
    time: Date.now() - 100 + index, server: 'ws://' + 'a'.repeat(5000), pingMs: 9000,
  }));
  localStorage.setItem(SLOW_PING_LOG_KEY, JSON.stringify(entries));
  const log = new SlowPingLog();
  expect(localStorage.getItem(SLOW_PING_LOG_KEY).length).toBeLessThanOrEqual(PING_LOG_MAX_CHARS);
  expect(log.entries.length).toBeGreaterThan(0);
  expect(log.entries.length).toBeLessThan(entries.length);
  expect(log.entries[log.entries.length - 1]).toEqual(entries[entries.length - 1]);
});

test('quota errors discard old log records and retry without changing other settings', () => {
  const entries = Array.from({ length: 8 }, (_, index) => ({
    time: Date.now() - 100 + index, server: 'ws://localhost:27992', pingMs: 6000 + index,
  }));
  localStorage.setItem(SLOW_PING_LOG_KEY, JSON.stringify(entries));
  localStorage.setItem('token', 'preserve-me');
  const originalSetItem = Storage.prototype.setItem;
  const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
    if (key === SLOW_PING_LOG_KEY && JSON.parse(value).length > 2) {
      throw new DOMException('Storage full', 'QuotaExceededError');
    }
    return originalSetItem.call(this, key, value);
  });
  const log = new SlowPingLog();
  expect(setItem).toHaveBeenCalledTimes(3);
  expect(log.entries).toEqual(entries.slice(-2));
  expect(JSON.parse(localStorage.getItem(SLOW_PING_LOG_KEY))).toEqual(entries.slice(-2));
  expect(localStorage.getItem('token')).toBe('preserve-me');
  log.record('ws://newest', 8000);
  expect(JSON.parse(localStorage.getItem(SLOW_PING_LOG_KEY)).slice(-1)[0].server).toBe('ws://newest');
});

test('permanent quota failure keeps bounded memory and does not flood warnings', () => {
  const entries = Array.from({ length: PING_LOG_MAX_ENTRIES }, (_, index) => ({
    time: Date.now() - 10000 + index, server: 'ws://localhost:27992', pingMs: 6000,
  }));
  localStorage.setItem(SLOW_PING_LOG_KEY, JSON.stringify(entries));
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Storage full', 'QuotaExceededError');
  });
  const log = new SlowPingLog();
  log.record('ws://newest', 9000);
  expect(log.entries).toHaveLength(PING_LOG_MAX_ENTRIES);
  expect(log.toText()).toContain('ws://newest | пинг 9с');
  expect(JSON.stringify(log.entries).length).toBeLessThanOrEqual(PING_LOG_MAX_CHARS);
  expect(warn).toHaveBeenCalledTimes(1);
  expect(setItem.mock.calls.length).toBeLessThan(30);
  expect(localStorage.getItem(SLOW_PING_LOG_KEY)).toBe(null);
});
