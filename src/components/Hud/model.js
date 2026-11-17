import { TABLE_GEOMETRY } from '../../prompterLayout';

export const SETTINGS_KEY = 'prompter.hud.settings.v1';
export const SNAPSHOTS_KEY = 'prompter.hud.snapshots.v1';
export const GAME_TYPES = ['spins', '6max', '5max', 'mystery final', '4max'];
export const FONTS = { prompter: 'Arial, sans-serif', system: 'Segoe UI, sans-serif', mono: 'Consolas, monospace' };
export const DEFAULT_SETTINGS = { enabled: false, font: 'prompter', fontSize: 22, opacity: 65, width: 150, height: 78, positions: {} };
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const number = (value, fallback, min, max) => Number.isFinite(Number(value)) ? clamp(Number(value), min, max) : fallback;

export function normalizeSettings(value = {}) {
  if (!value || typeof value !== 'object') value = {};
  const positions = {};
  GAME_TYPES.forEach(game => {
    positions[game] = {};
    for (let seat = 0; seat < 9; seat++) {
      const point = value.positions && value.positions[game] && value.positions[game][seat];
      if (point && Number.isFinite(point.x) && Number.isFinite(point.y)) positions[game][seat] = {
        x: clamp(point.x, 0, TABLE_GEOMETRY.width), y: clamp(point.y, 0, TABLE_GEOMETRY.height),
      };
    }
  });
  const fontSize = number(value.fontSize, 22, 12, 36);
  return { enabled: value.enabled === true, font: FONTS[value.font] ? value.font : 'prompter',
    fontSize, opacity: number(value.opacity, 65, 0, 100),
    width: Math.max(number(value.width, 150, 110, 280), fontSize * 5 + 20),
    height: Math.max(number(value.height, 78, 60, 160), Math.ceil(fontSize * 2.4 + 20)), positions };
}

export function readStorage(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch (_) { return fallback; }
}

export function gameTypeOf(prompt = {}, count) {
  const explicit = prompt.gameType ?? prompt.gameTypesSettings ?? prompt.gametype;
  if (Number.isInteger(explicit)) return ({ 0: 'spins', 1: '6max', 3: '5max', 4: '4max', 5: 'mystery final' })[explicit] || 'unknown';
  if (typeof explicit === 'string') {
    const type = explicit.toLowerCase().replace(/[_\s&-]/g, '');
    return ({ spins: 'spins', spin: 'spins', spingo: 'spins', '6max': '6max', '5max': '5max',
      '4max': '4max', mysteryfinal: 'mystery final' })[type] || 'unknown';
  }
  if (prompt.is4max) return '4max';
  if (prompt.is5max) return '5max';
  const metadata = (prompt.players || []).find(player => player && player.playerType &&
    Number.isInteger(player.playerType.gametype));
  if (metadata) return ({ 0: 'spins', 1: '6max', 3: '5max', 4: '4max', 5: 'mystery final' })[metadata.playerType.gametype] || 'unknown';
  // The current backend's createMainPrompt omits gameType. Its layout count is
  // the original game capacity (not the number of players remaining in a hand).
  if (+count === 3) return 'spins';
  return ({ 4: '4max', 5: '5max', 6: '6max', 9: 'mystery final' })[count] || 'unknown';
}

export function hudSize(settings) {
  return { width: Math.max(settings.width, settings.fontSize * 5 + 20),
    height: Math.max(settings.height, settings.fontSize * 2.4 + 20) };
}

export function hudPosition(settings, game, seat, point) {
  const size = hudSize(settings);
  const stored = point || (settings.positions[game] || {})[seat] || { x: seat === 0 ? 30 : 505, y: 122 };
  return { x: clamp(stored.x, 0, TABLE_GEOMETRY.width - size.width),
    y: clamp(stored.y, 0, TABLE_GEOMETRY.height - size.height) };
}

