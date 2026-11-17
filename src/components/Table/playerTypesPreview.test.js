import React from 'react';
import ReactDOM from 'react-dom';
import { act, Simulate } from 'react-dom/test-utils';
import PlayerTypeNickname from './PlayerTypeNickname';
import { PlayerTypesClientContext, resetPlayerTypesClient } from './playerTypesClient';

// Even an old preview flag must never suppress DB writes or reads.
jest.mock('../../enum', () => ({ enumPoker: { ...jest.requireActual('../../enum').enumPoker,
  playerTypesLocalPreview: true } }));

test('every color and NONE updates immediately, sends SET and survives conflicting GET', async () => {
  jest.useFakeTimers('modern');
  const root = document.createElement('div'); document.body.appendChild(root);
  const handlers = {};
  const client = { on: (event, handler) => { handlers[event] = handler; }, emit: jest.fn() };
  const scope = { room: 'GG', gametype: 'SP', tableId: 0, handStartedAt: Date.now(), serverNow: Date.now() };
  const render = (handNumber = 10) => act(() => { ReactDOM.render(
    <PlayerTypesClientContext.Provider value={client}>
      <PlayerTypeNickname className="nickname" tableId={0} handNumber={handNumber} chair={0}
        playerType={{ ...scope, nick: 'guardbull', type: -1, version: 1 }}>Opponent</PlayerTypeNickname>
    </PlayerTypesClientContext.Provider>, root); });
  const accent = () => root.querySelector('.nickname').style.getPropertyValue('--player-type-accent');
  try {
    render();
    let count = 0;
    for (const [name, type, color] of [['Фиш', 1, '#32ba69'], ['Рег', 0, '#3989ef'],
      ['RTA', 2, '#ed5353'], ['Без типа', -1, ''], ['Без типа', -1, '']]) {
      act(() => Simulate.doubleClick(root.querySelector('.nickname')));
      const get = client.emit.mock.calls.filter(([event]) => event === 'AdaptGetPlayersType').at(-1)[1];
      act(() => Simulate.click(document.querySelector(`[aria-label="${name}"]`)));
      expect(accent()).toBe(color);
      const sets = client.emit.mock.calls.filter(([event]) => event === 'AdaptSetPlayersType');
      expect(sets).toHaveLength(++count);
      const request = sets.at(-1)[1];
      expect(request).toEqual(expect.objectContaining({ chair: 0, nick: 'guardbull', type, room: 'GG', gametype: 'SP' }));
      await act(async () => handlers.AdaptGetPlayersTypeResult({ ...scope, requestId: get.requestId,
        ok: true, nicks: ['guardbull'], types: [type === 2 ? 0 : 2], versions: [999 + count] }));
      expect(accent()).toBe(color);
      await act(async () => handlers.AdaptSetPlayersTypeResult({ ...scope, requestId: request.requestId,
        ok: true, nicks: ['guardbull'], types: [type], versions: [2000 + count] }));
      expect(document.querySelector('.player-type-picker')).toBeNull();
      render(10 + count);
      act(() => handlers.AdaptPlayersType({ ...scope, handNumber: 10 + count,
        nicks: ['guardbull'], types: [type === 2 ? 0 : 2], versions: [3000 + count] }));
      act(() => resetPlayerTypesClient(client));
      expect(accent()).toBe(color);
    }
  } finally {
    act(() => { ReactDOM.unmountComponentAtNode(root); }); root.remove();
    jest.clearAllTimers(); jest.useRealTimers();
  }
});

test('a fresh client restores GET even when the legacy preview flag is true', () => {
  jest.useFakeTimers('modern');
  const root = document.createElement('div'); document.body.appendChild(root);
  const handlers = {};
  const client = { on: (event, handler) => { handlers[event] = handler; }, emit: jest.fn() };
  const scope = { room: 'GG', gametype: 'SP', tableId: 0, handNumber: 20,
    handStartedAt: Date.now(), serverNow: Date.now() };
  try {
    act(() => { ReactDOM.render(<PlayerTypesClientContext.Provider value={client}>
      <PlayerTypeNickname className="nickname" tableId={0} handNumber={20} chair={0}
        playerType={{ ...scope, nick: 'guardbull', type: -1, version: 0 }}>Opponent</PlayerTypeNickname>
    </PlayerTypesClientContext.Provider>, root); });
    act(() => handlers.AdaptPlayersType({ ...scope, nicks: ['guardbull'], types: [1], versions: [1],
      fullSnapshot: true, readVersion: 1 }));
    expect(root.querySelector('.nickname').style.getPropertyValue('--player-type-accent')).toBe('#32ba69');
    expect(client.emit).not.toHaveBeenCalled();
  } finally {
    act(() => { ReactDOM.unmountComponentAtNode(root); }); root.remove();
    jest.clearAllTimers(); jest.useRealTimers();
  }
});
