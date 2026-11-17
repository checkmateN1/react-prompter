import { captureSnapshot, DEMO_SNAPSHOT, gameTypeOf, hudPosition, hudSize, normalizeSettings, preserveNicknameImages,
  readSnapshots, SNAPSHOTS_KEY } from './model';

afterEach(() => localStorage.clear());

test('retains first-frame nickname images during preview without carrying them into another hand', () => {
  const first = { handNumber: 1, players: [{ img: 'nickname', handsCount: 10, balance: 25 }] };
  const incoming = { handNumber: 1, players: [{ img: undefined, handsCount: null, balance: 24 }] };
  expect(preserveNicknameImages(first, incoming).players[0]).toEqual({ img: 'nickname', handsCount: 10, balance: 24 });
  expect(preserveNicknameImages(first, { ...incoming, handNumber: 2 }).players[0].img).toBeUndefined();
  expect(preserveNicknameImages(first, {})).toEqual({});
  expect(first.players[0].balance).toBe(25);
});

test('uses explicit game type, native metadata and legacy layout without treating short-handed cash as spins', () => {
  expect(gameTypeOf({ gameType: 'spins' }, 3)).toBe('spins');
  expect(gameTypeOf({ gametype: 0 }, 3)).toBe('spins');
  expect(gameTypeOf({ gametype: 1 }, 3)).toBe('6max');
  expect(gameTypeOf({ gameTypesSettings: 'Spin&Go' }, 3)).toBe('spins');
  expect(gameTypeOf({ gameType: '6max', players: [{}, {}, {}] }, 3)).toBe('6max');
  expect(gameTypeOf({ is5max: true }, 6)).toBe('5max');
  expect(gameTypeOf({ is4max: true }, 6)).toBe('4max');
  expect(gameTypeOf({ gameType: 'mystery_final' }, 9)).toBe('mystery final');
  expect(gameTypeOf({ gameType: 'unknown' }, 3)).toBe('unknown');
  expect(gameTypeOf({ players: [{ playerType: { gametype: 0 } }] }, 3)).toBe('spins');
  expect(gameTypeOf({ players: [{ playerType: { gametype: 1 } }] }, 3)).toBe('6max');
  expect(gameTypeOf({}, 3)).toBe('spins');
  expect(gameTypeOf({ players: [{}, {}] }, 6)).toBe('6max');
  expect(gameTypeOf({}, {})).toBe('unknown');
});

test('bounds positions after resizing and normalizes corrupt settings', () => {
  const settings = normalizeSettings({ fontSize: 36, width: 110, height: 60,
    positions: { spins: { 0: { x: 700, y: 520 } }, '6max': { 0: { x: 100, y: 120 } } } });
  expect(hudSize(settings).width).toBeGreaterThanOrEqual(200);
  const position = hudPosition(settings, 'spins', 0);
  expect(position.x + hudSize(settings).width).toBeLessThanOrEqual(714);
  expect(position.y + hudSize(settings).height).toBeLessThanOrEqual(524);
  expect(hudPosition(settings, '6max', 0)).toEqual({ x: 100, y: 120 });
  expect(normalizeSettings(null).fontSize).toBe(22);
  expect(normalizeSettings({ font: '__bad', opacity: 999, width: 'bad' })).toMatchObject({ font: 'prompter', opacity: 100, width: 150 });
});

test('captures every render channel and cached nickname image without connection state or reference sharing', () => {
  const state = JSON.parse(JSON.stringify(DEMO_SNAPSHOT.state));
  state.token = 'must-not-be-copied';
  state.client = { circular: state };
  state.handEV0 = { custom: 12 };
  state.shkaf_table0 = { shkafHandNumber: 'hud-demo' };
  const snapshot = captureSnapshot(state, [{ img: 'cached-image', handsCount: 123 }]);
  expect(snapshot.state.table0.players[0]).toMatchObject({ img: 'cached-image', handsCount: 123 });
  expect(snapshot.state.handEV0).toEqual({ custom: 12 });
  expect(snapshot.state.shkaf_table0).toEqual(state.shkaf_table0);
  expect(snapshot.state).not.toHaveProperty('token');
  expect(snapshot.state).not.toHaveProperty('client');
  state.table0.players[0].balance = 999;
  expect(snapshot.state.table0.players[0].balance).toBe(18.5);
  expect(() => captureSnapshot({ table0: {}, playersCount0: 3 })).toThrow('нет активной');
});

test('keeps ten separate slots and recovers from malformed storage', () => {
  const slots = Array.from({ length: 10 }, (_, index) => ({ ...DEMO_SNAPSHOT, savedAt: String(index) }));
  localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify({ spins: slots }));
  expect(readSnapshots().spins.map(slot => slot.savedAt)).toEqual(slots.map(slot => slot.savedAt));
  localStorage.setItem(SNAPSHOTS_KEY, '{bad json');
  expect(readSnapshots().spins).toEqual(Array(10).fill(null));
  localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify({ spins: [{ version: 900 }] }));
  expect(readSnapshots().spins[0]).toBeNull();
});