export function exportHudSettings(settings) {
  const exported = normalizeSettings(settings);
  // Include the visible defaults too, so the file fully describes the layout.
  [0, 1].forEach(seat => { exported.positions.spins[seat] = hudPosition(exported, 'spins', seat); });
  return { format: 'prompter-hud-settings', version: 1, exportedAt: new Date().toISOString(),
    coordinates: { space: 'table', width: TABLE_GEOMETRY.width, height: TABLE_GEOMETRY.height },
    settings: exported };
}

export function validSnapshot(value) {
  return !!value && value.version === 1 && value.game === 'spins' && value.state &&
    value.state.table0 && Array.isArray(value.state.table0.players) &&
    value.state.table0.players.length > 0 && value.state.table0.players.length <= 3 &&
    gameTypeOf(value.state.table0, value.state.playersCount0) === 'spins';
}

export function readSnapshots() {
  const data = readStorage(SNAPSHOTS_KEY, {});
  return { spins: Array.from({ length: 10 }, (_, i) => {
    const value = data && data.spins && data.spins[i];
    return validSnapshot(value) ? value : null;
  }) };
}

// Only table-rendering data belongs in a snapshot; connection credentials and
// clients never enter storage. Cached nickname images arrive only once per hand.
export function captureSnapshot(state, cachedPlayers = [], tableView = {}) {
  if (gameTypeOf(state.table0, state.playersCount0) !== 'spins' ||
      !state.table0.players || !state.table0.players.some(player => player && player.isActive)) {
    throw new Error('На столе 0 нет активной игры spins.');
  }
  const table0 = { ...state.table0, limitPro: tableView.limitPro || state.table0.limitPro,
    players: state.table0.players.map((player, seat) => player && ({ ...player,
    img: player.img || (cachedPlayers[seat] || {}).img,
    handsCount: player.handsCount == null ? (cachedPlayers[seat] || {}).handsCount : player.handsCount,
  })) };
  const snapshot = { version: 1, game: 'spins', savedAt: new Date().toISOString(), state: {
    table0, hand0: state.hand0 || {}, handEV0: state.handEV0 || {}, shkaf_table0: state.shkaf_table0 || {},
    playersCount0: 3, isButtons0: !!state.isButtons0, baraban: state.baraban || {},
  } };
  return JSON.parse(JSON.stringify(snapshot));
}

export function preserveNicknameImages(previous, incoming) {
  if (!incoming || !previous || !incoming.handNumber || incoming.handNumber !== previous.handNumber ||
      !Array.isArray(incoming.players) || !Array.isArray(previous.players)) return incoming;
  return { ...incoming, players: incoming.players.map((player, seat) => {
    if (!player) return player;
    const cached = previous.players[seat] || {};
    return { ...player, img: player.img || cached.img,
      handsCount: player.handsCount == null ? cached.handsCount : player.handsCount };
  }) };
}

export const DEMO_SNAPSHOT = { version: 1, game: 'spins', state: {
  playersCount0: 3, isButtons0: true, shkaf_table0: {}, handEV0: {}, baraban: {},
  table0: { gameType: 'spins', handNumber: 'hud-demo', situationHash: 'hud-demo-1', move_id: 1, isHeroTurn: true, pot: 6.5, ante: 0,
    board: [{ value: 'a', suit: 'h' }, { value: '9', suit: 'c' }, { value: '4', suit: 'd' }],
    heroCards: { hole1Value: 'a', hole1Suit: 's', hole2Value: 'q', hole2Suit: 's' },
    players: [0, 1, 2].map(seat => ({ nickname: `player${seat}`, isActive: true, isHero: seat === 2,
      isDealer: seat === 0, balance: [18.5, 23, 21][seat], bet: seat === 0 ? 2 : 0,
      enumPosition: [0, 8, 9][seat], agroClass: seat === 0 ? 'bet-raise' : 'check-call' })) },
  hand0: { hand_handNumber: 'hud-demo', promptHash: 'hud-demo-1', hand_move_id: 1, maxAmount: 200, prevHeroAmountAtCurStreet: 0,
    wasBet: true, strategy: { '-1': { ev: 0, strategy: .1 }, 0: { ev: 125, strategy: .65 },
      400: { ev: 110, strategy: .25 } }, summaryStrategy: {} },
} };
