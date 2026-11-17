import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import TablesWrapper from './components/TablesWrapper';
import { calculateScales, createScaleCache, fitEnvironment, gridSize, SCALE_CACHE_KEY, TABLE_GRIDS } from './prompterLayout';

jest.mock('./components/Table', () => props => <div data-table-id={props.id} />);
jest.mock('./components/Report', () => () => null);

const environment = (width = 1600, height = 900) => ({ width, height, dpi: 1, screen: [1920, 1080, 1920, 1040, 0, 0], display: 'monitor-a' });

describe('precomputed layout scales', () => {
  test.each([[900, 800], [1600, 500], [1366, 728], [1920, 1080], [3200, 1800]])('every grid fits %ix%i before any tables exist', (width, height) => {
    const scales = calculateScales(environment(width, height));
    expect(Object.keys(scales)).toEqual(['4', '6', '9', '12', '15']);
    for (const count of Object.keys(TABLE_GRIDS)) {
      const size = gridSize(count);
      expect(scales[count]).toBeGreaterThan(0);
      expect(scales[count]).toBeLessThanOrEqual(1);
      expect(size.width * scales[count]).toBeLessThanOrEqual(width + .000001);
      expect(size.height * scales[count]).toBeLessThanOrEqual(height + .000001);
    }
  });

  test('cache hits avoid storage access and a restarted page validates the saved map', () => {
    const storage = { getItem: jest.fn(), setItem: jest.fn() };
    const get = createScaleCache(() => storage);
    const first = get(environment());
    expect(get(environment())).toBe(first);
    expect(storage.getItem).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    storage.getItem.mockReturnValue(storage.setItem.mock.calls[0][1]);
    const restarted = createScaleCache(() => storage);
    expect(restarted(environment())).toEqual(first);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });

  test.each([
    { width: 900 }, { height: 500 }, { dpi: 2 }, { display: 'monitor-b' }, { screen: [2560, 1440, 2560, 1400, 1920, 0] },
  ])('changed viewport or display invalidates the cached map: %j', change => {
    const storage = { getItem: jest.fn(), setItem: jest.fn() };
    const get = createScaleCache(() => storage);
    const first = get(environment());
    const next = { ...environment(), ...change };
    expect(get(next)).not.toBe(first);
    expect(get(next)).toEqual(calculateScales(next));
    expect(storage.setItem).toHaveBeenCalledTimes(2);
  });

  test('wrong or unreadable persisted scales cannot oversize the initial grid', () => {
    let saved;
    const storage = { getItem: () => saved, setItem: (_, value) => { saved = value; } };
    const expected = createScaleCache(() => storage)(environment(900, 500));
    const corrupt = JSON.parse(saved);
    corrupt.scales[15] = 1;
    saved = JSON.stringify(corrupt);
    expect(createScaleCache(() => storage)(environment(900, 500))).toEqual(expected);
    saved = '{broken';
    expect(createScaleCache(() => storage)(environment(900, 500))).toEqual(expected);
    expect(createScaleCache(() => { throw new Error('storage unavailable'); })(environment(900, 500))).toEqual(expected);
    expect(calculateScales(environment(0, 0))).toBeNull();
  });
});

describe('grid and scale change in the same render', () => {
  let container, mounted, frame, originalWidth, originalHeight;
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    window.history.replaceState(null, '', '/?startpro=1&display=monitor-a');
    originalWidth = window.innerWidth;
    originalHeight = window.innerHeight;
    window.innerWidth = 1600;
    window.innerHeight = 500;
    frame = jest.spyOn(window, 'requestAnimationFrame');
    container = document.createElement('div');
    document.body.appendChild(container);
    act(() => { mounted = ReactDOM.render(<TablesWrapper />, container); });
  });
  afterEach(() => {
    act(() => ReactDOM.unmountComponentAtNode(container));
    container.remove();
    window.innerWidth = originalWidth;
    window.innerHeight = originalHeight;
    frame.mockRestore();
    jest.clearAllTimers();
    jest.useRealTimers();
  });
  function assertGrid(count) {
    expect(container.querySelectorAll('[data-table-id]')).toHaveLength(count);
    expect(Number(container.querySelector('.startpro-layout').style.zoom)).toBe(calculateScales(fitEnvironment())[count]);
  }
  test('initial mount and 12→9→15→4→6→12 are correct without running a frame/timer', () => {
    assertGrid(12);
    for (const count of [9, 15, 4, 6, 12]) {
      act(() => mounted.setState({ tableCount: String(count) })); // Same state transition used by server events.
      assertGrid(count);
    }
    expect(frame).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(SCALE_CACHE_KEY)).scales).toEqual(calculateScales(fitEnvironment()));
  });
  test('resize and new StartPro display fingerprint refresh all scales immediately', () => {
    act(() => { window.innerHeight = 400; window.dispatchEvent(new Event('resize')); });
    assertGrid(12);
    const before = JSON.parse(localStorage.getItem(SCALE_CACHE_KEY)).key;
    act(() => mounted.applyStartProConnection({ server: 'ws://localhost:1', token: '', displaySignature: 'monitor-b' }));
    assertGrid(12);
    expect(JSON.parse(localStorage.getItem(SCALE_CACHE_KEY)).key).not.toBe(before);
    expect(frame).not.toHaveBeenCalled();
  });
});
