// sharedWS.js — единый файл для сервера и клиента (CommonJS)
// API: client.on/once/off/emit, client.removeAllListeners(), client.disconnect()
// Пинги/понги и таймеры отключены. Никаких фоновых интервалов.
// Ребайнд транспорта после реконнекта, стабильные client.id и client.ip.

'use strict';

// ===== Debug toggles =====
let GLOBAL_DEBUG = true;
let GLOBAL_SIDE  = null; // 'server' | 'client' | null

function enableDebugAll(on = true) { GLOBAL_DEBUG = !!on; }
function setGlobalSide(side)       { GLOBAL_SIDE = side; }

function createDebug(side, id) {
    const prefix = `[${(GLOBAL_SIDE || side) ?? 'unknown'}${id ? ':'+id : ''}]`;
    return {
        log:   (...a) => { if (GLOBAL_DEBUG) console.log(prefix, ...a); },
        warn:  (...a) => { if (GLOBAL_DEBUG) console.warn(prefix, ...a); },
        error: (...a) => { if (GLOBAL_DEBUG) console.error(prefix, ...a); },
    };
}

// ===== Env-safe helpers =====
const HAS_BUFFER    = typeof Buffer !== 'undefined' && typeof Buffer.isBuffer === 'function';
const HAS_TD        = typeof TextDecoder !== 'undefined';
const TEXT_DECODER  = HAS_TD ? new TextDecoder('utf-8') : null;

function decodeArrayBuffer(ab, byteOffset = 0, byteLength = ab.byteLength) {
    if (TEXT_DECODER) return TEXT_DECODER.decode(new Uint8Array(ab, byteOffset, byteLength));
    const view = new Uint8Array(ab, byteOffset, byteLength);
    let s = ''; for (let i = 0; i < view.length; i++) s += String.fromCharCode(view[i]);
    try { return decodeURIComponent(escape(s)); } catch { return s; }
}

// ---- id generator for connections ----
let __connSeq = 0;
function genConnId() {
    const ts = Date.now().toString(36);
    const n  = (__connSeq = (__connSeq + 1) & 0xffff).toString(36);
    return `${ts}-${n}`;
}

// ===== Protocol (служебные локальные события) =====
const MSG = Object.freeze({
    OPEN:  '__open',   // локальный connect
    CLOSE: '__close',  // локальный close
});

// ===== Serialize =====
function pack(event, data) {
    return JSON.stringify({ event, data });
}

// tolerant unpack: string | Buffer | ArrayBuffer | TypedArray | {data:...}
function unpack(raw, dbg) {
    try {
        let payload = raw && raw.data !== undefined ? raw.data : raw;

        if (HAS_BUFFER && Buffer.isBuffer(payload)) {
            payload = payload.toString('utf8');
        } else if (payload instanceof ArrayBuffer) {
            payload = decodeArrayBuffer(payload);
        } else if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView && ArrayBuffer.isView(payload)) {
            payload = decodeArrayBuffer(payload.buffer, payload.byteOffset, payload.byteLength);
        }

        if (typeof payload !== 'string') {
            dbg?.warn('unpack: non-string payload dropped, type=', typeof payload);
            return null;
        }
        const m = JSON.parse(payload);
        if (!m || typeof m.event !== 'string') {
            dbg?.warn('unpack: no event field');
            return null;
        }
        return m;
    } catch (e) {
        dbg?.error('unpack: JSON parse error:', e?.message);
        return null;
    }
}

// ===== IP utils (for server) =====
function normalizeIp(ip) {
    if (!ip) return '';
    if (ip.startsWith('::ffff:')) ip = ip.slice(7);
    if (ip === '::1') return '127.0.0.1';
    return ip;
}
function getClientIp(req, { trustProxy = true } = {}) {
    if (trustProxy) {
        const cf   = req.headers?.['cf-connecting-ip'];
        const tcip = req.headers?.['true-client-ip'];
        const xff  = req.headers?.['x-forwarded-for'];
        const xri  = req.headers?.['x-real-ip'];
        if (cf)   return normalizeIp(cf);
        if (tcip) return normalizeIp(tcip);
        if (xff)  { const first = xff.split(',')[0].trim(); if (first) return normalizeIp(first); }
        if (xri)  return normalizeIp(xri);
    }
    return normalizeIp(req?.socket?.remoteAddress || req?.connection?.remoteAddress || '');
}

