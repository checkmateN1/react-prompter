// sharedWS.js — общий для сервера и браузера (CommonJS)
// API: connectWithReconnect(url, WebSocketCtor, opts) -> { client, bus, disconnect }
//      bindWS(ws, opts) -> { client, bus, disconnect }
// client.on/once/off/emit/removeAllListeners/ disconnect()
// Очередь хранит сериализованные СНИМКИ; unique listeners; дедуп по _id; heartbeat off.

'use strict';

// ===== Флаги =====
let GLOBAL_DEBUG = false;                   // верни в false на проде
const UNIQUE_LISTENERS = true;             // один слушатель на событие
const DEDUPE_WINDOW = 2000;                // дедуп на последние N id
const WATCH_DELIVERED_MUTATIONS = false;   // сторож за мутациями после доставки

// ===== Утилиты логов =====
function createDebug(side, id) {
    const prefix = `[${side}${id ? ':' + id : ''}]`;
    return {
        log:   (...a) => { if (GLOBAL_DEBUG) console.log(prefix, ...a); },
        warn:  (...a) => { if (GLOBAL_DEBUG) console.warn(prefix, ...a); },
        error: (...a) => { if (GLOBAL_DEBUG) console.error(prefix, ...a); },
    };
}

// ===== ENV helpers =====
const HAS_BUFFER   = typeof Buffer !== 'undefined' && typeof Buffer.isBuffer === 'function';
const HAS_TD       = typeof TextDecoder !== 'undefined';
const TEXT_DECODER = HAS_TD ? new TextDecoder('utf-8') : null;

function decodeArrayBuffer(ab, byteOffset = 0, byteLength = ab.byteLength) {
    if (TEXT_DECODER) return TEXT_DECODER.decode(new Uint8Array(ab, byteOffset, byteLength));
    const view = new Uint8Array(ab, byteOffset, byteLength);
    let s = ''; for (let i = 0; i < view.length; i++) s += String.fromCharCode(view[i]);
    try { return decodeURIComponent(escape(s)); } catch { return s; }
}

// ===== Node-only: запись «карточек смерти» рядом с файлом =====
function logDisconnectSnapshot(ctx = {}) {
    // В браузере/без require — ничего не делаем
    if (typeof require !== 'function') return;

    let fs, path;
    try { fs = require('fs'); path = require('path'); } catch { return; }

    const {
        role = 'server',
        id = '',
        ip = '',
        code,
        wasClean,
        reason = '',
        ws,
        extra = {},
    } = ctx;

    const file = path.join(path.dirname(__filename), 'sharedWS.disconnect.log');

    const now = new Date().toISOString();
    const ready = (ws && typeof ws.readyState === 'number') ? ws.readyState : 'n/a';
    const buffered = (ws && typeof ws.bufferedAmount === 'number') ? ws.bufferedAmount : 'n/a';

    let hint = '';
    if (code === 1000) hint = 'normal close';
    else if (code === 1005 || code === undefined) hint = 'no status (likely abrupt/throw)';
    else if (code === 1006) hint = 'abnormal close (peer drop/timeout)';
    else if (code === 1001) hint = 'going away (restart/deploy?)';

    const kv = [];
    kv.push(`[${now}] ${role} id=${id} ip=${ip}`);
    kv.push(`code=${code ?? '—'} clean=${wasClean ?? '—'} ready=${ready} buf=${buffered}`);
    if (reason) kv.push(`reason="${String(reason).slice(0,200)}"`);
    if (hint)   kv.push(`hint=${hint}`);
    if (extra && extra.note)   kv.push(`note="${String(extra.note).slice(0,200)}"`);
    if (extra && extra.url)    kv.push(`url="${String(extra.url).slice(0,300)}"`);
    if (extra && extra.attempt!==undefined) kv.push(`attempt=${extra.attempt}`);
    if (extra && extra.ready!==undefined)   kv.push(`wsReady=${extra.ready}`);
    if (extra && extra.buffered!==undefined) kv.push(`wsBuf=${extra.buffered}`);

    const line = kv.join(' ');

    try { fs.appendFileSync(file, line + '\n', { encoding: 'utf8' }); } catch {}
}

// один раз при инициализации sharedWS (Node)
if (typeof process !== 'undefined') {
    process.on('uncaughtException', (e) =>
        logDisconnectSnapshot({ role: 'server', id: 'proc', code: 1011, reason: 'uncaughtException', extra:{ note:'proc', stack:String(e.stack||e).slice(0,800) }}));
    process.on('unhandledRejection', (e) =>
        logDisconnectSnapshot({ role: 'server', id: 'proc', code: 1011, reason: 'unhandledRejection', extra:{ note:'proc', stack:String(e&&e.stack||e).slice(0,800) }}));
}

