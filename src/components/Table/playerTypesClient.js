import React from 'react';
import { enumPoker } from '../../enum';
import { matchesShkafNickname } from './shkafNicknameMatch';

export const PlayerTypesClientContext = React.createContext(null);

// sharedWS keeps one handler per event, so all seats share this dispatcher.
const clients = new WeakMap();
let sequence = 0;

// Keep a player's known type across hands/tables, never across rooms or game types.
const cacheKey = (scope, nick) => JSON.stringify([scope.room, scope.gametype, nick]);
const handKey = scope => JSON.stringify([scope.room, scope.gametype, scope.tableId]);
const normalizeNickname = nick => typeof nick === 'string' ? nick.trim().toLowerCase() : '';
const sameScope = (a, b) => a.room === b.room && a.gametype === b.gametype;
const isRecent = record => record && record.expiresAt > Date.now();

function prune(state) {
  for (const [key, value] of state.cache) if (!isRecent(value)) state.cache.delete(key);
  for (const [key, value] of state.activity) if (!isRecent(value)) state.activity.delete(key);
  for (const [key, value] of state.manual) if (!isRecent(value)) state.manual.delete(key);
  state.matches.clear();
}

function scheduleExpiry(state) {
  clearTimeout(state.expiryTimer);
  const deadlines = [...state.cache.values(), ...state.activity.values(), ...state.manual.values()].map(value => value.expiresAt);
  if (!deadlines.length) return;
  state.expiryTimer = setTimeout(() => {
    prune(state);
    state.listeners.forEach(listener => listener());
    scheduleExpiry(state);
  }, Math.max(1, Math.min(...deadlines) - Date.now()));
}

function recordHand(state, packet) {
  if (!Array.isArray(packet?.nicks) || !Number.isFinite(packet.handStartedAt) ||
      !Number.isFinite(packet.serverNow) || packet.serverNow < packet.handStartedAt) return;
  prune(state);
  const tableKey = handKey(packet);
  const previous = state.hands.get(tableKey);
  if (previous && previous.handStartedAt > packet.handStartedAt) return;
  let localStart = Date.now() - (packet.serverNow - packet.handStartedAt);
  if (previous?.handStartedAt === packet.handStartedAt) localStart = Math.min(localStart, previous.localStart);
  const knownNicks = previous?.handStartedAt === packet.handStartedAt ? previous.nicks : new Set();
  packet.nicks.forEach(nick => { if (normalizeNickname(nick)) knownNicks.add(nick); });
  state.hands.set(tableKey, { handStartedAt: packet.handStartedAt, localStart, nicks: knownNicks });
  if (state.hands.size > 512) state.hands.delete(state.hands.keys().next().value);
  const expiresAt = localStart + enumPoker.playerTypesRetentionMs;
  if (expiresAt <= Date.now()) return;
  for (const nick of packet.nicks) {
    if (!normalizeNickname(nick)) continue;
    const key = cacheKey(packet, nick);
    if ((state.activity.get(key)?.expiresAt || 0) < expiresAt) {
      state.activity.set(key, { room: packet.room, gametype: packet.gametype, nick, expiresAt });
    }
    for (const candidate of state.cache.values()) {
      if (sameScope(candidate, packet) && matchesShkafNickname(nick, candidate.nick)) {
        candidate.expiresAt = Math.max(candidate.expiresAt, expiresAt);
      }
    }
  }
  if (state.activity.size > 4096) state.activity.delete(state.activity.keys().next().value);
  scheduleExpiry(state);
}

function activeUntil(state, scope, nick) {
  let expiresAt = 0;
  for (const activity of state.activity.values()) {
    if (isRecent(activity) && sameScope(activity, scope) && matchesShkafNickname(nick, activity.nick)) {
      expiresAt = Math.max(expiresAt, activity.expiresAt);
    }
  }
  return expiresAt;
}

