import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import Table from './index';
import { PlayerTypesClientContext } from './playerTypesClient';

jest.mock('../audioReport', () => () => null);

describe('player double click and report priority', () => {
  let root, client, supportReport;
  const playerType = { room: 'GG', gametype: 0, nick: 'Opponent', type: -1,
    version: 1, handStartedAt: 1000000, serverNow: 1000000 };
  const opponent = { nickname: 'Opponent', playerType, isActive: true, isHero: false,
    enumPosition: 1, balance: 30, bet: 2, isDealer: true, timeTells: 1,
    img: 'test-image', handsCount: 20 };
  const render = (overrides = {}) => act(() => {
    ReactDOM.render(<PlayerTypesClientContext.Provider value={client}>
      <Table id={0} baraban={{}} handPrompt={{}} supportReport={supportReport}
        prompt={{ handNumber: 100, players: [
          { ...opponent, nickname: 'Hero', isHero: true }, { ...opponent, ...overrides },
        ] }}
        shkaf={{ shkafHandNumber: 100, shkafHands: {
          1: { hole1Value: 'a', hole1Suit: 's', hole2Value: 'k', hole2Suit: 'h' },
        } }} />
    </PlayerTypesClientContext.Provider>, root);
  });
  const doubleClick = node => act(() => {
    // Use bubbling DOM events so both the seat and table handlers participate.
    for (const detail of [1, 2]) {
      node.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, detail }));
      node.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, detail }));
      node.dispatchEvent(new MouseEvent('click', { bubbles: true, detail }));
    }
    node.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, detail: 2 }));
  });
  const picker = () => document.querySelector('.player-type-picker');
  const report = () => root.querySelector('.reportButtons');

  beforeEach(() => {
    jest.useFakeTimers('modern');
    jest.setSystemTime(1000000);
    root = document.createElement('div');
    document.body.appendChild(root);
    client = { on: jest.fn(), emit: jest.fn() };
    supportReport = jest.fn();
    render();
    render(); // Let the table synchronize player images and hand counts.
  });
  afterEach(() => {
    act(() => { ReactDOM.unmountComponentAtNode(root); });
    root.remove();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test.each(['', ' .nickname', ' .nickname__text', ' .balance', ' .player-type-hitbox', ' .dealer span',
    ' .amount', ' .handsCount', ' .not-hero-hand .value', ' .not-hero-hand .suit',
    ' .timeTells'])('double click anywhere on the player opens only the picker: %s', selector => {
    doubleClick(root.querySelector(`.player.player1${selector}`));
    expect(picker().querySelectorAll('button')).toHaveLength(4);
    expect(report()).toBeNull();
    expect(client.emit).toHaveBeenCalledTimes(1);
    expect(client.emit).toHaveBeenCalledWith('AdaptGetPlayersType', expect.objectContaining({
      chair: 1, nicks: ['Opponent'],
    }));
    expect(supportReport).not.toHaveBeenCalled();
  });

  test('visible report buttons disable the picker; cancelling restores player priority', () => {
    doubleClick(root.querySelector('.player.player1 .nickname'));
    expect(picker()).not.toBeNull();
    // An explicit double click outside players opens report mode and closes the picker.
    doubleClick(root.querySelector('.board'));
    expect(report()).not.toBeNull();
    expect(picker()).toBeNull();
    client.emit.mockClear();
    doubleClick(root.querySelector('.player.player1 .nickname'));
    doubleClick(root.querySelector('.player.player1 .handsCount'));
    expect(report()).not.toBeNull();
    expect(picker()).toBeNull();
    expect(client.emit).not.toHaveBeenCalled();
    act(() => root.querySelector('.reportCancel').click());
    doubleClick(root.querySelector('.player.player1 .handsCount'));
    expect(report()).toBeNull();
    expect(picker()).not.toBeNull();
  });

  test('missing metadata or client cannot accidentally open a report; recovery enables colors', () => {
    render({ playerType: undefined });
    doubleClick(root.querySelector('.player.player1 .nickname'));
    doubleClick(root.querySelector('.player.player1 .handsCount'));
    expect(picker()).not.toBeNull();
    expect(picker().querySelector('[role="alert"]')).toBeNull();
    expect(report()).toBeNull();
    const connectedClient = client;
    client = null;
    render();
    doubleClick(root.querySelector('.player.player1'));
    expect(picker()).not.toBeNull();
    expect(picker().textContent).toContain('Нет соединения');
    expect(report()).toBeNull();
    client = connectedClient;
    render();
    doubleClick(root.querySelector('.player.player1 .nickname'));
    expect(picker()).not.toBeNull();
    expect(report()).toBeNull();
  });

  test('hero clicks do not fall through to opening a report', () => {
    doubleClick(root.querySelector('.player.player0 .nickname'));
    doubleClick(root.querySelector('.player.player0 .handsCount'));
    expect(picker()).toBeNull();
    expect(report()).toBeNull();
    expect(client.emit).not.toHaveBeenCalled();
  });

  test('metadata updates preserve the seat and route its double click to the current player', () => {
    const seat = root.querySelector('.player.player1');
    render({ nickname: 'Replacement', playerType: { ...playerType, nick: 'Replacement' } });
    expect(root.querySelector('.player.player1')).toBe(seat);
    doubleClick(seat);
    expect(picker()).not.toBeNull();
    expect(report()).toBeNull();
    expect(client.emit).toHaveBeenLastCalledWith('AdaptGetPlayersType',
      expect.objectContaining({ nicks: ['Replacement'] }));
  });

  test('repeated player and palette double clicks never activate report mode', () => {
    doubleClick(root.querySelector('.player.player1 .nickname'));
    doubleClick(root.querySelector('.player.player1 .timeTells'));
    doubleClick(picker());
    expect(picker()).not.toBeNull();
    expect(report()).toBeNull();
  });

  test('report submission outside the player still works', () => {
    doubleClick(root.querySelector('.board'));
    act(() => root.querySelector('.reportNepodskaz').click());
    expect(supportReport).toHaveBeenCalledWith({ id: 0, txt: 'Проблемы с подсказкой' });
    expect(report()).toBeNull();
    expect(root.querySelector('.reportSuccess')).not.toBeNull();
  });

  test.each(['reportNepodskaz', 'reportTormoza', 'reportStratError'])(
    'player colors still work immediately after %s and after the success message expires', async buttonClass => {
      for (let cycle = 0; cycle < 3; cycle++) {
        doubleClick(root.querySelector('.board'));
        act(() => root.querySelector(`.${buttonClass}`).click());
        expect(report()).toBeNull();
        expect(root.querySelector('.reportSuccess')).not.toBeNull();
        doubleClick(root.querySelector('.player.player1 .nickname__text'));
        expect(picker()).not.toBeNull();
        expect(report()).toBeNull();
        act(() => document.querySelector('[aria-label="Рег"]').click());
        expect(client.emit).toHaveBeenLastCalledWith('AdaptSetPlayersType',
          expect.objectContaining({ nick: 'Opponent', type: 0 }));
        expect(root.querySelector('.player.player1 .nickname').style.getPropertyValue('--player-type-accent'))
          .toBe('#3989ef');
        // Let the SET timeout unlock the picker as well as expire the success message.
        await act(async () => { jest.advanceTimersByTime(6000); });
        expect(root.querySelector('.reportSuccess')).toBeNull();
        doubleClick(root.querySelector('.player.player1 .nickname__text'));
        expect(picker()).not.toBeNull();
        expect(report()).toBeNull();
      }
      expect(supportReport).toHaveBeenCalledTimes(3);
    });
});