// ===== Bus (с поддержкой rebind) =====
function createBus({ send, isOpen, maxQueue = 1000, highWaterMark = 1_000_000, dbg } = {}) {
    const handlers = new Map();   // event -> Set(fn)
    const queue = [];
    let disposeFns = new Set();
    let flushing = false;
    let closed = false;

    // Переназначаемые функции (чтобы rebind работал)
    let sendFn   = send || (()=>{});
    let isOpenFn = isOpen || (()=>false);
    let getBufferedAmount = null;

    function _rebind({ send, isOpen }) {
        if (send)   sendFn = send;
        if (isOpen) isOpenFn = isOpen;
        dbg?.warn('bus rebind done');
    }

    function on(event, fn) {
        if (!handlers.has(event)) handlers.set(event, new Set());
        handlers.get(event).add(fn);
        dbg?.log('on:', event);
        return () => off(event, fn);
    }
    function once(event, fn) {
        const offFn = on(event, (d) => { offFn(); fn(d); });
        return offFn;
    }
    function off(event, fn) {
        handlers.get(event)?.delete(fn);
        dbg?.log('off:', event);
    }
    function offAll() {
        handlers.clear();
        dbg?.log('offAll: all handlers removed');
    }

    function _dispatch(event, data) {
        const set = handlers.get(event);
        if (!set || set.size === 0) { dbg?.log('dispatch: no handlers for', event); return; }
        dbg?.log('dispatch:', event, 'handlers=', set.size);
        for (const fn of Array.from(set)) {
            try { fn(data); } catch (e) { dbg?.error('handler error:', e); }
        }
    }
    function _emitLocal(event, data) { _dispatch(event, data); }

    function emit(event, data) {
        if (closed) { dbg?.warn('emit after close -> drop', event); return; }
        if (isOpenFn?.() && (!getBufferedAmount || getBufferedAmount() <= highWaterMark)) {
            try { sendFn(event, data); dbg?.log('send:', event); return; }
            catch (e) { dbg?.warn('send threw, enqueue:', e?.message, event); }
        }
        queue.push({ event, data });
        if (queue.length > maxQueue) queue.shift();
        dbg?.log('enqueue:', event, 'q=', queue.length);
        _scheduleFlush();
    }

    function _scheduleFlush() {
        if (flushing) return;
        flushing = true;
        setTimeout(_flush, 0);
    }
    function _flush() {
        flushing = false;
        if (!isOpenFn?.()) { dbg?.log('flush: not open, skip'); return; }
        while (queue.length) {
            if (getBufferedAmount && getBufferedAmount() > highWaterMark) {
                dbg?.log('flush: backpressure, retry');
                setTimeout(_flush, 10);
                return;
            }
            const { event, data } = queue.shift();
            try { sendFn(event, data); dbg?.log('flush->send:', event, 'left=', queue.length); }
            catch (e) {
                dbg?.warn('flush send failed, requeue:', e?.message, event);
                queue.unshift({ event, data });
                setTimeout(_flush, 10);
                return;
            }
        }
    }

    function _setBufferedAmountGetter(fn) { getBufferedAmount = fn; }
    function addDisposer(fn) { disposeFns.add(fn); }
    function clearQueue() { queue.length = 0; dbg?.log('queue cleared'); }

    function close() {
        closed = true;
        clearQueue();
        offAll();
        for (const fn of disposeFns) { try { fn(); } catch {} }
        disposeFns.clear();
        dbg?.log('bus closed');
    }

    return {
        on, once, off, offAll,
        emit, _dispatch, _emitLocal,
        _flush: _scheduleFlush,
        _setBufferedAmountGetter, addDisposer, clearQueue, close,
        _rebind, // ВАЖНО: внешний rebind
    };
}