// ===== ID =====
let __connSeq = 0, __msgSeq = 0;
const genConnId = () => `${Date.now().toString(36)}-${(++__connSeq & 0xffff).toString(36)}`;
const genMsgId  = () => `m${Date.now().toString(36)}-${(++__msgSeq & 0xffff).toString(36)}`;

// ===== Служебные события локально =====
const MSG = Object.freeze({ OPEN: '__open', CLOSE: '__close' });

// ===== Сериализация =====
function pack(event, data, _id = genMsgId()) {
    return JSON.stringify({ event, data, _id });
}
function unpack(raw, dbg) {
    try {
        let payload = raw && raw.data !== undefined ? raw.data : raw;
        if (HAS_BUFFER && Buffer.isBuffer(payload)) payload = payload.toString('utf8');
        else if (payload instanceof ArrayBuffer) payload = decodeArrayBuffer(payload);
        else if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView?.(payload))
            payload = decodeArrayBuffer(payload.buffer, payload.byteOffset, payload.byteLength);
        if (typeof payload !== 'string') { dbg?.warn('unpack: non-string payload type=', typeof payload); return null; }
        const m = JSON.parse(payload);
        if (!m || typeof m.event !== 'string') { dbg?.warn('unpack: no event'); return null; }
        return m;
    } catch (e) { dbg?.error('unpack JSON error:', e?.message); return null; }
}

// ===== IP utils (сервер) =====
function normalizeIp(ip) {
    if (!ip) return '';
    if (ip.startsWith('::ffff:')) ip = ip.slice(7);
    if (ip === '::1') return '127.0.0.1';
    return ip;
}
function getClientIp(req, { trustProxy = true } = {}) {
    if (trustProxy) {
        const cf=req?.headers?.['cf-connecting-ip'], tcip=req?.headers?.['true-client-ip'];
        const xff=req?.headers?.['x-forwarded-for'], xri=req?.headers?.['x-real-ip'];
        if (cf) return normalizeIp(cf);
        if (tcip) return normalizeIp(tcip);
        if (xff)  { const first = xff.split(',')[0].trim(); if (first) return normalizeIp(first); }
        if (xri)  return normalizeIp(xri);
    }
    return normalizeIp(req?.socket?.remoteAddress || req?.connection?.remoteAddress || '');
}

// ===== Диагностика мутаций =====
function makeWatchdog(obj, path = 'data', { throwOnWrite = true, log = console } = {}) {
    if (!obj || typeof obj !== 'object') return obj;
    const seen = new WeakSet();
    const wrap = (t, p) => {
        if (!t || typeof t !== 'object' || seen.has(t)) return t;
        seen.add(t);
        return new Proxy(t, {
            set(target, prop, value) {
                const where = `${p}.${String(prop)}`;
                try {
                    const err = new Error(`Mutation at ${where}`);
                    log.error(`[WS-PAYLOAD-MUTATION] ${where}`, err.stack?.split('\n').slice(1,10).join('\n'));
                } catch {}
                if (throwOnWrite) throw new Error(`WS payload is readonly; write at ${where}`);
                return Reflect.set(target, prop, wrap(value, where));
            },
            deleteProperty(target, prop) {
                const where = `${p}.${String(prop)}`;
                try {
                    const err = new Error(`Delete at ${where}`);
                    log.error(`[WS-PAYLOAD-MUTATION-DELETE] ${where}`, err.stack?.split('\n').slice(1,10).join('\n'));
                } catch {}
                if (throwOnWrite) throw new Error(`WS payload is readonly; delete at ${where}`);
                return Reflect.deleteProperty(target, prop);
            },
            get(target, prop, recv) {
                const v = Reflect.get(target, prop, recv);
                return wrap(v, `${p}.${String(prop)}`);
            }
        });
    };
    return wrap(obj, path);
}
function integrityHash(x){ try{ return JSON.stringify(x);}catch{ return String(x);} }
function snapshotArr(a){ return Array.isArray(a) ? a.slice(0) : a; }

