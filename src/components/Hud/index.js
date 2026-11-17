import React, { createContext, useContext, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DEFAULT_SETTINGS, SETTINGS_KEY, SNAPSHOTS_KEY, GAME_TYPES, FONTS, normalizeSettings,
  readStorage, readSnapshots, hudSize, hudPosition, gameTypeOf, DEMO_SNAPSHOT, exportHudSettings } from './model';
import './style.css';

const HudContext = createContext(null);
const STATS = [
  ['VPIP', 'Добровольное участие в банке, %', 38, 47],
  ['PFR', 'Рейз на префлопе, %', 24, 29],
  ['3BET', 'Ререйз на префлопе, %', 12, 16],
  ['CBET', 'Продолженная ставка на флопе, %', 64, 72],
  ['FOLD', 'Фолд на продолженную ставку, %', 43, 51],
  ['HANDS', 'Количество сыгранных рук', 286, 419],
];

export function HudProvider({ children, capture, onPreview, previewActive }) {
  const [settings, setSettings] = useState(() => normalizeSettings(readStorage(SETTINGS_KEY, DEFAULT_SETTINGS)));
  const [snapshots, setSnapshots] = useState(readSnapshots);
  const [status, setStatus] = useState('');
  function update(patch) {
    setSettings(previous => {
      const next = normalizeSettings(typeof patch === 'function' ? patch(previous) : { ...previous, ...patch });
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); }
      catch (_) { setStatus('Настройки действуют до закрытия: хранилище недоступно.'); }
      return next;
    });
  }
  function save(slot) {
    if (!settings.enabled || previewActive) return;
    try {
      const value = capture();
      const next = { spins: snapshots.spins.map((snapshot, index) => index === slot ? value : snapshot) };
      localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(next));
      setSnapshots(next);
      setStatus(`Состояние стола 0 сохранено в слот ${slot + 1}.`);
    } catch (error) {
      setStatus(error.name === 'QuotaExceededError' ? 'Недостаточно места. Слот не перезаписан.' :
        error.message === 'На столе 0 нет активной игры spins.' ? error.message : 'Не удалось сохранить состояние. Хранилище недоступно.');
    }
  }
  function load(slot) {
    const snapshot = snapshots.spins[slot] || (slot === 0 ? DEMO_SNAPSHOT : null);
    if (!snapshot || !settings.enabled) return;
    onPreview(JSON.parse(JSON.stringify(snapshot)));
    setStatus(snapshots.spins[slot] ? `Загружен слот ${slot + 1}.` : 'Загружен встроенный пример player0–player2.');
  }
  function exportSettings() {
    let url;
    let link;
    try {
      const data = exportHudSettings(settings);
      url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' }));
      link = document.createElement('a');
      link.href = url;
      link.download = `prompter-hud-settings-${data.exportedAt.slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      setStatus('Экспорт настроек в JSON готов.');
    } catch (_) { setStatus('Не удалось экспортировать настройки.'); }
    finally {
      if (link) link.remove();
      if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
  return <HudContext.Provider value={{ settings, update, snapshots, save, load, status, previewActive, exportSettings,
    exitPreview: () => { onPreview(null); setStatus('Показан текущий стол 0.'); } }}>{children}</HudContext.Provider>;
}

export function HudMenu() {
  const hud = useContext(HudContext);
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState(0);
  if (!hud) return null;
  const { settings, update, snapshots, status, previewActive } = hud;
  return createPortal(<aside className={`hud-menu ${open ? 'hud-menu--open' : ''}`} aria-label="Настройки HUD">
    <button type="button" className="sizings-hide hud-menu__toggle" aria-expanded={open} aria-controls="hud-menu-panel"
      onClick={() => setOpen(!open)}>HUD</button>
    <div id="hud-menu-panel" className="hud-menu__panel" inert={open ? undefined : ''} aria-hidden={!open}>
      <div className="hud-menu__heading"><span>Тестовые данные</span></div>
      <div className="hud-menu__games">{GAME_TYPES.map(game => <label key={game}>
        <input type="checkbox" checked={game === 'spins' && settings.enabled} disabled={game !== 'spins'}
          onChange={event => update({ enabled: event.target.checked })}/><span>{game}</span>
      </label>)}</div>
      <label className="hud-menu__field">Шрифт<select aria-label="Шрифт HUD" value={settings.font}
        onChange={event => update({ font: event.target.value })}>
        <option value="prompter">Подсказчик · Arial</option><option value="system">Segoe UI</option>
        <option value="mono">Consolas</option>
      </select></label>
      {[['fontSize', 'Размер шрифта', 12, 36, 'px'], ['opacity', 'Непрозрачность подложки', 0, 100, '%'],
        ['width', 'Ширина', Math.max(110, settings.fontSize * 5 + 20), 280, 'px'],
        ['height', 'Высота', Math.max(60, Math.ceil(settings.fontSize * 2.4 + 20)), 160, 'px']].map(([key, label, min, max, unit]) =>
        <label className="hud-menu__range" key={key}><span>{label}<output>{settings[key]} {unit}</output></span>
          <input aria-label={label} type="range" min={min} max={max} value={settings[key]}
            onChange={event => update({ [key]: +event.target.value })}/></label>)}
      <div className="hud-menu__hint">Перетаскивайте HUD за любую цифру. Положение общее для столов spins.</div>
      <button className="hud-menu__subtle" type="button" onClick={() => update(previous => ({ ...previous,
        positions: { ...previous.positions, spins: {} } }))}>Сбросить позиции</button>
      <button className="hud-menu__subtle hud-menu__export" type="button" onClick={hud.exportSettings}>Экспорт настроек</button>
      <div className="hud-menu__snapshots">
        <div className="hud-menu__heading"><strong>Стол 0</strong><span>{previewActive ? 'Просмотр' : '10 состояний'}</span></div>
        <select aria-label="Слот состояния" value={slot} onChange={event => setSlot(+event.target.value)}>
          {snapshots.spins.map((snapshot, index) => <option key={index} value={index}>
            {index + 1} · {snapshot ? new Date(snapshot.savedAt).toLocaleString() : index === 0 ? 'встроенный пример' : 'пусто'}
          </option>)}
        </select>
        <div className="hud-menu__actions">
          <button type="button" disabled={!settings.enabled || previewActive} onClick={() => hud.save(slot)}>Считать состояние</button>
          <button type="button" disabled={!settings.enabled || (!snapshots.spins[slot] && slot !== 0)}
            onClick={() => hud.load(slot)}>Загрузить тестовое</button>
        </div>
        <p className="hud-menu__hint">{snapshots.spins[slot] ? 'Считывание заменит выбранный слот.' : 'Считайте активный стол в выбранный слот.'}</p>
        {previewActive && <button type="button" className="hud-menu__return" onClick={hud.exitPreview}>Вернуться к живому столу</button>}
      </div>
      <p className="hud-menu__status" role="status">{status}</p>
    </div>
  </aside>, document.body);
}

function Stat({ stat, seat, dragging }) {
  const [anchor, setAnchor] = useState(null);
  const show = event => {
    const rect = event.currentTarget.getBoundingClientRect();
    setAnchor({ left: Math.max(8, Math.min(window.innerWidth - 248, rect.left)),
      top: rect.bottom + 86 < window.innerHeight ? rect.bottom + 8 : Math.max(8, rect.top - 82) });
  };
  return <><button type="button" className="player-hud__stat" aria-label={`${stat[0]}: ${stat[2 + seat % 2]}. ${stat[1]}. Тестовые данные.`}
    onMouseEnter={show} onFocus={show} onMouseLeave={() => setAnchor(null)} onBlur={() => setAnchor(null)}>
    {stat[2 + seat % 2]}
  </button>{anchor && !dragging && createPortal(<div className="hud-tooltip" role="tooltip" style={anchor}>
    <strong>{stat[0]}</strong><span>{stat[1]}</span><small>Тестовые данные</small>
  </div>, document.body)}</>;
}

function PlayerHud({ seat, game, settings, update }) {
  const [moving, setMoving] = useState(null);
  const drag = useRef(null);
  const point = hudPosition(settings, game, seat, moving);
  const size = hudSize(settings);
  const commit = next => update(previous => ({ ...previous,
    positions: { ...previous.positions, [game]: { ...previous.positions[game], [seat]: next } } }));
  const end = event => {
    if (!drag.current || event.pointerId !== drag.current.id) return;
    commit(drag.current.point);
    drag.current = null;
    setMoving(null);
  };
  return <div className="player-hud" data-seat={seat} role="group" aria-label={`HUD игрока ${seat}`}
    style={{ left: point.x, top: point.y, width: size.width, height: size.height,
      fontSize: settings.fontSize, fontFamily: FONTS[settings.font], background: `rgba(23, 29, 37, ${settings.opacity / 100})` }}
    onClick={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()}
    onPointerDown={event => {
      if (event.button !== 0) return;
      event.stopPropagation();
      const table = event.currentTarget.closest('.main-container');
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, origin: point, point,
        scale: table.getBoundingClientRect().width / table.offsetWidth };
      event.currentTarget.setPointerCapture(event.pointerId);
      setMoving(point);
    }} onPointerMove={event => {
      const start = drag.current;
      if (!start || event.pointerId !== start.id) return;
      const next = hudPosition(settings, game, seat, { x: start.origin.x + (event.clientX - start.x) / start.scale,
        y: start.origin.y + (event.clientY - start.y) / start.scale });
      drag.current.point = next;
      setMoving(next);
    }} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
    onKeyDown={event => {
      const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
      if (!delta) return;
      event.preventDefault(); event.stopPropagation();
      const step = event.shiftKey ? 10 : 1;
      commit(hudPosition(settings, game, seat, { x: point.x + delta[0] * step, y: point.y + delta[1] * step }));
    }}>
    {STATS.map(stat => <Stat key={stat[0]} stat={stat} seat={seat} dragging={!!moving}/>)}
  </div>;
}

export function TableHud({ prompt, playersCount }) {
  const hud = useContext(HudContext);
  const game = gameTypeOf(prompt, playersCount);
  if (!hud || !hud.settings.enabled || game !== 'spins') return null;
  return <>{(prompt.players || []).map((player, seat) => player && player.isActive && !player.isHero && seat !== 2
    ? <PlayerHud key={seat} seat={seat} game={game} settings={hud.settings} update={hud.update}/> : null)}</>;
}