// ===== socket.io-like client wrapper =====
function makeClient(bus, disconnectImpl) {
    const mapIn = (ev) => (ev === 'connect' ? MSG.OPEN : ev);
    return {
        on:   (ev, fn)  => bus.on(mapIn(ev), fn),
        once: (ev, fn)  => bus.once(mapIn(ev), fn),
        off:  (ev, fn)  => bus.off(mapIn(ev), fn),
        emit: (ev, data)=> bus.emit(ev, data),
        removeAllListeners: () => bus.offAll(),
        disconnect: (opts) => disconnectImpl?.(opts),
        __OPEN: MSG.OPEN,
        __CLOSE: MSG.CLOSE,
    };
}

// ===== bindWS (both sides, без heartbeat) =====
function bindWS(ws, {
    role = 'server',
    bus: externalBus,
    debugSide = role,
    debugId,
    req,              // HTTP IncomingMessage из wss.on('connection', (ws, req) => ...)
    connectionId,     // если хочешь сам задать id
} = {}) {
    const dbg = createDebug(debugSide, debugId);

    const isNodeWS = typeof ws?.readyState === 'number' && typeof ws?.send === 'function';
    const OPEN = isNodeWS ? ws.OPEN : (typeof WebSocket !== 'undefined' ? WebSocket.OPEN : 1);

    // --- stable connection id + peer info ---
    const id = connectionId || ws.__connId || genConnId();
    ws.__connId = id;
    const peerIp = (() => {
        try {
            if (req && req.headers) {
                const xff = req.headers['x-forwarded-for'];
                if (xff) return normalizeIp(xff.split(',')[0].trim());
                const xri = req.headers['x-real-ip'];
                if (xri) return normalizeIp(xri);
            }
        } catch {}
        const ra = ws._socket?.remoteAddress || ws.socket?.remoteAddress || req?.socket?.remoteAddress;
        return normalizeIp(ra || '');
    })();

    // создаём или ребиндим существующий bus
    const bus = externalBus ?? createBus({
        send: (event, data) => ws.send(pack(event, data)),
        isOpen: () => ws.readyState === OPEN,
        dbg,
    });

    if (externalBus) {
        bus._rebind({
            send:  (event, data) => ws.send(pack(event, data)),
            isOpen: () => ws.readyState === OPEN,
        });
    }

    // метим bus идентификатором
    bus.id = id;
    bus._setBufferedAmountGetter(() =>
        typeof ws?.bufferedAmount === 'number' ? ws.bufferedAmount : 0
    );

    const onMessage = (raw) => {
        dbg.log('raw message type=', typeof raw, 'isBuffer=', (HAS_BUFFER && Buffer.isBuffer(raw)));
        const m = unpack(raw, dbg);
        if (!m) return;
        bus._dispatch(m.event, m.data);
    };

    const onOpen = () => {
        dbg.log('OPEN');
        bus._emitLocal(MSG.OPEN);
        setTimeout(() => bus._flush(), 0);
    };

    const onClose = (evtOrCode, maybeReason) => {
        let code, reason, wasClean;
        if (typeof evtOrCode === 'object' && evtOrCode !== null && 'code' in evtOrCode) {
            code = evtOrCode.code;
            wasClean = !!evtOrCode.wasClean;
            reason = typeof evtOrCode.reason === 'string' ? evtOrCode.reason : '';
        } else {
            code = typeof evtOrCode === 'number' ? evtOrCode : undefined;
            wasClean = undefined;
            reason = typeof maybeReason === 'string'
                ? maybeReason
                : (HAS_BUFFER && Buffer.isBuffer(maybeReason) ? maybeReason.toString('utf8') : '');
        }
        dbg.warn('CLOSE', { code, wasClean, reason });
        bus._emitLocal('disconnect', { code, reason, wasClean });
        bus._emitLocal(MSG.CLOSE);
    };

    if (typeof ws.on === 'function') {
        ws.on('message', onMessage);
        ws.on('open', onOpen);
        ws.on('close', onClose);
        ws.on('error', (e) => dbg.error('ws error:', e?.message));
        bus.addDisposer(() => {
            ws.off?.('message', onMessage);
            ws.off?.('open', onOpen);
            ws.off?.('close', onClose);
        });
    } else {
        ws.onmessage = onMessage;
        ws.onopen = onOpen;
        ws.onclose = onClose;
        ws.onerror = (e) => dbg.error('ws error:', e?.message);
        bus.addDisposer(() => { ws.onmessage = ws.onopen = ws.onclose = ws.onerror = null; });
    }

    function disconnect({ removeAllListeners = true } = {}) {
        dbg.warn('disconnect() called');
        if (removeAllListeners) bus.offAll();
        bus.clearQueue();
        try { ws.close?.(); } catch {}
        if (isNodeWS && ws.terminate && ws.readyState !== ws.CLOSED) { try { ws.terminate(); } catch {} }
        bus.close();
    }

    const client = makeClient(bus, disconnect);
    client.id = id;
    client.ip = peerIp;

    return { client, bus, disconnect };
}