function manualChoice(state, scope, nick) {
  let latest;
  for (const choice of state.manual.values()) {
    if (isRecent(choice) && sameScope(choice, scope) && matchesShkafNickname(nick, choice.nick) &&
        (!latest || choice.order > latest.order)) latest = choice;
  }
  return latest;
}

function applyManualChoice(state, request) {
  const { payload, order } = request;
  const previous = manualChoice(state, payload, payload.nick);
  if (previous && previous.order > order) return;
  const expiresAt = request.startedAt + enumPoker.playerTypesManualPriorityMs;
  if (expiresAt <= Date.now()) return;
  state.manual.set(cacheKey(payload, payload.nick), { room: payload.room, gametype: payload.gametype,
    nick: payload.nick, type: payload.type, order, expiresAt });
  state.matches.clear();
}

function findPlayerType(state, scope) {
  const manual = manualChoice(state, scope, scope.nick);
  // Manual choices take effect at the click, even without a server reply or a recent hand.
  // Their five-minute deadline is independent of the hand cache.
  if (manual) return manual;
  const key = cacheKey(scope, scope.nick);
  if (isRecent(state.matches.get(key))) return state.matches.get(key);
  const nickname = normalizeNickname(scope.nick);
  let found = state.cache.get(key);
  if (!isRecent(found)) found = undefined;
  if (nickname) {
    for (const candidate of state.cache.values()) {
      if (!isRecent(candidate) || candidate.room !== scope.room || candidate.gametype !== scope.gametype ||
          (found && candidate.version <= found.version)) continue;
      // Pass raw names: shkaf applies substitutions before lowercasing.
      if (matchesShkafNickname(scope.nick, candidate.nick)) found = candidate;
    }
  }
  if (state.matches.size >= 4096) state.matches.clear();
  state.matches.set(key, found);
  return found;
}
export function resetPlayerTypesClient(client) {
  const state = clients.get(client);
  if (!state) return;
  state.cache.clear();
  state.matches.clear();
  state.activity.clear();
  state.hands.clear();
  // A reconnect must not undo a choice made locally within the last five minutes.
  prune(state);
  clearTimeout(state.expiryTimer);
  state.pending.forEach(request => {
    clearTimeout(request.timer);
    request.reject(new Error('Соединение изменилось'));
  });
  state.pending.clear();
  state.listeners.forEach(listener => listener());
  scheduleExpiry(state);
}
export function initializePlayerTypesClient(client) {
  if (clients.has(client)) return clients.get(client);
  const state = { pending: new Map(), cache: new Map(), matches: new Map(), listeners: new Set(),
    activity: new Map(), hands: new Map(), manual: new Map(), expiryTimer: null };
  clients.set(client, state);
  const remember = (result, requestedNicks) => {
    if (!Array.isArray(result?.nicks) || !Array.isArray(result.types) || !Array.isArray(result.versions)) return;
    recordHand(state, result);
    const entries = result.nicks.map((nick, index) => ({ nick, type: result.types[index], version: result.versions[index] }));
    const hand = state.hands.get(handKey(result));
    const checkedNicks = result.fullSnapshot && hand?.handStartedAt === result.handStartedAt
      ? [...hand.nicks] : requestedNicks || [];
    if (Number.isFinite(result.readVersion)) {
      // Names checked by GET are already known from hand start / the outgoing request.
      // An omitted name means NONE, without transmitting NONE entries from backend.
      for (const nick of checkedNicks) {
        if (!result.nicks.some(marked => matchesShkafNickname(nick, marked))) {
          entries.push({ nick, type: enumPoker.playerTypes.NONE, version: result.readVersion });
        }
      }
    }
    entries.forEach(({ nick, type, version }) => {
      if (!nick || !Object.values(enumPoker.playerTypes).includes(type) || !Number.isFinite(version)) return;
      const manual = manualChoice(state, result, nick);
      // Drop conflicting reads/prompts during the grace period; do not replay them at its end.
      if (manual && manual.type !== type) return;
      const expiresAt = activeUntil(state, result, nick);
      if (expiresAt <= Date.now()) return;
      const key = cacheKey(result, nick);
      if ((state.cache.get(key)?.version ?? -1) > version) return;
      state.cache.delete(key);
      state.cache.set(key, { type, version, nick, room: result.room, gametype: result.gametype, expiresAt });
      if (state.cache.size > 4096) state.cache.delete(state.cache.keys().next().value);
    });
    state.matches.clear();
    state.listeners.forEach(listener => listener());
    scheduleExpiry(state);
  };
  state.remember = remember;
  client.on('AdaptPlayersType', remember);
  client.on('AdaptPlayersTypeHand', packet => {
    recordHand(state, packet);
    state.listeners.forEach(listener => listener());
  });
  ['AdaptGetPlayersType', 'AdaptSetPlayersType'].forEach(name => {
    client.on(`${name}Result`, result => {
      const request = result && state.pending.get(result.requestId);
      if (result?.ok) remember(result, name === 'AdaptGetPlayersType' ? request?.nicks : undefined);
      if (!request || request.event !== name) return;
      state.pending.delete(result.requestId);
      clearTimeout(request.timer);
      if (result.ok) request.resolve(result);
      else request.reject(new Error(result.error || 'Не удалось сохранить метку'));
    });
  });
  return state;
}

