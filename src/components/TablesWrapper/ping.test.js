import React from 'react';
import ReactDOM from 'react-dom';
import TablesWrapper from './index';
import Table from '../Table';
import { connectWithReconnect, MSG } from '../../sharedWS';
import { SLOW_PING_LOG_KEY } from './slowPingLog';

jest.mock('../../sharedWS', () => ({
  connectWithReconnect: jest.fn(),
  MSG: { OPEN: '__open' },
}));
jest.mock('../Table', () => () => null);
jest.mock('../Report', () => () => null);

describe('prompter connection health', () => {
  let wrapper;
  let clients;

  const latestPing = (client) => client.emit.mock.calls
    .filter(([event]) => event === 'prompterPing').slice(-1)[0][1];

  beforeEach(() => {
    jest.useFakeTimers('modern');
    jest.setSystemTime(100000);
    localStorage.clear();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    document.body.innerHTML = '<div id="connection-settings"></div>';
    clients = [];
    connectWithReconnect.mockImplementation(() => {
      const handlers = {};
      const client = {
        on: (event, handler) => { handlers[event] = handler; },
        emit: jest.fn(),
        disconnect: jest.fn(),
        receive: (event, data) => handlers[event](data),
      };
      clients.push(client);
      return { client };
    });
    wrapper = new TablesWrapper();
    wrapper.setState = (patch, callback) => {
      Object.assign(wrapper.state, typeof patch === 'function' ? patch(wrapper.state) : patch);
      if (callback) callback();
    };
    wrapper.state.server1 = 'ws://localhost:27992';
    wrapper.startListener();
  });

  afterEach(() => {
    wrapper.componentWillUnmount();
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('sends from the authorized prompter every two seconds', () => {
    const client = clients[0];
    jest.advanceTimersByTime(2000);
    expect(client.emit).not.toHaveBeenCalled();
    client.receive(MSG.OPEN);
    expect(client.emit).toHaveBeenCalledWith('authorization', expect.objectContaining({ isPrompter: true }));
    client.receive('authorizationSuccess');
    const firstPing = latestPing(client);
    jest.advanceTimersByTime(2000);
    expect(latestPing(client) - firstPing).toBe(2000);
  });

  test('fades after eight seconds without replies and recovers on the first fast reply', () => {
    const client = clients[0];
    client.receive('authorizationSuccess');
    const lostPing = latestPing(client);
    client.receive('prompterPong', lostPing);
    jest.advanceTimersByTime(8000);
    expect(wrapper.state.isPingStale).toBe(false);
    jest.advanceTimersByTime(250);
    expect(wrapper.state.isPingStale).toBe(true);
    client.receive('prompterPong', lostPing);
    expect(wrapper.state.isPingStale).toBe(true);
    client.receive('prompterPong', latestPing(client));
    expect(wrapper.state.isPingStale).toBe(false);
  });

  test.each([7999, 8000, 8001])('accepts a reply only when its round trip is below 8s (%i ms)', (delay) => {
    const client = clients[0];
    client.receive('authorizationSuccess');
    client.receive('prompterPong', latestPing(client));
    jest.advanceTimersByTime(2000);
    const sentAt = latestPing(client);
    wrapper.state.isPingStale = true;
    // Do not run the cleanup timer: exercise the reply handler's own deadline check.
    jest.setSystemTime(sentAt + delay);
    client.receive('prompterPong', sentAt);
    expect(wrapper.state.isPingStale).toBe(delay >= 8000);
  });

  test('disconnected status stops pings and restores opacity; reconnect starts a new 8s window', () => {
    const client = clients[0];
    client.receive('authorizationSuccess');
    const oldPing = latestPing(client);
    client.receive('prompterPong', oldPing);
    jest.advanceTimersByTime(8250);
    expect(wrapper.state.isPingStale).toBe(true);
    client.receive('disconnect');
    expect(wrapper.state.isConnected).toBe(false);
    expect(wrapper.state.isPingStale).toBe(false);
    client.emit.mockClear();
    jest.advanceTimersByTime(8250);
    expect(wrapper.state.isPingStale).toBe(false);
    expect(client.emit).not.toHaveBeenCalled();
    client.receive(MSG.OPEN);
    client.receive('authorizationSuccess');
    expect(wrapper.state.isPingStale).toBe(false);
    jest.advanceTimersByTime(8250);
    expect(wrapper.state.isPingStale).toBe(false);
    client.receive('prompterPong', oldPing);
    expect(wrapper.state.isPingStale).toBe(false);
    expect(wrapper.pingSupported).toBe(false);
    client.receive('prompterPong', latestPing(client));
    expect(wrapper.state.isPingStale).toBe(false);
    expect(wrapper.pingSupported).toBe(true);
    jest.advanceTimersByTime(8250);
    expect(wrapper.state.isPingStale).toBe(true);
  });

  test('ignores replies from a replaced connection and stops pinging on unmount', () => {
    const oldClient = clients[0];
    oldClient.receive('authorizationSuccess');
    oldClient.receive('prompterPong', latestPing(oldClient));
    jest.advanceTimersByTime(8250);
    wrapper.startListener();
    const client = clients[1];
    client.receive('authorizationSuccess');
    jest.advanceTimersByTime(8250);
    oldClient.receive('prompterPong', latestPing(client));
    expect(wrapper.state.isPingStale).toBe(false);
    expect(wrapper.pingSupported).toBe(false);
    client.receive('prompterPong', latestPing(client));
    expect(wrapper.state.isPingStale).toBe(false);
    wrapper.componentWillUnmount();
    client.emit.mockClear();
    jest.advanceTimersByTime(10000);
    expect(client.emit).not.toHaveBeenCalled();
  });

  test('manual disconnect cancels even a connection still awaiting authorization', () => {
    const client = clients[0];
    wrapper.disconnectHandler();
    expect(client.disconnect).toHaveBeenCalled();
    expect(wrapper.pingClient).toBe(null);
    client.receive('authorizationSuccess');
    jest.advanceTimersByTime(10000);
    expect(client.emit).not.toHaveBeenCalled();
    expect(wrapper.state.isConnected).toBe(false);
    expect(wrapper.state.isPingStale).toBe(false);
    wrapper.handleOnline();
    expect(clients).toHaveLength(1);
  });

  test('offline status resets opacity and online reconnects an interrupted session', () => {
    clients[0].receive('authorizationSuccess');
    clients[0].receive('prompterPong', latestPing(clients[0]));
    jest.advanceTimersByTime(8250);
    wrapper.markDisconnected();
    clients[0].emit.mockClear();
    jest.advanceTimersByTime(10000);
    expect(wrapper.state.isPingStale).toBe(false);
    expect(clients[0].emit).not.toHaveBeenCalled();
    wrapper.handleOnline();
    expect(clients).toHaveLength(2);
  });

  test('a legacy backend without ping replies never enables fading', () => {
    const client = clients[0];
    client.receive('authorizationSuccess');
    wrapper.state.table0 = { handNumber: 'legacy-hand' };
    jest.advanceTimersByTime(30000);
    expect(wrapper.state.table0).toEqual({ handNumber: 'legacy-hand' });
    expect(wrapper.state.isPingStale).toBe(false);
    expect(wrapper.pingSupported).toBe(false);
    expect(client.emit.mock.calls.filter(([event]) => event === 'prompterPing').length).toBeGreaterThan(1);
    client.receive('prompterPong', -1); // Unsolicited replies do not prove support.
    expect(wrapper.pingSupported).toBe(false);
    jest.advanceTimersByTime(90000);
    expect(wrapper.state.isPingStale).toBe(false);
  });

  test('the first late reply enables support but only a fast reply restores opacity', () => {
    const client = clients[0];
    client.receive('authorizationSuccess');
    const firstPing = latestPing(client);
    jest.advanceTimersByTime(20000);
    expect(wrapper.state.isPingStale).toBe(false);
    client.receive('prompterPong', firstPing);
    expect(wrapper.pingSupported).toBe(true);
    expect(wrapper.state.isPingStale).toBe(true);
    client.receive('prompterPong', latestPing(client));
    expect(wrapper.state.isPingStale).toBe(false);
  });

  test('switching from a new backend to a legacy backend resets ping support', () => {
    const firstClient = clients[0];
    firstClient.receive('authorizationSuccess');
    firstClient.receive('prompterPong', latestPing(firstClient));
    jest.advanceTimersByTime(8250);
    expect(wrapper.state.isPingStale).toBe(true);
    wrapper.state.server1 = 'ws://legacy-server:27992';
    wrapper.startListener();
    clients[1].receive('authorizationSuccess');
    jest.advanceTimersByTime(30000);
    expect(wrapper.pingSupported).toBe(false);
    expect(wrapper.state.isPingStale).toBe(false);
  });

  test.each([5000, 5001, 8000, 20000])('logs only replies over 5s, including expired health pings (%i ms)', (delay) => {
    const client = clients[0];
    client.receive('authorizationSuccess');
    const sentAt = latestPing(client);
    wrapper.state.server1 = 'ws://edited-input:12345';
    jest.advanceTimersByTime(delay);
    client.receive('prompterPong', sentAt);
    client.receive('prompterPong', sentAt); // Duplicate replies must not duplicate log records.
    const entries = JSON.parse(localStorage.getItem(SLOW_PING_LOG_KEY) || '[]');
    expect(entries).toEqual(delay > 5000 ? [{
      time: sentAt + delay, server: 'ws://localhost:27992', pingMs: delay,
    }] : []);
    if (delay > 8000) expect(wrapper.state.isPingStale).toBe(true);
  });

  test('the small download button exports the recorded log', () => {
    wrapper.slowPingLog.record('ws://localhost:27992', 8000);
    wrapper.download = jest.fn();
    const findButton = (element) => {
      if (!React.isValidElement(element)) return null;
      if (element.props.className === 'download-ping-logs') return element;
      return React.Children.toArray(element.props.children).map(findButton).find(Boolean);
    };
    const button = findButton(wrapper.render());
    expect(button.props.children).toBe('download logs');
    button.props.onClick();
    expect(wrapper.download).toHaveBeenCalledWith('prompter-ping-log.txt',
      expect.stringContaining('ws://localhost:27992 | пинг 8с'));
  });

  test('ordinary mode still clears all slots after exactly one minute without hand prompts', () => {
    expect(wrapper.state.debugKeepPrompts).toBe(false);
    wrapper.state.table0 = { handNumber: 'old' };
    wrapper.state.table8 = { handNumber: 'other' };
    wrapper.state.handEV0 = { strategy: 'old' };
    wrapper.state.shkaf_table0 = { cards: 'old' };
    jest.advanceTimersByTime(59750);
    expect(wrapper.state.table0.handNumber).toBe('old');
    jest.advanceTimersByTime(250);
    expect(wrapper.state.table0).toEqual({});
    expect(wrapper.state.table8).toEqual({});
    expect(wrapper.state.handEV0).toEqual({});
    expect(wrapper.state.shkaf_table0).toEqual({});
    expect(wrapper.state.hand0.turnOffButtons).toBe(true);
  });

  test('debug mode preserves idle slots and normal opacity while pings and slow-reply logs continue', () => {
    const client = clients[0];
    client.receive('authorizationSuccess');
    client.receive('prompterPong', latestPing(client));
    wrapper.state.table0 = { handNumber: 'paused' };
    wrapper.state.hand0 = { strategy: 'keep', turnOffButtons: false };
    jest.advanceTimersByTime(8250);
    expect(wrapper.state.isPingStale).toBe(true);
    wrapper.setDebugKeepPrompts(true);
    expect(wrapper.state.isPingStale).toBe(false);
    const delayedPing = latestPing(client);
    jest.advanceTimersByTime(120000);
    client.receive('prompterPong', delayedPing);
    expect(wrapper.state.isPingStale).toBe(false);
    expect(wrapper.state.table0).toEqual({ handNumber: 'paused' });
    expect(wrapper.state.hand0).toEqual({ strategy: 'keep', turnOffButtons: false });
    expect(wrapper.promptsClearedForIdle).toBe(false);
    expect(latestPing(client)).toBeGreaterThan(delayedPing);
    expect(JSON.parse(localStorage.getItem(SLOW_PING_LOG_KEY))).toEqual([
      expect.objectContaining({ pingMs: expect.any(Number), server: 'ws://localhost:27992' }),
    ]);
    wrapper.setDebugKeepPrompts(false);
    expect(wrapper.state.isPingStale).toBe(true);
    expect(wrapper.state.table0).toEqual({});
    expect(wrapper.state.hand0.turnOffButtons).toBe(true);
  });

  test('debug mode accepts new prompts and explicit server clears, including the debugger reset', () => {
    const client = clients[0];
    // Exercise the real wire decoder with the application's existing key.
    const source = require('fs').readFileSync(require.resolve('./index'), 'utf8');
    const key = Buffer.from(source.match(/let k = '([^']+)'/)[1], 'ascii');
    const receive = (event, data) => {
      const bytes = Buffer.from(JSON.stringify(data));
      client.receive(event, Buffer.from(bytes.map((byte, i) => byte ^ key[i % key.length])).toString('base64'));
    };
    wrapper.setDebugKeepPrompts(true);
    jest.advanceTimersByTime(70000);
    receive('localhost', { id: 0, prompt: { handNumber: 'new' } });
    receive('socket', { id: 0, hand_prompt: { strategy: 'new', turnOffButtons: false } });
    expect(wrapper.state.table0).toEqual({ handNumber: 'new' });
    expect(wrapper.state.hand0.strategy).toBe('new');
    wrapper.setDebugKeepPrompts(false);
    expect(wrapper.state.table0.handNumber).toBe('new');
    wrapper.setDebugKeepPrompts(true);
    receive('localhost', { id: 0, prompt: {} });
    receive('socket', { id: 0, hand_prompt: { turnOffButtons: true } });
    expect(wrapper.state.table0).toEqual({});
    expect(wrapper.state.hand0.turnOffButtons).toBe(true);
    expect(wrapper.state.hand0.strategy).toBeUndefined();
  });

  test('quiet debug toggle persists both enabled and disabled choices across new instances', () => {
    const find = (element, className) => {
      if (!React.isValidElement(element)) return null;
      if (element.props.className === className) return element;
      return React.Children.toArray(element.props.children).map(child => find(child, className)).find(Boolean);
    };
    const control = find(wrapper.render(), 'debug-keep-prompts-control');
    expect(control.props['aria-checked']).toBe(false);
    expect(React.Children.toArray(control.props.children).some(child => child.props.children === 'debug')).toBe(true);
    const container = document.createElement('div');
    document.body.appendChild(container);
    const click = detail => {
      ReactDOM.render(find(wrapper.render(), 'debug-keep-prompts-control'), container);
      container.querySelector('button').dispatchEvent(new MouseEvent('click', { bubbles: true, detail }));
    };
    // Native button + drawn checkbox avoids a label's extra forwarded click.
    click(0); // Keyboard activation must not enable debug.
    click(1);
    click(2);
    expect(wrapper.state.debugKeepPrompts).toBe(false);
    expect(localStorage.getItem('debugKeepPrompts')).toBeNull();
    click(3);
    click(4); // Additional clicks in the same sequence must not undo activation.
    const enabledControl = find(wrapper.render(), 'debug-keep-prompts-control');
    expect(enabledControl.props['aria-checked']).toBe(true);
    expect(localStorage.getItem('debugKeepPrompts')).toBe('true');
    expect(new TablesWrapper().state.debugKeepPrompts).toBe(true);
    click(1);
    expect(localStorage.getItem('debugKeepPrompts')).toBe('false');
    expect(new TablesWrapper().state.debugKeepPrompts).toBe(false);
    click(2);
    click(3); // A sequence that began by disabling must not immediately re-enable.
    expect(wrapper.state.debugKeepPrompts).toBe(false);
    ReactDOM.unmountComponentAtNode(container);
    container.remove();
  });

  test('invalid saved values leave normal mode enabled and unavailable storage does not break the toggle', () => {
    localStorage.setItem('debugKeepPrompts', 'invalid');
    expect(new TablesWrapper().state.debugKeepPrompts).toBe(false);
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw Error('storage disabled'); });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('storage disabled'); });
    expect(new TablesWrapper().state.debugKeepPrompts).toBe(false);
    wrapper.setDebugKeepPrompts(true);
    expect(wrapper.state.debugKeepPrompts).toBe(true);
  });

  test('shares the health state with every table in every layout', () => {
    const collectTables = (element) => {
      if (!React.isValidElement(element)) return [];
      if (element.type === Table) return [element];
      return React.Children.toArray(element.props.children).flatMap(collectTables);
    };
    for (const tableCount of ['15', '12', '9', '6', '4']) {
      wrapper.state.tableCount = tableCount;
      for (const isPingStale of [true, false]) {
        wrapper.state.isPingStale = isPingStale;
        const tables = collectTables(wrapper.render());
        expect(tables.length).toBe(Number(tableCount));
        tables.forEach((table) => expect(table.props.isPingStale).toBe(isPingStale));
      }
    }
  });
});
