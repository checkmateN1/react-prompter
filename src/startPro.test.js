import TablesWrapper from './components/TablesWrapper';
import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { serverFromLocation, validServer } from './startPro';

jest.mock('./components/Table', () => () => null);
jest.mock('./components/Report', () => () => null);

describe('StartPro connection bridge', () => {
  let wrapper;
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    window.history.replaceState(null, '', '/');
    wrapper = new TablesWrapper();
    wrapper.setState = (patch, callback) => {
      Object.assign(wrapper.state, typeof patch === 'function' ? patch(wrapper.state) : patch);
      if (callback) callback();
    };
    wrapper.startListener = jest.fn();
  });
  afterEach(() => {
    wrapper.componentWillUnmount();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('URL server overrides the saved selection before connecting', () => {
    localStorage.setItem('server1', 'ws://old.invalid:123');
    window.history.replaceState(null, '', '/?server=wss%3A%2F%2Fnew.invalid%3A456%2Fsocket%3Froom%3D1');
    wrapper.componentDidMount();
    expect(wrapper.state.server1).toBe('wss://new.invalid:456/socket?room=1');
    expect(window.startProConnect).toBe(wrapper.applyStartProConnection);
    expect(window.startProProtocol).toBe(1);
    expect(wrapper.startListener).not.toHaveBeenCalled();
  });

  test('repeated launch disconnects the old client and uses the latest server/token', () => {
    const oldClient = { disconnect: jest.fn() };
    wrapper.pingClient = oldClient;
    wrapper.state.isConnected = true;
    expect(wrapper.applyStartProConnection({ server: 'ws://next.invalid:456', token: 'test-secret' })).toBe(true);
    expect(oldClient.disconnect).toHaveBeenCalledTimes(1);
    expect(wrapper.state.server1).toBe('ws://next.invalid:456');
    expect(wrapper.state.token).toBe('test-secret');
    expect(wrapper.state.isConnected).toBe(false);
    expect(wrapper.startListener).toHaveBeenCalledTimes(1);
    expect(serverFromLocation()).toBe('ws://next.invalid:456');
    expect(window.location.href).not.toContain('test-secret');
  });

  test('bad server cannot disconnect the active client', () => {
    const client = { disconnect: jest.fn() };
    wrapper.pingClient = client;
    for (const server of ['https://host', 'javascript:alert(1)', '', 'ws://host/#fragment']) {
      expect(validServer(server)).toBe(false);
      expect(wrapper.applyStartProConnection({ server, token: 'x' })).toBe(false);
    }
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  test('empty token updates server without attempting unauthorized connection', () => {
    expect(wrapper.applyStartProConnection({ server: 'ws://next.invalid:456', token: '' })).toBe(true);
    expect(wrapper.state.server1).toBe('ws://next.invalid:456');
    expect(wrapper.startListener).not.toHaveBeenCalled();
  });

  test('invalid URL server falls back to saved server and bridge is removed on unmount', () => {
    localStorage.setItem('server1', 'ws://saved.invalid:123');
    window.history.replaceState(null, '', '/?server=https://bad.invalid');
    wrapper.componentDidMount();
    expect(wrapper.state.server1).toBe('ws://saved.invalid:123');
    wrapper.componentWillUnmount();
    expect(window.startProConnect).toBeUndefined();
  });

  test('managed launch ignores a stale saved token and waits for StartPro', () => {
    window.history.replaceState(null, '', '/?startpro=1&server=ws://new.invalid:123');
    localStorage.setItem('token', 'stale-browser-token');
    const container = document.createElement('div');
    document.body.appendChild(container);
    let mounted;
    act(() => { mounted = ReactDOM.render(<TablesWrapper />, container); });
    mounted.startListener = jest.fn();
    try {
      expect(mounted.state.token).toBe('');
      const input = container.querySelector('input[placeholder="token"]');
      expect(input.disabled).toBe(true);
      expect(input.value).toBe('');
      act(() => { mounted.applyStartProConnection({ server: 'ws://new.invalid:123', token: 'token-from-config' }); });
      expect(input.value).toBe('token-from-config');
      expect(input.type).toBe('password');
      expect(container.querySelector('input[placeholder="main server"]').value).toBe('ws://new.invalid:123');
      expect(mounted.startListener).toHaveBeenCalledTimes(1);
      mounted.tokenHandler({ target: { value: 'mistyped-token' } });
      mounted.srv1Handler({ target: { value: 'ws://wrong.invalid:123' } });
      expect(mounted.state.token).toBe('token-from-config');
      expect(mounted.state.server1).toBe('ws://new.invalid:123');
    } finally {
      act(() => { ReactDOM.unmountComponentAtNode(container); });
      container.remove();
    }
  });

  test('empty config token never falls back to the browser token', () => {
    localStorage.setItem('token', 'old-token');
    wrapper.state.token = 'old-token';
    wrapper.applyStartProConnection({ server: 'ws://new.invalid:123', token: '' });
    expect(wrapper.state.token).toBe('');
    expect(wrapper.state.managedByStartPro).toBe(true);
    expect(wrapper.startListener).not.toHaveBeenCalled();
  });

  test('standalone opening still allows manual token editing', () => {
    localStorage.setItem('token', 'standalone-token');
    wrapper.componentDidMount();
    expect(wrapper.state.token).toBe('standalone-token');
    wrapper.tokenHandler({ target: { value: 'edited-manually' } });
    expect(wrapper.state.token).toBe('edited-manually');
  });
});
