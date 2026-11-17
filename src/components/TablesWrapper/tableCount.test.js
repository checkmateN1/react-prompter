import React from 'react';
import TablesWrapper from './index';
import Table from '../Table';
import { connectWithReconnect } from '../../sharedWS';

jest.mock('../../sharedWS', () => ({ connectWithReconnect: jest.fn(), MSG: { OPEN: '__open' } }));
jest.mock('../Table', () => () => null);
jest.mock('../Report', () => () => null);

describe('table count from backend', () => {
  let wrapper, clients;
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    clients = [];
    connectWithReconnect.mockImplementation(() => {
      const handlers = {};
      const client = { on: (name, handler) => { handlers[name] = handler; },
        emit: jest.fn(), disconnect: jest.fn(), receive: (name, data) => handlers[name](data) };
      clients.push(client);
      return { client };
    });
    wrapper = new TablesWrapper();
    wrapper.setState = (patch, callback) => {
      Object.assign(wrapper.state, typeof patch === 'function' ? patch(wrapper.state) : patch);
      if (callback) callback();
    };
    wrapper.startListener();
    clients[0].receive('authorizationSuccess');
  });
  afterEach(() => {
    wrapper.componentWillUnmount();
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });
  const elements = element => !React.isValidElement(element) ? [] :
    [element, ...React.Children.toArray(element.props.children).flatMap(elements)];

  test('9 → 12 → 15 updates rendered grid, radio selection and persisted count', () => {
    for (const tableCount of [9, 12, 15, 9]) {
      clients[0].receive('tableCount', { tableCount });
      const rendered = elements(wrapper.render());
      expect(rendered.filter(e => e.type === Table)).toHaveLength(tableCount);
      expect(rendered.find(e => e.props.id === `t${tableCount}`).props.checked).toBe(true);
      expect(localStorage.getItem('tableCount')).toBe(String(tableCount));
    }
  });
  test('accepts only choices present in interface; invalid commands preserve selection', () => {
    for (const tableCount of [4, '6', 9, '12', 15]) {
      clients[0].receive('tableCount', { tableCount });
      expect(wrapper.state.tableCount).toBe(String(tableCount));
    }
    for (const data of [null, {}, { tableCount: 10 }, { tableCount: '09' }, { tableCount: [9] }, { tableCount: true }]) {
      clients[0].receive('tableCount', data);
      expect(wrapper.state.tableCount).toBe('15');
    }
  });
  test('old or disconnected sockets cannot change the grid; new connection resumes updates', () => {
    const old = clients[0];
    wrapper.startListener();
    old.receive('tableCount', { tableCount: 9 });
    clients[1].receive('tableCount', { tableCount: 9 });
    expect(wrapper.state.tableCount).toBe('12');
    clients[1].receive('authorizationSuccess');
    clients[1].receive('tableCount', { tableCount: 15 });
    expect(wrapper.state.tableCount).toBe('15');
    clients[1].receive('disconnect');
    clients[1].receive('tableCount', { tableCount: 9 });
    expect(wrapper.state.tableCount).toBe('15');
  });
  test('updates grid even if browser storage is unavailable', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('blocked'); });
    clients[0].receive('tableCount', { tableCount: 9 });
    expect(wrapper.state.tableCount).toBe('9');
  });
});