// ===== Шина =====
function createBus({ send, isOpen, maxQueue = 1000, highWaterMark = 1_000_000, dbg } = {}) {
    const handlers = new Map();
    const queue = [];
    const disposers = new Set();
    let closed = false, flushing = false;
    let sendFn = send || (()=>{}), isOpenFn = isOpen || (()=>false), getBufferedAmount = null;

    function _rebind({ send, isOpen }) { if (send) sendFn = send; if (isOpen) isOpenFn = isOpen; dbg?.warn('bus rebind done'); }
    function on(ev, fn){ if (UNIQUE_LISTENERS){ const s=new Set(); s.add(fn); handlers.set(ev,s); } else { if(!handlers.has(ev)) handlers.set(ev,new Set()); handlers.get(ev).add(fn);} dbg?.log('on:',ev); return ()=>off(ev,fn);}
    function once(ev,fn){ const offFn=on(ev,(d)=>{offFn();fn(d);}); return offFn; }
    function off(ev,fn){ const s=handlers.get(ev); if(s){ s.delete(fn); if(!s.size) handlers.delete(ev);} dbg?.log('off:',ev); }
    function offAll(){ handlers.clear(); dbg?.log('offAll'); }
    function _dispatch(ev,data){ const s=handlers.get(ev); if(!s||!s.size){ dbg?.log('dispatch: no handlers for',ev); return;} dbg?.log('dispatch:',ev,'handlers=',s.size); for(const fn of Array.from(s)){ try{ fn(data);}catch(e){ dbg?.error('handler error:',e); } } }
    function _emitLocal(ev,data){ _dispatch(ev,data); }
    function sendFrame(frame){ sendFn && sendFn('__RAW__', frame); }

    function emit(ev, data){
        if (closed){ dbg?.warn('emit after close drop', ev); return; }
        const frame = pack(ev, data);                  // СНИМОК на момент emit
        if (isOpenFn?.() && (!getBufferedAmount || getBufferedAmount() <= highWaterMark)){
            try { sendFrame(frame); dbg?.log('send:', ev); return; }
            catch(e){ dbg?.warn('send threw -> enqueue', e?.message, ev); }
        }
        queue.push({ ev, frame });
        if (queue.length > maxQueue) queue.shift();
        dbg?.log('enqueue:', ev, 'q=', queue.length);
        _scheduleFlush();
    }

    function _scheduleFlush(){ if (flushing) return; flushing = true; setTimeout(_flush, 0); }
    function _flush(){
        flushing = false;
        if (!isOpenFn?.()){ dbg?.log('flush: not open'); return; }
        while (queue.length){
            if (getBufferedAmount && getBufferedAmount() > highWaterMark){ dbg?.log('flush: backpressure'); setTimeout(_flush,10); return; }
            const { ev, frame } = queue.shift();
            try { sendFrame(frame); dbg?.log('flush->send:', ev, 'left=', queue.length); }
            catch(e){ dbg?.warn('flush send failed -> retry', e?.message, ev); queue.unshift({ ev, frame }); setTimeout(_flush,10); return; }
        }
    }

    function _setBufferedAmountGetter(fn){ getBufferedAmount = fn; }
    function addDisposer(fn){ disposers.add(fn); }
    function clearQueue(){ queue.length=0; dbg?.log('queue cleared'); }
    function close(){ closed=true; clearQueue(); offAll(); for(const fn of disposers){ try{fn();}catch{} } disposers.clear(); dbg?.log('bus closed'); }

    return { on, once, off, offAll, emit, _dispatch, _emitLocal, _flush: _scheduleFlush, _setBufferedAmountGetter, addDisposer, clearQueue, close, _rebind };
}

// ===== Клиент-обёртка =====
function makeClient(bus, disconnectImpl){
    const mapIn = (ev) => (ev === 'connect' ? MSG.OPEN : ev);
    return {
        on:   (ev,fn)=>bus.on(mapIn(ev),fn),
        once: (ev,fn)=>bus.once(mapIn(ev),fn),
        off:  (ev,fn)=>bus.off(mapIn(ev),fn),
        emit: (ev,data)=>bus.emit(ev,data),
        removeAllListeners: ()=>bus.offAll(),
        disconnect: (opts)=>disconnectImpl?.(opts),
        __OPEN: MSG.OPEN, __CLOSE: MSG.CLOSE,
    };
}

