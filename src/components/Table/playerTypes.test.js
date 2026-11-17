import React from 'react';
import ReactDOM from 'react-dom';
import { act, Simulate } from 'react-dom/test-utils';
import PlayerTypeNickname from './PlayerTypeNickname';
import { PlayerTypesClientContext, initializePlayerTypesClient, resetPlayerTypesClient } from './playerTypesClient';

// Exercise the protocol independently of the legacy preview setting.
jest.mock('../../enum', () => ({ enumPoker: { ...jest.requireActual('../../enum').enumPoker,
  playerTypesLocalPreview: false } }));

describe('player type palette', () => {
  let root, client, handlers, report, responseVersion;
  const playerType = { room: 'GG', gametype: 0, nick: 'full-nickname-1234567890', type: -1,
    version: 1, handStartedAt: 1000000, serverNow: 1000000 };
  const render = (props = {}) => act(() => { ReactDOM.render(
    <PlayerTypesClientContext.Provider value={client}>
      <div onDoubleClick={report}><PlayerTypeNickname className="nickname" playerType={playerType}
        tableId={0} handNumber={100} chair={1} isHero={false} {...props}>1234567890</PlayerTypeNickname></div>
    </PlayerTypesClientContext.Provider>, root); });
  const receive = async (event, result = {}) => {
    const [, payload] = client.emit.mock.calls.filter(([name]) => name === event).slice(-1)[0];
    await act(async () => handlers[`${event}Result`]({ ...payload, nicks: payload.nicks || [payload.nick], requestId: payload.requestId,
      ok: true, types: [-1], versions: [++responseVersion], ...result }));
  };
  beforeEach(() => {
    jest.useFakeTimers('modern');
    jest.setSystemTime(1000000);
    responseVersion = 1;
    root = document.createElement('div');
    document.body.appendChild(root);
    handlers = {};
    client = { on: (name, callback) => { handlers[name] = data => callback({ handStartedAt: 1000000,
      serverNow: Date.now(), ...data }); }, emit: jest.fn() };
    report = jest.fn();
  });
  afterEach(() => {
    act(() => { ReactDOM.unmountComponentAtNode(root); });
    root.remove();
    jest.clearAllTimers();
    jest.useRealTimers();
  });
  const open = () => act(() => Simulate.doubleClick(root.querySelector('.nickname')));

  test('click updates all matching tables immediately, survives timeout/reconnect and NONE resets five minutes', async () => {
    const seats = [
      { nick: 'Gabibbo1' }, { nick: 'Gabibbo]' }, { nick: 'CompletelyDifferent' },
      { nick: 'Gabibbo1', room: 'IP' }, { nick: 'Gabibbo1', gametype: 1 },
    ];
    act(() => { ReactDOM.render(<PlayerTypesClientContext.Provider value={client}>
      {seats.map((seat, tableId) => <PlayerTypeNickname key={tableId} className="nickname"
        tableId={tableId} handNumber={100} chair={1}
        playerType={{ ...playerType, ...seat }}>{seat.nick}</PlayerTypeNickname>)}
    </PlayerTypesClientContext.Provider>, root); });
    const shadows = () => [...root.querySelectorAll('.nickname')].map(node => node.style.getPropertyValue("--player-type-accent"));
    open();
    act(() => Simulate.click(document.querySelector('[aria-label="Фиш"]')));
    expect(shadows().slice(0, 2)).toEqual(Array(2).fill(expect.stringContaining('#32ba69')));
    expect(shadows().slice(2)).toEqual(['', '', '']);
    // No SET reply at all: the six-second save timeout cannot undo the local choice.
    await act(async () => { jest.advanceTimersByTime(6000); });
    act(() => resetPlayerTypesClient(client));
    act(() => handlers.AdaptPlayersType({ tableId: 1, room: 'GG', gametype: 0,
      handStartedAt: Date.now(), nicks: ['Gabibbo]'], types: [0], versions: [500] }));
    expect(shadows().slice(0, 2)).toEqual(Array(2).fill(expect.stringContaining('#32ba69')));
    await act(async () => { jest.advanceTimersByTime(293999); });
    expect(shadows()[1]).toContain('#32ba69');
    open();
    act(() => Simulate.click(document.querySelector('[aria-label="Без типа"]')));
    expect(shadows()).toEqual(['', '', '', '', '']);
    await receive('AdaptSetPlayersType', { ok: false, error: 'Addon unavailable' });
    await act(async () => { jest.advanceTimersByTime(299999); });
    act(() => handlers.AdaptPlayersType({ tableId: 1, room: 'GG', gametype: 0,
      handStartedAt: Date.now(), nicks: ['Gabibbo]'], types: [2], versions: [501] }));
    expect(shadows()).toEqual(['', '', '', '', '']);
    act(() => { jest.advanceTimersByTime(1); });
    // A conflicting result from inside the protected period is not replayed.
    expect(shadows()).toEqual(['', '', '', '', '']);
    act(() => handlers.AdaptPlayersType({ tableId: 1, room: 'GG', gametype: 0,
      handStartedAt: Date.now(), nicks: ['Gabibbo]'], types: [2], versions: [502] }));
    expect(shadows().slice(0, 2)).toEqual(Array(2).fill(expect.stringContaining('#ed5353')));
  });

  test('opponent double click opens four type icons, without merge or report', async () => {
    render();
    open();
    expect(report).not.toHaveBeenCalled();
    expect(document.querySelectorAll('.player-type-picker__option')).toHaveLength(4);
    expect(document.querySelectorAll('.player-type-picker__option')[3].getAttribute('aria-label')).toBe('Без типа');
    expect(document.querySelector('.player-type-picker__none .player-type-icon--none')).not.toBeNull();
    expect(document.querySelector('.player-type-picker__none').textContent).toBe('');
    expect(client.emit).toHaveBeenCalledWith('AdaptGetPlayersType', expect.objectContaining({ nicks: [playerType.nick] }));
    await receive('AdaptGetPlayersType');
    act(() => Simulate.click(document.querySelector('[aria-label="Рег"]')));
    expect(client.emit).toHaveBeenLastCalledWith('AdaptSetPlayersType', expect.objectContaining({
      tableId: 0, handNumber: 100, chair: 1, nick: playerType.nick, type: 0,
    }));
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toContain('#3989ef');
    await receive('AdaptSetPlayersType', { types: [0] });
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toContain('#3989ef');
    expect(document.querySelector('.player-type-picker')).toBeNull();
  });
  test('hero stays disabled; missing metadata opens the palette without a warning', () => {
    render({ isHero: true });
    open();
    expect(document.querySelector('.player-type-picker')).toBeNull();
    render({ playerType: undefined });
    open();
    expect(client.emit).not.toHaveBeenCalled();
    expect(document.querySelector('.player-type-picker')).not.toBeNull();
    expect(document.querySelector('[role="alert"]')).toBeNull();
    expect([...document.querySelectorAll('.player-type-picker button')].every(button => button.disabled)).toBe(true);
    expect(report).not.toHaveBeenCalled();
  });
  test('reply for previous hand does not color a replacement player', async () => {
    render();
    open();
    render({ handNumber: 101, playerType: { ...playerType, nick: 'another' } });
    await receive('AdaptGetPlayersType', { types: [2] });
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toBe('');
    expect(document.querySelector('.player-type-picker')).toBeNull();
  });
  test('failed save preserves the manually chosen color and shows a save error', async () => {
    render({ playerType: { ...playerType, type: 1 } });
    open();
    await receive('AdaptGetPlayersType', { types: [1] });
    act(() => Simulate.click(document.querySelector('[aria-label="RTA"]')));
    await receive('AdaptSetPlayersType', { ok: false, error: 'Нет ответа' });
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toContain('#ed5353');
    expect(document.querySelector('[role="alert"]').textContent).toBe('Нет ответа');
  });
  test('GET has no deadline; untyped square saves NONE with the full nickname', async () => {
    render();
    open();
    await act(async () => { jest.advanceTimersByTime(6000); });
    expect(document.querySelector('[role="alert"]')).toBeNull();
    expect(document.querySelector('[aria-label="Рег"]').disabled).toBe(false);
    act(() => Simulate.click(document.querySelector('[aria-label="Без типа"]')));
    expect(client.emit).toHaveBeenLastCalledWith('AdaptSetPlayersType', expect.objectContaining({ nick: playerType.nick, type: -1 }));
    await receive('AdaptSetPlayersType', { types: [-1] });
    expect(document.querySelector('.player-type-picker')).toBeNull();
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toBe('');
  });
  test('unsolicited callback paints nick and ignores older prompt metadata', () => {
    render();
    act(() => handlers.AdaptPlayersType({ tableId: 0, handNumber: 100, room: 'GG', gametype: 0,
      nicks: [playerType.nick], types: [1], versions: [10] }));
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toContain('#32ba69');
    render({ playerType: { ...playerType, type: 0, version: 1 } });
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toContain('#32ba69');
    render({ playerType: { ...playerType, nick: 'CompletelyDifferent' } });
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toBe('');
  });
  test('outside click closes palette without changing player type', () => {
    render();
    open();
    act(() => { document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    expect(document.querySelector('.player-type-picker')).toBeNull();
    expect(client.emit.mock.calls.every(([event]) => event === 'AdaptGetPlayersType')).toBe(true);
  });
  test('callback before prompt is retained across hands, but not across rooms', () => {
    initializePlayerTypesClient(client);
    handlers.AdaptPlayersType({ tableId: 0, handNumber: 100, room: 'GG', gametype: 0,
      nicks: [playerType.nick], types: [2], versions: [20] });
    render();
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toContain('#ed5353');
    render({ handNumber: 101 });
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toContain('#ed5353');
    render({ playerType: { ...playerType, room: 'IP' } });
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toBe('');
  });
  test('OCR variants use backend matching, and NONE clears every variant', () => {
    render({ playerType: { ...playerType, nick: 'Gabibbo1' } });
    act(() => handlers.AdaptPlayersType({ room: 'GG', gametype: 0,
      nicks: ['Gabibbo]'], types: [1], versions: [10] }));
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toContain('#32ba69');
    render({ playerType: { ...playerType, nick: 'GABIBBOI' } });
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toContain('#32ba69');
    act(() => handlers.AdaptPlayersType({ room: 'GG', gametype: 0,
      nicks: ['Gabibbo1'], types: [-1], versions: [11] }));
    render({ playerType: { ...playerType, nick: 'Gabibbo]' } });
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toBe('');
    // A late packet for another spelling cannot resurrect the old color.
    act(() => handlers.AdaptPlayersType({ room: 'GG', gametype: 0,
      nicks: ['GabibboI'], types: [2], versions: [9] }));
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toBe('');
  });
  test('same suffix is matched just as on backend; different game keeps a separate type', () => {
    render();
    act(() => handlers.AdaptPlayersType({ room: 'GG', gametype: 0,
      nicks: ['other-nickname-1234567890'], types: [0], versions: [10] }));
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toContain('#3989ef');
    render({ playerType: { ...playerType, gametype: 1 } });
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toBe('');
  });
  test('keeps shkaf full-name threshold and fallback for a long equal prefix', () => {
    render({ playerType: { ...playerType, nick: 'VeryLongIdenticalPrefix_ABCDEF' } });
    act(() => handlers.AdaptPlayersType({ room: 'GG', gametype: 0,
      nicks: ['VeryLongIdenticalPrefix_UVWXYZ'], types: [2], versions: [10] }));
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toContain('#ed5353');
  });
  test('five-minute expiry clears visible color; stale prompt and late callback cannot restore it', () => {
    render({ playerType: { ...playerType, type: 1 } });
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toContain('#32ba69');
    act(() => { jest.advanceTimersByTime(300000); });
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toBe('');
    render({ playerType: { ...playerType, type: 1, version: 20, serverNow: Date.now() } });
    act(() => handlers.AdaptPlayersType({ room: 'GG', gametype: 0,
      nicks: [playerType.nick], types: [2], versions: [21] }));
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toBe('');
  });
  test('a new hand with a similar nick in another window renews retention; unrelated nick does not', () => {
    render({ playerType: { ...playerType, nick: 'Gabibbo1', type: 1 } });
    act(() => { jest.advanceTimersByTime(240000); });
    act(() => handlers.AdaptPlayersTypeHand({ tableId: 2, handNumber: 200, room: 'GG', gametype: 0,
      handStartedAt: Date.now(), nicks: ['Gabibbo]'] }));
    act(() => { jest.advanceTimersByTime(60000); });
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toContain('#32ba69');
    act(() => handlers.AdaptPlayersTypeHand({ tableId: 3, handNumber: 300, room: 'GG', gametype: 0,
      handStartedAt: Date.now(), nicks: ['NoMatchHere'] }));
    act(() => { jest.advanceTimersByTime(240000); });
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toBe('');
  });
  test('repeated response for the same hand does not prolong retention, even with clock offset', () => {
    initializePlayerTypesClient(client);
    act(() => handlers.AdaptPlayersType({ tableId: 0, handNumber: 100, room: 'GG', gametype: 0,
      handStartedAt: 9000000, serverNow: 9000000, nicks: [playerType.nick], types: [2], versions: [10] }));
    render({ playerType: { ...playerType, handStartedAt: 9000000, serverNow: 9000000 } });
    act(() => { jest.advanceTimersByTime(240000); });
    act(() => handlers.AdaptPlayersType({ tableId: 0, handNumber: 100, room: 'GG', gametype: 0,
      handStartedAt: 9000000, serverNow: 9240000, nicks: [playerType.nick], types: [2], versions: [11] }));
    act(() => { jest.advanceTimersByTime(60000); });
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toBe('');
  });
  test('empty full GET snapshot clears an old mark without receiving NONE nicknames', () => {
    render({ playerType: { ...playerType, type: 1 } });
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toContain('#32ba69');
    act(() => handlers.AdaptPlayersType({ tableId: 0, handNumber: 100, room: 'GG', gametype: 0,
      nicks: [], types: [], versions: [], fullSnapshot: true, readVersion: 10 }));
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toBe('');
  });
  test('empty individual GET response clears the requested nick; old snapshot cannot undo SET', async () => {
    render({ playerType: { ...playerType, type: 1 } });
    open();
    await receive('AdaptGetPlayersType', { nicks: [], types: [], versions: [], readVersion: 5 });
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toBe('');
    act(() => Simulate.click(document.querySelector('[aria-label="RTA"]')));
    await receive('AdaptSetPlayersType', { types: [2], versions: [20] });
    act(() => handlers.AdaptPlayersType({ tableId: 0, handNumber: 100, room: 'GG', gametype: 0,
      nicks: [], types: [], versions: [], fullSnapshot: true, readVersion: 10 }));
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toContain('#ed5353');
  });
  test('manual type wins for five minutes across new hands and OCR variants, then fresh GET is accepted', async () => {
    render({ playerType: { ...playerType, nick: 'Gabibbo1' } });
    open();
    act(() => Simulate.click(document.querySelector('[aria-label="Фиш"]')));
    await receive('AdaptSetPlayersType', { types: [1], versions: [10] });
    act(() => { jest.advanceTimersByTime(1000); });
    render({ handNumber: 101, playerType: { ...playerType, nick: 'Gabibbo]', type: 0, version: 20,
      handStartedAt: Date.now(), serverNow: Date.now() } });
    act(() => handlers.AdaptPlayersType({ tableId: 0, handNumber: 101, room: 'GG', gametype: 0,
      handStartedAt: 1001000, nicks: [], types: [], versions: [], fullSnapshot: true, readVersion: 21 }));
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toContain('#32ba69');
    act(() => { jest.advanceTimersByTime(298999); });
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toContain('#32ba69');
    act(() => { jest.advanceTimersByTime(1); });
    // Expiry itself must not replay the stale type received during the grace period.
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toContain('#32ba69');
    act(() => handlers.AdaptPlayersType({ tableId: 0, handNumber: 101, room: 'GG', gametype: 0,
      handStartedAt: 1001000, nicks: ['Gabibbo]'], types: [0], versions: [22] }));
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toContain('#3989ef');
  });
  test('another manual selection restarts the five minutes, including NONE', async () => {
    render();
    open();
    act(() => Simulate.click(document.querySelector('[aria-label="Фиш"]')));
    await receive('AdaptSetPlayersType', { types: [1], versions: [10] });
    act(() => { jest.advanceTimersByTime(15000); });
    open();
    act(() => Simulate.click(document.querySelector('[aria-label="Без типа"]')));
    await receive('AdaptSetPlayersType', { types: [-1], versions: [11] });
    act(() => { jest.advanceTimersByTime(299999); });
    act(() => handlers.AdaptPlayersType({ tableId: 0, handNumber: 100, room: 'GG', gametype: 0,
      nicks: [playerType.nick], types: [2], versions: [20] }));
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toBe('');
    act(() => { jest.advanceTimersByTime(1); });
    act(() => handlers.AdaptPlayersType({ tableId: 0, handNumber: 100, room: 'GG', gametype: 0,
      handStartedAt: Date.now(), nicks: [playerType.nick], types: [2], versions: [21] }));
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toContain('#ed5353');
  });
  test('failed SET still protects the manually selected type against fresh GET', async () => {
    render();
    open();
    act(() => Simulate.click(document.querySelector('[aria-label="Фиш"]')));
    await receive('AdaptSetPlayersType', { ok: false, error: 'Save failed' });
    act(() => handlers.AdaptPlayersType({ tableId: 0, handNumber: 100, room: 'GG', gametype: 0,
      nicks: [playerType.nick], types: [2], versions: [20] }));
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toContain('#32ba69');
  });
  test('manual choice remains visible on an expired hand for its own five minutes', async () => {
    jest.setSystemTime(1360000);
    render({ playerType: { ...playerType, serverNow: Date.now() } });
    open();
    act(() => Simulate.click(document.querySelector('[aria-label="Фиш"]')));
    await receive('AdaptSetPlayersType', { types: [1], versions: [10] });
    expect(document.querySelector('.player-type-picker')).toBeNull();
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toContain('#32ba69');
    act(() => { jest.advanceTimersByTime(299999); });
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toContain('#32ba69');
    act(() => { jest.advanceTimersByTime(1); });
    expect(root.querySelector('.nickname').style.getPropertyValue("--player-type-accent")).toBe('');
  });
});