// ===== reconnecting client (без лишних обработчиков) =====
function connectWithReconnect(url, WebSocketCtor, {
    protocols,
    role = 'client',
    maxDelayMs = 15_000,
    initialBackoff = 500,
    timeout = 60_000,
    reconnection = true,
    makeWS,
    debugId,
} = {}) {
    const dbg = createDebug('client', debugId);

    let ws = null;
    let disposed = false;
    let backoff = initialBackoff;
    let connectTimer = null;
    let handlersBound = false;

    // один и тот же bus переиспользуем, НО его ребиндит bindWS
    const bus = createBus({ send: () => {}, isOpen: () => false, dbg });
    const client = makeClient(bus, disconnect);

    function bindBusHandlersOnce() {
        if (handlersBound) return;
        handlersBound = true;

        bus.on(MSG.OPEN, () => {
            clearTimeout(connectTimer);
            backoff = initialBackoff;
            dbg.log('CONNECTED');
            bus._flush();
        });

        bus.on(MSG.CLOSE, () => {
            clearTimeout(connectTimer);
            if (!reconnection || disposed) return;
            const delay = Math.min(backoff, maxDelayMs);
            dbg.warn('will reconnect in', delay, 'ms');
            backoff = Math.min(backoff * 2, maxDelayMs);
            setTimeout(open, delay);
        });
    }

    function open() {
        if (disposed) return;
        dbg.log('open to', url);
        ws = makeWS ? makeWS(url, protocols) : new WebSocketCtor(url, protocols);
        bindWS(ws, { role, bus, debugSide: 'client', debugId });

        bindBusHandlersOnce();

        clearTimeout(connectTimer);
        connectTimer = setTimeout(() => {
            dbg.warn('connect timeout -> closing to retry');
            try { ws.close?.(); } catch {}
        }, timeout);
    }

    function disconnect({ removeAllListeners = true } = {}) {
        dbg.warn('client.disconnect() called');
        disposed = true;
        clearTimeout(connectTimer);
        bus.clearQueue();
        if (removeAllListeners) bus.offAll();
        try { ws?.close?.(); } catch {}
        bus.close();
    }

    open();
    return { client, bus, disconnect };
}

// ===== Exports =====
module.exports = {
    // high-level:
    bindWS,
    connectWithReconnect,

    // low-level / utils:
    MSG, pack, unpack,
    createBus,
    normalizeIp, getClientIp,
    getClientId: (c) => c && (c.id || c.__id || c.clientId),
    sameClient:  (a, b) => !!(a && b) && ((a.id || a.__id) === (b.id || b.__id)),

    // debug control:
    enableDebugAll, setGlobalSide,
};