// ===== bindWS =====
function bindWS(ws, { role='server', bus: externalBus, debugSide=role, debugId, req, connectionId } = {}){
    const dbg = createDebug(debugSide, debugId);
    const isNodeWS = typeof ws?.readyState === 'number' && typeof ws?.send === 'function';
    const OPEN = isNodeWS ? ws.OPEN : (typeof WebSocket !== 'undefined' ? WebSocket.OPEN : 1);

    const id = connectionId || ws.__connId || genConnId(); ws.__connId = id;

    const peerIp = (()=>{ try{
        if (req?.headers){
            const xff=req.headers['x-forwarded-for']; if (xff) return normalizeIp(xff.split(',')[0].trim());
            const xri=req.headers['x-real-ip']; if (xri) return normalizeIp(xri);
        }
    }catch{} const ra=ws._socket?.remoteAddress||ws.socket?.remoteAddress||req?.socket?.remoteAddress; return normalizeIp(ra||''); })();

    const bus = externalBus ?? createBus({
        send: (ev, dataOrFrame) => { if (ev==='__RAW__') return ws.send(dataOrFrame); return ws.send(pack(ev, dataOrFrame)); },
        isOpen: () => ws.readyState === OPEN, dbg,
    });
    if (externalBus){
        bus._rebind({
            send: (ev, dataOrFrame) => { if (ev==='__RAW__') return ws.send(dataOrFrame); return ws.send(pack(ev, dataOrFrame)); },
            isOpen: () => ws.readyState === OPEN,
        });
    }
    bus.id = id;
    bus._setBufferedAmountGetter(()=> typeof ws?.bufferedAmount === 'number' ? ws.bufferedAmount : 0);

    // дедуп по _id
    const seen = new Set(); const order = [];
    const remember = (mid) => { if (!mid) return false; if (seen.has(mid)) return true; seen.add(mid); order.push(mid); if (order.length > DEDUPE_WINDOW){ const old=order.shift(); seen.delete(old);} return false; };

    const onMessage = (raw) => {
        if (raw && raw.length > 20) {
            const isFrameCompressed = raw.toString('ascii', 0, 16) === 'frame_compressed';
            if (isFrameCompressed) {
                bus._dispatch('frame_compressed', raw.subarray(20));
                return;
            }
        }

        dbg.log('raw message type=', typeof raw, 'isBuffer=', (HAS_BUFFER && Buffer.isBuffer(raw)));
        const m = unpack(raw, dbg);
        if (!m) return;

        // Лог снимка (не «живого» объекта)
        if (GLOBAL_DEBUG) console.log('[RX-RAW]', m.event, m._id, snapshotArr(m?.data?.checkedCards));

        if (remember(m._id)) { dbg.warn('dedup: drop', m.event, m._id); return; }

        // 1) снимок доставляемых данных
        let delivered = m.data;
        delivered = (typeof structuredClone === 'function') ? structuredClone(delivered)
            : JSON.parse(JSON.stringify(delivered));

        // 2) watchdog — падение при любой мутации + стек виновника
        if (WATCH_DELIVERED_MUTATIONS) delivered = makeWatchdog(delivered, `event(${m.event})`);

        // 3) интегрити-чек: до/после хендлера
        const before = integrityHash(delivered);
        try {
            bus._dispatch(m.event, delivered);
        } catch (err) {
            logDisconnectSnapshot({
                role,
                id,
                ip: peerIp,
                code: 1011,                // server error — видно в логах
                wasClean: false,
                reason: 'handler-throw',
                ws,
                extra: {
                    note: `dispatch crash @${m.event}`,
                    stack: String(err && err.stack || err).slice(0, 800),
                },
            });
            try { ws.close?.(1011, 'handler-error'); } catch {}
            throw err;
        }
        const after  = integrityHash(delivered);
        if (before !== after) {
            console.error('[WS-PAYLOAD-MUTATED-BY-HANDLER]', m.event, { before: JSON.parse(before), after: JSON.parse(after) });
        }
    };

    const onOpen  = () => { dbg.log('OPEN'); bus._emitLocal(MSG.OPEN); setTimeout(()=>bus._flush(),0); };
    const onClose = (evtOrCode, maybeReason) => {
        let code, reason, wasClean;
        if (typeof evtOrCode === 'object' && evtOrCode !== null && 'code' in evtOrCode){
            code = evtOrCode.code; wasClean = !!evtOrCode.wasClean; reason = typeof evtOrCode.reason === 'string' ? evtOrCode.reason : '';
        } else {
            code = typeof evtOrCode === 'number' ? evtOrCode : undefined;
            wasClean = undefined;
            reason = typeof maybeReason === 'string' ? maybeReason
                : (HAS_BUFFER && Buffer.isBuffer(maybeReason) ? maybeReason.toString('utf8') : '');
        }

        logDisconnectSnapshot({ role, id, ip: peerIp, code, wasClean, reason, ws });

        dbg.warn('CLOSE', { code, wasClean, reason });
        bus._emitLocal('disconnect', { code, reason, wasClean });
        bus._emitLocal(MSG.CLOSE);
    };

    if (typeof ws.on === 'function'){
        ws.on('message', onMessage); ws.on('open', onOpen); ws.on('close', onClose);
        ws.on('error', (e) => {
            dbg.error('ws error:', e?.message);
            logDisconnectSnapshot({
                role, id, ip: peerIp, code: 1006, wasClean: false,
                reason: 'ws-error', ws,
                extra:{ stack:String(e && e.stack || e).slice(0,800) }
            });
        });
        bus.addDisposer(()=>{ ws.off?.('message', onMessage); ws.off?.('open', onOpen); ws.off?.('close', onClose); });
    } else {
        ws.onmessage = onMessage; ws.onopen = onOpen; ws.onclose = onClose;
        ws.onerror = (e)=>createDebug('client', debugId).error('ws error:', e?.message);
        bus.addDisposer(()=>{ ws.onmessage = ws.onopen = ws.onclose = ws.onerror = null; });
    }

    function disconnect({ removeAllListeners = true } = {}) {
        dbg.warn('disconnect()'); if (removeAllListeners) bus.offAll(); bus.clearQueue();
        try{ ws.close?.(); }catch{} if (isNodeWS && ws.terminate && ws.readyState !== ws.CLOSED){ try{ ws.terminate(); }catch{} }
        bus.close();
    }

    const client = makeClient(bus, disconnect); client.id = id; client.ip = peerIp;
    return { client, bus, disconnect };
}