export function watchPlayerType(client, scope, listener) {
  if (!client) return () => {};
  const state = initializePlayerTypesClient(client);
  recordHand(state, { ...scope, nicks: [scope.nick] });
  if (Number.isFinite(scope.version) && scope.version > 0) {
    state.remember({ ...scope, nicks: [scope.nick], types: [scope.type], versions: [scope.version] });
  }
  const update = () => {
    const stored = findPlayerType(state, scope);
    listener(stored ? stored.type : enumPoker.playerTypes.NONE);
  };
  state.listeners.add(update);
  update();
  return () => state.listeners.delete(update);
}

export function requestPlayerTypes(client, event, payload) {
  if (!client) return Promise.reject(new Error('Нет соединения'));
  const state = initializePlayerTypesClient(client);
  if (event === 'AdaptSetPlayersType') {
    if (!normalizeNickname(payload.nick) || !Object.values(enumPoker.playerTypes).includes(payload.type)) {
      return Promise.reject(new Error('Неизвестный тип игрока'));
    }
    applyManualChoice(state, { payload, order: ++sequence, startedAt: Date.now() });
    // Every subscribed seat immediately compares its nickname using the shared matcher.
    state.listeners.forEach(listener => listener());
    scheduleExpiry(state);
  }
  // Every manual choice must reach native SET, including NONE and repeated choices.
  const { pending } = state;
  return new Promise((resolve, reject) => {
    const requestId = `player-type-${Date.now()}-${++sequence}`;
    const timer = event === 'AdaptSetPlayersType' ? setTimeout(() => {
      pending.delete(requestId);
      reject(new Error('Нет ответа. Попробуйте ещё раз'));
    }, 6000) : null;
    // A repeated GET for this seat supersedes an unanswered one without timing it out.
    for (const [id, previous] of pending) {
      if (previous.event === event && previous.tableId === payload.tableId && previous.chair === payload.chair) {
        clearTimeout(previous.timer);
        pending.delete(id);
        previous.reject(new Error('Запрос заменён новым'));
      }
    }
    pending.set(requestId, { event, resolve, reject, timer, tableId: payload.tableId, chair: payload.chair,
      nicks: payload.nicks, payload: { ...payload }, startedAt: Date.now(), order: sequence });
    try {
      client.emit(event, { ...payload, requestId });
    } catch (error) {
      clearTimeout(timer);
      pending.delete(requestId);
      reject(error);
    }
  });
}