// ===== Клиент с реконнектом =====
function connectWithReconnect(url, WebSocketCtor, {
    protocols, role='client', maxDelayMs=15_000, initialBackoff=500,
    timeout=120_000, reconnection=true, makeWS, debugId,
} = {}){
    const dbg = createDebug('client', debugId);
    let ws=null, disposed=false, backoff=initialBackoff, connectTimer=null, handlersBound=false;
    let attempt = 0; // DIAG: нумерация попыток

    const bus = createBus({ send:()=>{}, isOpen:()=>false, dbg });
    const client = makeClient(bus, disconnect);

    function bindBusHandlersOnce(){
        if (handlersBound) return; handlersBound = true;
        bus.on(MSG.OPEN,  ()=>{ clearTimeout(connectTimer); backoff=initialBackoff; dbg.log('CONNECTED'); bus._flush(); });
        bus.on(MSG.CLOSE, ()=>{ clearTimeout(connectTimer); if(!reconnection||disposed) return;
            const delay=Math.min(backoff,maxDelayMs); dbg.warn('will reconnect in',delay,'ms'); backoff=Math.min(backoff*2,maxDelayMs); setTimeout(open,delay);
        });
        bus.on('disconnect', ()=>{ clearTimeout(connectTimer); });
    }

    function open(){
        if (disposed) return;
        attempt += 1;

        dbg.log('open to', url, 'attempt', attempt);
        ws = makeWS ? makeWS(url, protocols) : new WebSocketCtor(url, protocols);

        // Привязываем и после этого bus.id уже известен — логируем попытку
        bindWS(ws, { role, bus, debugSide:'client', debugId });
        bindBusHandlersOnce();

        // DIAG: зафиксировать попытку подключения в файл (Node-only)
        logDisconnectSnapshot({
            role, id: bus.id || 'pending', ws: null,
            reason: 'connect-attempt',
            extra: { note: `attempt=${attempt}`, url: String(url), attempt }
        });

        clearTimeout(connectTimer);
        connectTimer = setTimeout(()=>{
            // если уже OPEN — ничего не делаем, но логируем факт
            if (ws && ws.readyState === 1 /* OPEN */) {
                logDisconnectSnapshot({
                    role, id: bus.id || 'pending', ws: null,
                    reason: 'connect-timeout-ignored-open',
                    extra: { note: `attempt=${attempt}`, url: String(url), attempt }
                });
                return;
            }
            // DIAG: таймаут — закрываем и пишем метрику
            logDisconnectSnapshot({
                role, id: bus.id || 'pending', ws,
                reason: 'connect-timeout-closing',
                extra: {
                    note: `attempt=${attempt}`, url: String(url), attempt,
                    ready: ws?.readyState, buffered: ws?.bufferedAmount
                }
            });
            try { ws?.close?.(); } catch {}
        }, timeout);
    }

    function disconnect({ removeAllListeners = true } = {}) {
        dbg.warn('client.disconnect()');
        disposed=true; clearTimeout(connectTimer); bus.clearQueue(); if(removeAllListeners) bus.offAll();
        try{ ws?.close?.(); }catch{}; bus.close();
    }

    open();
    return { client, bus, disconnect };
}

// ===== Экспорт =====
module.exports = {
    bindWS, connectWithReconnect,
    MSG, pack, unpack, createBus,
    normalizeIp, getClientIp,
    getClientId: (c)=>c && (c.id || c.__id || c.clientId),
    sameClient: (a,b)=>!!(a&&b)&&((a.id||a.__id)===(b.id||b.__id)),
};
